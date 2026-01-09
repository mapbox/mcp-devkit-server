// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CompareStylesInputSchema } from './CompareStylesTool.input.schema.js';
import {
  CompareStylesOutputSchema,
  type CompareStylesOutput,
  type Difference
} from './CompareStylesTool.output.schema.js';

/**
 * CompareStylesTool - Compares two Mapbox styles and reports differences
 *
 * Performs deep comparison of two Mapbox style JSON objects, identifying
 * additions, removals, and modifications.
 */
export class CompareStylesTool extends BaseTool<
  typeof CompareStylesInputSchema,
  typeof CompareStylesOutputSchema
> {
  readonly name = 'compare_styles_tool';
  readonly description =
    'Compares two Mapbox styles and reports differences in structure, layers, sources, and properties';
  readonly annotations = {
    title: 'Compare Styles Tool',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };

  // Metadata fields to ignore when ignoreMetadata is true
  private static readonly METADATA_FIELDS = [
    'id',
    'owner',
    'created',
    'modified',
    'draft',
    'visibility'
  ];

  constructor() {
    super({
      inputSchema: CompareStylesInputSchema,
      outputSchema: CompareStylesOutputSchema
    });
  }

  protected async execute(
    input: z.infer<typeof CompareStylesInputSchema>
  ): Promise<CallToolResult> {
    try {
      // Parse styles if they're strings
      let styleA: any;
      let styleB: any;

      if (typeof input.styleA === 'string') {
        try {
          styleA = JSON.parse(input.styleA);
        } catch (parseError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error parsing style A: ${(parseError as Error).message}`
              }
            ],
            isError: true
          };
        }
      } else {
        styleA = input.styleA;
      }

      if (typeof input.styleB === 'string') {
        try {
          styleB = JSON.parse(input.styleB);
        } catch (parseError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error parsing style B: ${(parseError as Error).message}`
              }
            ],
            isError: true
          };
        }
      } else {
        styleB = input.styleB;
      }

      // Remove metadata fields if requested
      if (input.ignoreMetadata) {
        styleA = this.removeMetadata(styleA);
        styleB = this.removeMetadata(styleB);
      }

      // Perform comparison
      const differences: Difference[] = [];
      this.compareObjects(styleA, styleB, '', differences);

      // Calculate summary
      const added = differences.filter((d) => d.type === 'added').length;
      const removed = differences.filter((d) => d.type === 'removed').length;
      const modified = differences.filter((d) => d.type === 'modified').length;

      const result: CompareStylesOutput = {
        identical: differences.length === 0,
        differences,
        summary: {
          totalDifferences: differences.length,
          added,
          removed,
          modified
        }
      };

      const validatedResult = CompareStylesOutputSchema.parse(result);

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

  private removeMetadata(style: any): any {
    if (typeof style !== 'object' || style === null) {
      return style;
    }

    const cleaned = { ...style };
    for (const field of CompareStylesTool.METADATA_FIELDS) {
      delete cleaned[field];
    }
    return cleaned;
  }

  private compareObjects(
    objA: any,
    objB: any,
    path: string,
    differences: Difference[]
  ): void {
    // Handle null/undefined
    if (objA === null || objA === undefined) {
      if (objB !== null && objB !== undefined) {
        differences.push({
          path: path || 'root',
          type: 'added',
          valueB: objB,
          description: `Property added in style B`
        });
      }
      return;
    }

    if (objB === null || objB === undefined) {
      differences.push({
        path: path || 'root',
        type: 'removed',
        valueA: objA,
        description: `Property removed in style B`
      });
      return;
    }

    // Handle arrays
    if (Array.isArray(objA) && Array.isArray(objB)) {
      this.compareArrays(objA, objB, path, differences);
      return;
    }

    // Handle primitives
    if (typeof objA !== 'object' || typeof objB !== 'object') {
      if (objA !== objB) {
        differences.push({
          path: path || 'root',
          type: 'modified',
          valueA: objA,
          valueB: objB,
          description: `Value changed from ${JSON.stringify(objA)} to ${JSON.stringify(objB)}`
        });
      }
      return;
    }

    // Handle objects
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;

      if (!(key in objA)) {
        differences.push({
          path: newPath,
          type: 'added',
          valueB: objB[key],
          description: `Property "${key}" added`
        });
      } else if (!(key in objB)) {
        differences.push({
          path: newPath,
          type: 'removed',
          valueA: objA[key],
          description: `Property "${key}" removed`
        });
      } else {
        this.compareObjects(objA[key], objB[key], newPath, differences);
      }
    }
  }

  private compareArrays(
    arrA: any[],
    arrB: any[],
    path: string,
    differences: Difference[]
  ): void {
    // Special handling for layers array - compare by ID
    if (path.endsWith('layers')) {
      this.compareLayerArrays(arrA, arrB, path, differences);
      return;
    }

    // Special handling for sources object keys
    if (path.endsWith('sources')) {
      this.compareObjects(arrA, arrB, path, differences);
      return;
    }

    // For other arrays, compare by index
    const maxLength = Math.max(arrA.length, arrB.length);

    for (let i = 0; i < maxLength; i++) {
      const newPath = `${path}[${i}]`;

      if (i >= arrA.length) {
        differences.push({
          path: newPath,
          type: 'added',
          valueB: arrB[i],
          description: `Array element added at index ${i}`
        });
      } else if (i >= arrB.length) {
        differences.push({
          path: newPath,
          type: 'removed',
          valueA: arrA[i],
          description: `Array element removed at index ${i}`
        });
      } else {
        this.compareObjects(arrA[i], arrB[i], newPath, differences);
      }
    }
  }

  private compareLayerArrays(
    layersA: any[],
    layersB: any[],
    path: string,
    differences: Difference[]
  ): void {
    const layersAById = new Map(layersA.map((layer) => [layer.id, layer]));
    const layersBById = new Map(layersB.map((layer) => [layer.id, layer]));

    // Check for removed layers
    for (const [id, layer] of layersAById) {
      if (!layersBById.has(id)) {
        differences.push({
          path: `${path}[id="${id}"]`,
          type: 'removed',
          valueA: layer,
          description: `Layer "${id}" removed`
        });
      }
    }

    // Check for added and modified layers
    for (const [id, layerB] of layersBById) {
      if (!layersAById.has(id)) {
        differences.push({
          path: `${path}[id="${id}"]`,
          type: 'added',
          valueB: layerB,
          description: `Layer "${id}" added`
        });
      } else {
        const layerA = layersAById.get(id);
        this.compareObjects(layerA, layerB, `${path}[id="${id}"]`, differences);
      }
    }
  }
}
