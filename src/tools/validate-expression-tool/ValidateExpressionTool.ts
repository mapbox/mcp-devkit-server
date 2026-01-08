// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ValidateExpressionInputSchema } from './ValidateExpressionTool.input.schema.js';
import {
  ValidateExpressionOutputSchema,
  type ValidateExpressionOutput,
  type ExpressionIssue
} from './ValidateExpressionTool.output.schema.js';

/**
 * ValidateExpressionTool - Validates Mapbox style expressions
 *
 * Performs comprehensive validation of Mapbox style expressions including
 * syntax validation, operator checking, and argument validation.
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

  // Mapbox expression operators with their expected argument counts
  // Format: [minArgs, maxArgs, returnType]
  private static readonly OPERATORS: Record<
    string,
    { min: number; max: number; returnType?: string }
  > = {
    // Decision
    case: { min: 2, max: Infinity },
    match: { min: 3, max: Infinity },
    coalesce: { min: 1, max: Infinity },

    // Lookup
    get: { min: 1, max: 2, returnType: 'any' },
    has: { min: 1, max: 2, returnType: 'boolean' },
    in: { min: 2, max: 2, returnType: 'boolean' },
    'index-of': { min: 2, max: 3, returnType: 'number' },
    length: { min: 1, max: 1, returnType: 'number' },
    slice: { min: 2, max: 3 },

    // Math
    '+': { min: 2, max: Infinity, returnType: 'number' },
    '-': { min: 2, max: 2, returnType: 'number' },
    '*': { min: 2, max: Infinity, returnType: 'number' },
    '/': { min: 2, max: 2, returnType: 'number' },
    '%': { min: 2, max: 2, returnType: 'number' },
    '^': { min: 2, max: 2, returnType: 'number' },
    min: { min: 1, max: Infinity, returnType: 'number' },
    max: { min: 1, max: Infinity, returnType: 'number' },
    round: { min: 1, max: 1, returnType: 'number' },
    floor: { min: 1, max: 1, returnType: 'number' },
    ceil: { min: 1, max: 1, returnType: 'number' },
    abs: { min: 1, max: 1, returnType: 'number' },
    sqrt: { min: 1, max: 1, returnType: 'number' },
    log10: { min: 1, max: 1, returnType: 'number' },
    log2: { min: 1, max: 1, returnType: 'number' },
    ln: { min: 1, max: 1, returnType: 'number' },
    e: { min: 0, max: 0, returnType: 'number' },
    pi: { min: 0, max: 0, returnType: 'number' },

    // Comparison
    '==': { min: 2, max: 3, returnType: 'boolean' },
    '!=': { min: 2, max: 3, returnType: 'boolean' },
    '>': { min: 2, max: 3, returnType: 'boolean' },
    '<': { min: 2, max: 3, returnType: 'boolean' },
    '>=': { min: 2, max: 3, returnType: 'boolean' },
    '<=': { min: 2, max: 3, returnType: 'boolean' },

    // Logical
    '!': { min: 1, max: 1, returnType: 'boolean' },
    all: { min: 1, max: Infinity, returnType: 'boolean' },
    any: { min: 1, max: Infinity, returnType: 'boolean' },

    // String
    concat: { min: 1, max: Infinity, returnType: 'string' },
    downcase: { min: 1, max: 1, returnType: 'string' },
    upcase: { min: 1, max: 1, returnType: 'string' },
    'is-supported-script': { min: 1, max: 1, returnType: 'boolean' },
    'resolved-locale': { min: 1, max: 1, returnType: 'string' },

    // Color
    rgb: { min: 3, max: 3, returnType: 'color' },
    rgba: { min: 4, max: 4, returnType: 'color' },
    'to-rgba': { min: 1, max: 1, returnType: 'array' },

    // Type conversion
    array: { min: 1, max: 3 },
    boolean: { min: 1, max: 2, returnType: 'boolean' },
    collator: { min: 0, max: 1 },
    format: { min: 1, max: Infinity, returnType: 'formatted' },
    image: { min: 1, max: 1, returnType: 'image' },
    literal: { min: 1, max: 1 },
    number: { min: 1, max: 3, returnType: 'number' },
    object: { min: 1, max: 2, returnType: 'object' },
    string: { min: 1, max: 2, returnType: 'string' },
    'to-boolean': { min: 1, max: 1, returnType: 'boolean' },
    'to-color': { min: 1, max: 3, returnType: 'color' },
    'to-number': { min: 1, max: 3, returnType: 'number' },
    'to-string': { min: 1, max: 1, returnType: 'string' },
    typeof: { min: 1, max: 1, returnType: 'string' },

    // Interpolation
    interpolate: { min: 3, max: Infinity },
    'interpolate-hcl': { min: 3, max: Infinity },
    'interpolate-lab': { min: 3, max: Infinity },
    step: { min: 2, max: Infinity },

    // Feature data
    'feature-state': { min: 1, max: 1 },
    'geometry-type': { min: 0, max: 0, returnType: 'string' },
    id: { min: 0, max: 0 },
    properties: { min: 0, max: 0, returnType: 'object' },

    // Camera
    zoom: { min: 0, max: 0, returnType: 'number' },
    pitch: { min: 0, max: 0, returnType: 'number' },
    'distance-from-center': { min: 0, max: 0, returnType: 'number' },

    // Heatmap
    'heatmap-density': { min: 0, max: 0, returnType: 'number' },

    // Variable binding
    let: { min: 2, max: Infinity },
    var: { min: 1, max: 1 },

    // Array/object
    at: { min: 2, max: 2 }
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

      // Validate the expression
      const metadata = this.validateExpression(
        expression,
        errors,
        warnings,
        info,
        ''
      );

      const result: ValidateExpressionOutput = {
        valid: errors.length === 0,
        errors,
        warnings,
        info,
        metadata
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

  private validateExpression(
    expression: any,
    errors: ExpressionIssue[],
    warnings: ExpressionIssue[],
    info: ExpressionIssue[],
    path: string,
    depth = 0
  ): { expressionType?: string; returnType?: string; depth: number } {
    const maxDepth = depth;

    // Literal values are valid expressions
    if (
      typeof expression === 'string' ||
      typeof expression === 'number' ||
      typeof expression === 'boolean' ||
      expression === null
    ) {
      return {
        expressionType: 'literal',
        returnType: typeof expression === 'string' ? 'string' : 'number',
        depth: maxDepth
      };
    }

    // Expressions must be arrays
    if (!Array.isArray(expression)) {
      if (typeof expression === 'object') {
        // Objects are valid as literals (for filter expressions, etc.)
        return {
          expressionType: 'literal-object',
          returnType: 'object',
          depth: maxDepth
        };
      }
      errors.push({
        severity: 'error',
        message: 'Expression must be an array or literal value',
        path: path || 'root'
      });
      return { depth: maxDepth };
    }

    // Empty arrays are invalid
    if (expression.length === 0) {
      errors.push({
        severity: 'error',
        message: 'Expression array cannot be empty',
        path: path || 'root'
      });
      return { depth: maxDepth };
    }

    const operator = expression[0];

    // Operator must be a string
    if (typeof operator !== 'string') {
      errors.push({
        severity: 'error',
        message: 'Expression operator must be a string',
        path: path ? `${path}[0]` : '[0]',
        suggestion: 'Use a valid Mapbox expression operator'
      });
      return { depth: maxDepth };
    }

    // Check if operator is valid
    const operatorSpec = ValidateExpressionTool.OPERATORS[operator];
    if (!operatorSpec) {
      errors.push({
        severity: 'error',
        message: `Unknown expression operator: "${operator}"`,
        path: path ? `${path}[0]` : '[0]',
        suggestion:
          'Use a valid Mapbox expression operator (e.g., "get", "case", "match")'
      });
      return { expressionType: operator, depth: maxDepth };
    }

    // Validate argument count
    const args = expression.slice(1);
    if (args.length < operatorSpec.min) {
      errors.push({
        severity: 'error',
        message: `Operator "${operator}" requires at least ${operatorSpec.min} argument(s), got ${args.length}`,
        path: path || 'root',
        suggestion: `Add ${operatorSpec.min - args.length} more argument(s)`
      });
    }
    if (operatorSpec.max !== Infinity && args.length > operatorSpec.max) {
      errors.push({
        severity: 'error',
        message: `Operator "${operator}" accepts at most ${operatorSpec.max} argument(s), got ${args.length}`,
        path: path || 'root',
        suggestion: `Remove ${args.length - operatorSpec.max} argument(s)`
      });
    }

    // Recursively validate nested expressions
    let currentDepth = depth;
    args.forEach((arg, index) => {
      if (Array.isArray(arg)) {
        const argPath = path ? `${path}[${index + 1}]` : `[${index + 1}]`;
        const argMetadata = this.validateExpression(
          arg,
          errors,
          warnings,
          info,
          argPath,
          depth + 1
        );
        currentDepth = Math.max(currentDepth, argMetadata.depth);
      }
    });

    // Provide depth warnings for very deeply nested expressions
    if (depth > 10) {
      warnings.push({
        severity: 'warning',
        message: `Expression is deeply nested (depth: ${depth})`,
        path: path || 'root',
        suggestion: 'Consider simplifying the expression'
      });
    }

    return {
      expressionType: operator,
      returnType: operatorSpec.returnType,
      depth: Math.max(currentDepth, depth)
    };
  }
}
