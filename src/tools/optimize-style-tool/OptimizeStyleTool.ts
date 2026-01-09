// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { OptimizeStyleInputSchema } from './OptimizeStyleTool.input.schema.js';
import {
  OptimizeStyleOutputSchema,
  type OptimizeStyleOutput
} from './OptimizeStyleTool.output.schema.js';

type Optimization = {
  type: string;
  description: string;
  count: number;
};

/**
 * OptimizeStyleTool - Optimizes Mapbox styles by removing redundancies and simplifying structure
 *
 * Performs various optimizations on Mapbox style JSON to reduce file size and improve performance.
 */
export class OptimizeStyleTool extends BaseTool<
  typeof OptimizeStyleInputSchema,
  typeof OptimizeStyleOutputSchema
> {
  readonly name = 'optimize_style_tool';
  readonly description =
    'Optimizes Mapbox styles by removing unused sources, duplicate layers, and simplifying expressions';
  readonly annotations = {
    title: 'Optimize Style Tool',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };

  constructor() {
    super({
      inputSchema: OptimizeStyleInputSchema,
      outputSchema: OptimizeStyleOutputSchema
    });
  }

  protected async execute(
    input: z.infer<typeof OptimizeStyleInputSchema>
  ): Promise<CallToolResult> {
    try {
      // Parse style if it's a string
      let style: any;
      if (typeof input.style === 'string') {
        try {
          style = JSON.parse(input.style);
        } catch (parseError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error parsing style: ${(parseError as Error).message}`
              }
            ],
            isError: true
          };
        }
      } else {
        style = JSON.parse(JSON.stringify(input.style)); // Deep clone
      }

      // Determine which optimizations to apply
      const requestedOptimizations = input.optimizations || [
        'remove-unused-sources',
        'remove-duplicate-layers',
        'simplify-expressions',
        'remove-empty-layers',
        'consolidate-filters'
      ];

      // Track optimizations performed
      const optimizations: Optimization[] = [];

      // Calculate original size
      const originalSize = JSON.stringify(style).length;

      // Apply each optimization
      for (const optimization of requestedOptimizations) {
        switch (optimization) {
          case 'remove-unused-sources':
            optimizations.push(this.removeUnusedSources(style));
            break;
          case 'remove-duplicate-layers':
            optimizations.push(this.removeDuplicateLayers(style));
            break;
          case 'simplify-expressions':
            optimizations.push(this.simplifyExpressions(style));
            break;
          case 'remove-empty-layers':
            optimizations.push(this.removeEmptyLayers(style));
            break;
          case 'consolidate-filters':
            optimizations.push(this.consolidateFilters(style));
            break;
        }
      }

      // Calculate optimized size
      const optimizedSize = JSON.stringify(style).length;
      const sizeSaved = originalSize - optimizedSize;
      const percentReduction =
        originalSize > 0 ? (sizeSaved / originalSize) * 100 : 0;

      const result: OptimizeStyleOutput = {
        optimizedStyle: style,
        optimizations: optimizations.filter((opt) => opt.count > 0),
        summary: {
          totalOptimizations: optimizations.reduce(
            (sum, opt) => sum + opt.count,
            0
          ),
          originalSize,
          optimizedSize,
          sizeSaved,
          percentReduction: Math.round(percentReduction * 100) / 100
        }
      };

      const validatedResult = OptimizeStyleOutputSchema.parse(result);

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
   * Remove sources that are not referenced by any layer
   */
  private removeUnusedSources(style: any): Optimization {
    if (!style.sources || !style.layers) {
      return {
        type: 'remove-unused-sources',
        description: 'No unused sources found',
        count: 0
      };
    }

    // Get all source IDs used by layers
    const usedSources = new Set<string>();
    for (const layer of style.layers) {
      if (layer.source) {
        usedSources.add(layer.source);
      }
    }

    // Find unused sources
    const unusedSources: string[] = [];
    for (const sourceId of Object.keys(style.sources)) {
      if (!usedSources.has(sourceId)) {
        unusedSources.push(sourceId);
      }
    }

    // Remove unused sources
    for (const sourceId of unusedSources) {
      delete style.sources[sourceId];
    }

    return {
      type: 'remove-unused-sources',
      description: `Removed ${unusedSources.length} unused source(s): ${unusedSources.join(', ')}`,
      count: unusedSources.length
    };
  }

  /**
   * Remove layers that are exact duplicates
   */
  private removeDuplicateLayers(style: any): Optimization {
    if (!style.layers || style.layers.length === 0) {
      return {
        type: 'remove-duplicate-layers',
        description: 'No duplicate layers found',
        count: 0
      };
    }

    const seen = new Map<string, any>();
    const duplicates: string[] = [];
    const filteredLayers: any[] = [];

    for (const layer of style.layers) {
      const { id, ...layerWithoutId } = layer;
      const layerHash = JSON.stringify(layerWithoutId);

      if (seen.has(layerHash)) {
        duplicates.push(id);
      } else {
        seen.set(layerHash, layer);
        filteredLayers.push(layer);
      }
    }

    style.layers = filteredLayers;

    return {
      type: 'remove-duplicate-layers',
      description:
        duplicates.length > 0
          ? `Removed ${duplicates.length} duplicate layer(s): ${duplicates.join(', ')}`
          : 'No duplicate layers found',
      count: duplicates.length
    };
  }

  /**
   * Simplify expressions where possible
   */
  private simplifyExpressions(style: any): Optimization {
    if (!style.layers) {
      return {
        type: 'simplify-expressions',
        description: 'No expressions to simplify',
        count: 0
      };
    }

    let simplifiedCount = 0;

    for (const layer of style.layers) {
      // Simplify filter expressions
      if (layer.filter) {
        const simplified = this.simplifyExpression(layer.filter);
        if (JSON.stringify(simplified) !== JSON.stringify(layer.filter)) {
          layer.filter = simplified;
          simplifiedCount++;
        }
      }

      // Simplify paint property expressions
      if (layer.paint) {
        for (const [key, value] of Object.entries(layer.paint)) {
          if (Array.isArray(value)) {
            const simplified = this.simplifyExpression(value);
            if (JSON.stringify(simplified) !== JSON.stringify(value)) {
              layer.paint[key] = simplified;
              simplifiedCount++;
            }
          }
        }
      }

      // Simplify layout property expressions
      if (layer.layout) {
        for (const [key, value] of Object.entries(layer.layout)) {
          if (Array.isArray(value)) {
            const simplified = this.simplifyExpression(value);
            if (JSON.stringify(simplified) !== JSON.stringify(value)) {
              layer.layout[key] = simplified;
              simplifiedCount++;
            }
          }
        }
      }
    }

    return {
      type: 'simplify-expressions',
      description:
        simplifiedCount > 0
          ? `Simplified ${simplifiedCount} expression(s)`
          : 'No expressions simplified',
      count: simplifiedCount
    };
  }

  /**
   * Simplify a single expression
   */
  private simplifyExpression(expr: any): any {
    if (!Array.isArray(expr)) {
      return expr;
    }

    const [operator, ...args] = expr;

    // Simplify ["all", true] -> true
    if (operator === 'all' && args.length === 1 && args[0] === true) {
      return true;
    }

    // Simplify ["any", false] -> false
    if (operator === 'any' && args.length === 1 && args[0] === false) {
      return false;
    }

    // Simplify ["!", false] -> true
    if (operator === '!' && args.length === 1 && args[0] === false) {
      return true;
    }

    // Simplify ["!", true] -> false
    if (operator === '!' && args.length === 1 && args[0] === true) {
      return false;
    }

    // Recursively simplify nested expressions
    return [operator, ...args.map((arg) => this.simplifyExpression(arg))];
  }

  /**
   * Remove layers with no visible properties
   */
  private removeEmptyLayers(style: any): Optimization {
    if (!style.layers || style.layers.length === 0) {
      return {
        type: 'remove-empty-layers',
        description: 'No empty layers found',
        count: 0
      };
    }

    const emptyLayers: string[] = [];
    const filteredLayers: any[] = [];

    for (const layer of style.layers) {
      const isEmpty =
        (!layer.paint || Object.keys(layer.paint).length === 0) &&
        (!layer.layout || Object.keys(layer.layout).length === 0) &&
        layer.type !== 'background';

      if (isEmpty) {
        emptyLayers.push(layer.id);
      } else {
        filteredLayers.push(layer);
      }
    }

    style.layers = filteredLayers;

    return {
      type: 'remove-empty-layers',
      description:
        emptyLayers.length > 0
          ? `Removed ${emptyLayers.length} empty layer(s): ${emptyLayers.join(', ')}`
          : 'No empty layers found',
      count: emptyLayers.length
    };
  }

  /**
   * Consolidate similar filter expressions (basic implementation)
   */
  private consolidateFilters(style: any): Optimization {
    if (!style.layers || style.layers.length < 2) {
      return {
        type: 'consolidate-filters',
        description: 'No filters to consolidate',
        count: 0
      };
    }

    // This is a simplified implementation
    // A full implementation would identify layers with similar filters
    // and potentially merge them or extract common filter logic

    let consolidatedCount = 0;

    // For now, we'll just identify layers with identical filters
    const filterGroups = new Map<string, string[]>();

    for (const layer of style.layers) {
      if (layer.filter) {
        const filterStr = JSON.stringify(layer.filter);
        if (!filterGroups.has(filterStr)) {
          filterGroups.set(filterStr, []);
        }
        filterGroups.get(filterStr)!.push(layer.id);
      }
    }

    // Count groups with multiple layers (could be consolidated)
    for (const [, layerIds] of filterGroups) {
      if (layerIds.length > 1) {
        consolidatedCount++;
      }
    }

    return {
      type: 'consolidate-filters',
      description:
        consolidatedCount > 0
          ? `Found ${consolidatedCount} group(s) of layers with identical filters that could be consolidated`
          : 'No filters to consolidate',
      count: consolidatedCount
    };
  }
}
