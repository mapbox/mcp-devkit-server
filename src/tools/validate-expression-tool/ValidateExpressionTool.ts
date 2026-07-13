// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
import { expression as expressionSpec } from '@mapbox/mapbox-gl-style-spec';
import type { StylePropertySpecification } from '@mapbox/mapbox-gl-style-spec';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ValidateExpressionInputSchema } from './ValidateExpressionTool.input.schema.js';
import {
  ValidateExpressionOutputSchema,
  type ValidateExpressionOutput,
  type ExpressionIssue
} from './ValidateExpressionTool.output.schema.js';

// Interpolate's interpolation-type argument (e.g. ["linear"], ["exponential", 1.5])
// is a type descriptor, not a nested expression - it must be skipped when walking
// the tree for operator-name checks, or it gets misidentified as an unknown operator.
const INTERPOLATION_TYPE_ARG_INDEX: Record<string, number> = {
  interpolate: 0,
  'interpolate-hcl': 0,
  'interpolate-lab': 0
};

// `StylePropertySpecification` only covers concrete typed properties (color, string,
// number, ...), so a literal like `true` or `"red"` would fail type-checking against
// any of them. Using an unrecognized `type` makes createPropertyExpression skip return
// type checking entirely while still enforcing zoom/interpolation placement rules -
// which is what a property-agnostic expression validator needs. Cast is unavoidable
// since the union has no generic/"any" variant.
const GENERIC_PROPERTY_SPEC = {
  type: 'value',
  expression: {
    interpolated: true,
    parameters: ['zoom', 'feature', 'feature-state']
  },
  'property-type': 'data-driven'
} as unknown as StylePropertySpecification;

/**
 * ValidateExpressionTool - Validates Mapbox style expressions
 *
 * Delegates correctness checks (operator names, argument counts/types, and
 * zoom-expression placement) to the official `@mapbox/mapbox-gl-style-spec`
 * package, the same validation logic mapbox-gl-js uses at runtime.
 */
export class ValidateExpressionTool extends BaseTool<
  typeof ValidateExpressionInputSchema,
  typeof ValidateExpressionOutputSchema
> {
  readonly name = 'validate_expression_tool';
  readonly description =
    'Validates Mapbox style expressions for syntax, operators, and argument correctness';
  readonly annotations = {
    title: 'Validate Expression Tool',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };

  constructor() {
    super({
      inputSchema: ValidateExpressionInputSchema,
      outputSchema: ValidateExpressionOutputSchema
    });
  }

  protected async execute(
    input: z.infer<typeof ValidateExpressionInputSchema>
  ): Promise<CallToolResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- expression shape is validated below, not known upfront
      let expression: any;
      if (typeof input.expression === 'string') {
        try {
          expression = JSON.parse(input.expression);
        } catch (parseError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error parsing expression: ${(parseError as Error).message}`
              }
            ],
            isError: true
          };
        }
      } else {
        expression = input.expression;
      }

      const errors: ExpressionIssue[] = [];
      const warnings: ExpressionIssue[] = [];
      const info: ExpressionIssue[] = [];

      const { expressionType, depth, blocking } = this.walkStructure(
        expression,
        errors,
        warnings,
        ''
      );

      // Only delegate to the real parser when the top-level shape is sound;
      // structural errors above (empty array, unknown operator, ...) already
      // explain the problem and would otherwise be duplicated or obscured by
      // the library's own (differently-worded) diagnostics.
      let returnType: string | undefined;
      if (!blocking) {
        const result = expressionSpec.createPropertyExpression(
          expression,
          GENERIC_PROPERTY_SPEC
        );
        if (result.result === 'error') {
          for (const err of result.value) {
            errors.push({
              severity: 'error',
              message: err.message,
              path: err.key || undefined
            });
          }
        } else {
          // Re-parse via createExpression (which createPropertyExpression already
          // succeeded through) purely to read the inferred return type - its result
          // type (StyleExpression) is public, unlike createPropertyExpression's.
          const parsed = expressionSpec.createExpression(
            expression,
            GENERIC_PROPERTY_SPEC
          );
          if (parsed.result === 'success') {
            const kind = parsed.value.expression.type.kind;
            returnType = kind === 'value' ? 'any' : kind;
          }
        }
      }

      const result: ValidateExpressionOutput = {
        valid: errors.length === 0,
        errors,
        warnings,
        info,
        metadata: { expressionType, returnType, depth }
      };

      const validatedResult = ValidateExpressionOutputSchema.parse(result);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validatedResult, null, 2)
          }
        ],
        structuredContent: validatedResult,
        isError: false
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log('error', `${this.name}: ${errorMessage}`);

      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true
      };
    }
  }

  /**
   * Walks the raw expression tree to check structural validity (is this an
   * array with a recognized operator?) and compute display metadata
   * (expressionType, depth). Argument counts, types, and zoom-placement
   * rules are left to `createPropertyExpression`.
   */
  private walkStructure(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw, unvalidated JSON expression tree
    expression: any,
    errors: ExpressionIssue[],
    warnings: ExpressionIssue[],
    path: string,
    depth = 0
  ): { expressionType?: string; depth: number; blocking: boolean } {
    if (
      typeof expression === 'string' ||
      typeof expression === 'number' ||
      typeof expression === 'boolean' ||
      expression === null
    ) {
      return { expressionType: 'literal', depth, blocking: false };
    }

    if (!Array.isArray(expression)) {
      if (typeof expression === 'object') {
        return { expressionType: 'literal-object', depth, blocking: false };
      }
      errors.push({
        severity: 'error',
        message: 'Expression must be an array or literal value',
        path: path || 'root'
      });
      return { depth, blocking: true };
    }

    if (expression.length === 0) {
      errors.push({
        severity: 'error',
        message: 'Expression array cannot be empty',
        path: path || 'root'
      });
      return { depth, blocking: true };
    }

    const operator = expression[0];

    if (typeof operator !== 'string') {
      errors.push({
        severity: 'error',
        message: 'Expression operator must be a string',
        path: path ? `${path}[0]` : '[0]',
        suggestion: 'Use a valid Mapbox expression operator'
      });
      return { depth, blocking: true };
    }

    if (!expressionSpec.isExpression(expression)) {
      errors.push({
        severity: 'error',
        message: `Unknown expression operator: "${operator}"`,
        path: path ? `${path}[0]` : '[0]',
        suggestion:
          'Use a valid Mapbox expression operator (e.g., "get", "case", "match")'
      });
      return { expressionType: operator, depth, blocking: true };
    }

    let maxDepth = depth;
    const interpolationTypeArgIndex = INTERPOLATION_TYPE_ARG_INDEX[operator];
    expression.slice(1).forEach((arg: unknown, index: number) => {
      if (index === interpolationTypeArgIndex) {
        // e.g. ["linear"] / ["exponential", 1.5] - a type descriptor, not an expression
        return;
      }
      if (Array.isArray(arg)) {
        const argPath = path ? `${path}[${index + 1}]` : `[${index + 1}]`;
        const argResult = this.walkStructure(
          arg,
          errors,
          warnings,
          argPath,
          depth + 1
        );
        maxDepth = Math.max(maxDepth, argResult.depth);
      }
    });

    if (depth > 10) {
      warnings.push({
        severity: 'warning',
        message: `Expression is deeply nested (depth: ${depth})`,
        path: path || 'root',
        suggestion: 'Consider simplifying the expression'
      });
    }

    return { expressionType: operator, depth: maxDepth, blocking: false };
  }
}
