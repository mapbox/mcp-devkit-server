// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
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

/**
 * ValidateStyleTool - Validates Mapbox GL JS style JSON
 *
 * Performs comprehensive validation of Mapbox style JSON against the Mapbox Style Specification.
 * Checks for required fields, valid layer types, source references, and common configuration issues.
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

  private static readonly VALID_LAYER_TYPES = [
    'fill',
    'line',
    'symbol',
    'circle',
    'heatmap',
    'fill-extrusion',
    'raster',
    'hillshade',
    'background',
    'sky'
  ];

  private static readonly VALID_SOURCE_TYPES = [
    'vector',
    'raster',
    'raster-dem',
    'geojson',
    'image',
    'video'
  ];

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

      const errors: ValidationIssue[] = [];
      const warnings: ValidationIssue[] = [];
      const info: ValidationIssue[] = [];

      // Validate structure
      this.validateStructure(style, errors, warnings, info);
      this.validateSources(style, errors, warnings, info);
      this.validateLayers(style, errors, warnings, info);
      this.validateReferences(style, errors, warnings, info);

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

  private validateStructure(
    style: MapboxStyle,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[]
  ): void {
    // Check version
    if (!style.version) {
      errors.push({
        severity: 'error',
        message: 'Missing required "version" property',
        path: 'version',
        suggestion: 'Add "version": 8 to your style'
      });
    } else if (style.version !== 8) {
      warnings.push({
        severity: 'warning',
        message: `Style version is ${style.version}, but version 8 is the current standard`,
        path: 'version',
        suggestion: 'Consider updating to version 8'
      });
    }

    // Check layers array
    if (!style.layers) {
      errors.push({
        severity: 'error',
        message: 'Missing required "layers" array',
        path: 'layers',
        suggestion: 'Add "layers": [] to your style'
      });
    } else if (!Array.isArray(style.layers)) {
      errors.push({
        severity: 'error',
        message: '"layers" must be an array',
        path: 'layers'
      });
    } else if (style.layers.length === 0) {
      warnings.push({
        severity: 'warning',
        message: 'Style has no layers',
        path: 'layers',
        suggestion: 'Add at least one layer to make your map visible'
      });
    }

    // Check sources object
    if (!style.sources) {
      errors.push({
        severity: 'error',
        message: 'Missing required "sources" object',
        path: 'sources',
        suggestion: 'Add "sources": {} to your style'
      });
    } else if (
      typeof style.sources !== 'object' ||
      Array.isArray(style.sources)
    ) {
      errors.push({
        severity: 'error',
        message: '"sources" must be an object',
        path: 'sources'
      });
    }

    // Check sprite
    if (!style.sprite) {
      info.push({
        severity: 'info',
        message: 'No sprite URL defined',
        path: 'sprite',
        suggestion: 'Add a sprite URL if you plan to use icons in symbol layers'
      });
    }

    // Check glyphs
    if (!style.glyphs) {
      info.push({
        severity: 'info',
        message: 'No glyphs URL defined',
        path: 'glyphs',
        suggestion: 'Add a glyphs URL if you plan to use text labels'
      });
    }
  }

  private validateSources(
    style: MapboxStyle,
    errors: ValidationIssue[],
    _warnings: ValidationIssue[],
    info: ValidationIssue[]
  ): void {
    if (!style.sources || typeof style.sources !== 'object') {
      return;
    }

    const sourceIds = Object.keys(style.sources);

    if (sourceIds.length === 0) {
      info.push({
        severity: 'info',
        message: 'No sources defined',
        path: 'sources',
        suggestion:
          'Add sources to provide data for your layers (e.g., vector tiles, GeoJSON)'
      });
    }

    for (const [sourceId, source] of Object.entries(style.sources)) {
      if (!source || typeof source !== 'object') {
        errors.push({
          severity: 'error',
          message: `Source "${sourceId}" is not a valid object`,
          path: `sources.${sourceId}`
        });
        continue;
      }

      // Check source type
      if (!source.type) {
        errors.push({
          severity: 'error',
          message: `Source "${sourceId}" is missing required "type" property`,
          path: `sources.${sourceId}.type`,
          suggestion: `Specify one of: ${ValidateStyleTool.VALID_SOURCE_TYPES.join(', ')}`
        });
      } else if (!ValidateStyleTool.VALID_SOURCE_TYPES.includes(source.type)) {
        errors.push({
          severity: 'error',
          message: `Source "${sourceId}" has invalid type "${source.type}"`,
          path: `sources.${sourceId}.type`,
          suggestion: `Valid types are: ${ValidateStyleTool.VALID_SOURCE_TYPES.join(', ')}`
        });
      }

      // Type-specific validation
      if (source.type === 'vector' || source.type === 'raster') {
        if (!source.url && !source.tiles) {
          errors.push({
            severity: 'error',
            message: `Source "${sourceId}" must have either "url" or "tiles" property`,
            path: `sources.${sourceId}`,
            suggestion: 'Add a "url" or "tiles" array to specify tile data'
          });
        }
      }

      if (source.type === 'geojson') {
        if (!source.data) {
          errors.push({
            severity: 'error',
            message: `GeoJSON source "${sourceId}" is missing required "data" property`,
            path: `sources.${sourceId}.data`,
            suggestion:
              'Add "data" property with GeoJSON object or URL to GeoJSON file'
          });
        }
      }
    }
  }

  private validateLayers(
    style: MapboxStyle,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    _info: ValidationIssue[]
  ): void {
    if (!style.layers || !Array.isArray(style.layers)) {
      return;
    }

    const layerIds = new Set<string>();

    for (let i = 0; i < style.layers.length; i++) {
      const layer = style.layers[i];
      const layerPath = `layers[${i}]`;

      // Check layer ID
      if (!layer.id) {
        errors.push({
          severity: 'error',
          message: `Layer at index ${i} is missing required "id" property`,
          path: layerPath,
          suggestion: 'Add a unique "id" string to identify this layer'
        });
      } else {
        // Check for duplicate IDs
        if (layerIds.has(layer.id)) {
          errors.push({
            severity: 'error',
            message: `Duplicate layer ID "${layer.id}"`,
            path: `${layerPath}.id`,
            suggestion: 'Each layer must have a unique ID'
          });
        }
        layerIds.add(layer.id);
      }

      // Check layer type
      if (!layer.type) {
        errors.push({
          severity: 'error',
          message: `Layer "${layer.id || `at index ${i}`}" is missing required "type" property`,
          path: `${layerPath}.type`,
          suggestion: `Specify one of: ${ValidateStyleTool.VALID_LAYER_TYPES.join(', ')}`
        });
      } else if (!ValidateStyleTool.VALID_LAYER_TYPES.includes(layer.type)) {
        errors.push({
          severity: 'error',
          message: `Layer "${layer.id}" has invalid type "${layer.type}"`,
          path: `${layerPath}.type`,
          suggestion: `Valid types are: ${ValidateStyleTool.VALID_LAYER_TYPES.join(', ')}`
        });
      }

      // Check source requirement
      if (layer.type !== 'background' && layer.type !== 'sky') {
        if (!layer.source) {
          errors.push({
            severity: 'error',
            message: `Layer "${layer.id}" of type "${layer.type}" must have a "source" property`,
            path: `${layerPath}.source`,
            suggestion: 'Reference a source ID defined in the "sources" object'
          });
        }
      }

      // Check source-layer for vector sources
      if (
        layer.type !== 'background' &&
        layer.type !== 'sky' &&
        layer.type !== 'raster'
      ) {
        const source = style.sources?.[layer.source];
        if (source?.type === 'vector' && !layer['source-layer']) {
          warnings.push({
            severity: 'warning',
            message: `Layer "${layer.id}" uses vector source but missing "source-layer"`,
            path: `${layerPath}.source-layer`,
            suggestion:
              'Specify which source layer from the vector tileset to use'
          });
        }
      }
    }
  }

  private validateReferences(
    style: MapboxStyle,
    errors: ValidationIssue[],
    _warnings: ValidationIssue[],
    _info: ValidationIssue[]
  ): void {
    if (!style.layers || !Array.isArray(style.layers)) {
      return;
    }

    const sourceIds = new Set(Object.keys(style.sources || {}));

    for (let i = 0; i < style.layers.length; i++) {
      const layer = style.layers[i];

      // Check if referenced source exists
      if (layer.source && !sourceIds.has(layer.source)) {
        errors.push({
          severity: 'error',
          message: `Layer "${layer.id || `at index ${i}`}" references non-existent source "${layer.source}"`,
          path: `layers[${i}].source`,
          suggestion: `Source "${layer.source}" is not defined in the "sources" object`
        });
      }
    }
  }
}
