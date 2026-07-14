// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
import { validate as validateMapboxStyle } from '@mapbox/mapbox-gl-style-spec';
import type {
  StyleSpecification,
  ValidationError as MapboxValidationError
} from '@mapbox/mapbox-gl-style-spec';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ValidateStyleInputSchema } from './ValidateStyleTool.input.schema.js';
import {
  ValidateStyleOutputSchema,
  type ValidateStyleOutput,
  type ValidationIssue
} from './ValidateStyleTool.output.schema.js';

interface MapboxStyle {
  version?: number;
  name?: string;
  sources?: Record<string, any>;
  layers?: Array<any>;
  sprite?: string;
  glyphs?: string;
  [key: string]: any;
}

// style-spec ValidationError messages are formatted as "<path>: <description>"
// for anything scoped below the document root (e.g. "layers[0].paint.circle-opacity: ...").
// Root-level errors (e.g. "missing required property \"version\"") have no prefix.
const PATH_PREFIXED_MESSAGE = /^([\w[\]-]+(?:\.[\w[\]-]+)*): ([\s\S]*)$/;

function splitPathFromMessage(message: string): {
  path?: string;
  message: string;
} {
  const match = message.match(PATH_PREFIXED_MESSAGE);
  return match ? { path: match[1], message: match[2] } : { message };
}

// validateMapboxStyle recurses into nested paint/layout expressions with no
// depth limit of its own. A pathologically deep expression (cheap to construct
// - a few KB of brackets) would otherwise recurse tens of thousands of frames
// deep before failing with an unhelpful stack overflow. This check is itself
// depth-limited (bails before recursing further) so it can safely measure
// arbitrarily deep input without risking the same problem.
const MAX_STYLE_DEPTH = 64;

function exceedsMaxDepth(value: unknown, depth = 0): boolean {
  if (depth > MAX_STYLE_DEPTH) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => exceedsMaxDepth(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) =>
      exceedsMaxDepth(item, depth + 1)
    );
  }
  return false;
}

/**
 * ValidateStyleTool - Validates Mapbox GL JS style JSON
 *
 * Delegates spec-conformance checks (required properties, layer/source types,
 * source references, expression correctness, zoom-expression placement, etc.)
 * to the official `@mapbox/mapbox-gl-style-spec` package - the same validation
 * logic mapbox-gl-js runs at runtime - then layers on a few UX-oriented
 * suggestions (missing sprite/glyphs, empty style) the spec itself doesn't flag.
 *
 * @example
 * ```typescript
 * const tool = new ValidateStyleTool();
 * const result = await tool.run({
 *   style: { version: 8, sources: {}, layers: [] }
 * });
 * ```
 */
export class ValidateStyleTool extends BaseTool<
  typeof ValidateStyleInputSchema,
  typeof ValidateStyleOutputSchema
> {
  readonly name = 'validate_style_tool';
  readonly description =
    'Validates Mapbox style JSON against the Mapbox Style Specification, checking for errors, warnings, and providing suggestions for improvement';
  readonly annotations = {
    title: 'Validate Style Tool',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };

  constructor() {
    super({
      inputSchema: ValidateStyleInputSchema,
      outputSchema: ValidateStyleOutputSchema
    });
  }

  /**
   * Execute the validation
   */
  protected async execute(
    input: z.infer<typeof ValidateStyleInputSchema>
  ): Promise<CallToolResult> {
    try {
      // Parse style if it's a string
      let style: MapboxStyle;
      if (typeof input.style === 'string') {
        try {
          style = JSON.parse(input.style);
        } catch (parseError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error parsing style JSON: ${(parseError as Error).message}`
              }
            ],
            isError: true
          };
        }
      } else {
        style = input.style as MapboxStyle;
      }

      if (exceedsMaxDepth(style)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: style exceeds maximum nesting depth of ${MAX_STYLE_DEPTH}`
            }
          ],
          isError: true
        };
      }

      const errors: ValidationIssue[] = [];
      const warnings: ValidationIssue[] = [];
      const info: ValidationIssue[] = [];

      this.validateAgainstSpec(style, errors, warnings);
      this.provideSuggestions(style, warnings, info);

      const result: ValidateStyleOutput = {
        valid: errors.length === 0,
        errors,
        warnings,
        info,
        summary: {
          version: style.version,
          layerCount: style.layers?.length || 0,
          sourceCount: Object.keys(style.sources || {}).length,
          hasSprite: !!style.sprite,
          hasGlyphs: !!style.glyphs
        }
      };

      const validatedResult = ValidateStyleOutputSchema.parse(result);

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
   * Runs the official Mapbox style-spec validator, the ground truth mapbox-gl-js
   * itself uses at runtime, and maps its findings onto our issue schema.
   */
  private validateAgainstSpec(
    style: MapboxStyle,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    // The style is arbitrary/possibly-malformed user input - that's exactly what
    // we're validating - so it won't generally satisfy StyleSpecification's type.
    const specErrors = validateMapboxStyle(
      style as unknown as StyleSpecification
    );

    for (const err of specErrors as MapboxValidationError[]) {
      const { path, message } = splitPathFromMessage(err.message);
      const issue: ValidationIssue = { severity: 'error', message, path };
      // ValidationWarning is a style-spec subclass of ValidationError that isn't
      // part of the package's public API, so we distinguish it by name.
      if (err.constructor.name === 'ValidationWarning') {
        issue.severity = 'warning';
        warnings.push(issue);
      } else {
        errors.push(issue);
      }
    }
  }

  /**
   * Non-spec suggestions: things that are technically spec-valid but are
   * usually mistakes or worth calling out for a better-configured style.
   */
  private provideSuggestions(
    style: MapboxStyle,
    warnings: ValidationIssue[],
    info: ValidationIssue[]
  ): void {
    if (Array.isArray(style.layers) && style.layers.length === 0) {
      warnings.push({
        severity: 'warning',
        message: 'Style has no layers',
        path: 'layers',
        suggestion: 'Add at least one layer to make your map visible'
      });
    }

    if (
      style.sources &&
      typeof style.sources === 'object' &&
      !Array.isArray(style.sources) &&
      Object.keys(style.sources).length === 0
    ) {
      info.push({
        severity: 'info',
        message: 'No sources defined',
        path: 'sources',
        suggestion:
          'Add sources to provide data for your layers (e.g., vector tiles, GeoJSON)'
      });
    }

    if (!style.sprite) {
      info.push({
        severity: 'info',
        message: 'No sprite URL defined',
        path: 'sprite',
        suggestion: 'Add a sprite URL if you plan to use icons in symbol layers'
      });
    }

    if (!style.glyphs) {
      info.push({
        severity: 'info',
        message: 'No glyphs URL defined',
        path: 'glyphs',
        suggestion: 'Add a glyphs URL if you plan to use text labels'
      });
    }
  }
}
