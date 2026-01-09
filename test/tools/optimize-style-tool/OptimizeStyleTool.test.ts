// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { OptimizeStyleTool } from '../../../src/tools/optimize-style-tool/OptimizeStyleTool.js';

describe('OptimizeStyleTool', () => {
  let tool: OptimizeStyleTool;

  beforeEach(() => {
    tool = new OptimizeStyleTool();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('optimize_style_tool');
      expect(tool.description).toBe(
        'Optimizes Mapbox styles by removing unused sources, duplicate layers, and simplifying expressions'
      );
    });

    it('should have correct annotations', () => {
      expect(tool.annotations).toEqual({
        title: 'Optimize Style Tool',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      });
    });
  });

  describe('basic optimization', () => {
    it('should optimize a simple style', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: []
      };

      const result = await tool.run({ style });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle).toBeDefined();
      expect(parsed.optimizations).toBeDefined();
      expect(parsed.summary).toBeDefined();
    });

    it('should handle JSON string input', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: []
      };

      const result = await tool.run({ style: JSON.stringify(style) });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle).toBeDefined();
    });
  });

  describe('remove-unused-sources optimization', () => {
    it('should remove unused sources', async () => {
      const style = {
        version: 8,
        sources: {
          'used-source': { type: 'vector' },
          'unused-source': { type: 'vector' }
        },
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            source: 'used-source'
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['remove-unused-sources']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.sources).toHaveProperty('used-source');
      expect(parsed.optimizedStyle.sources).not.toHaveProperty('unused-source');
      expect(parsed.optimizations).toHaveLength(1);
      expect(parsed.optimizations[0].count).toBe(1);
    });

    it('should not remove any sources when all are used', async () => {
      const style = {
        version: 8,
        sources: {
          source1: { type: 'vector' },
          source2: { type: 'vector' }
        },
        layers: [
          { id: 'layer1', type: 'fill', source: 'source1' },
          { id: 'layer2', type: 'line', source: 'source2' }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['remove-unused-sources']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizations).toHaveLength(0);
    });
  });

  describe('remove-duplicate-layers optimization', () => {
    it('should remove duplicate layers', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            paint: { 'fill-color': '#ff0000' }
          },
          {
            id: 'layer2',
            type: 'fill',
            paint: { 'fill-color': '#ff0000' }
          },
          {
            id: 'layer3',
            type: 'line',
            paint: { 'line-color': '#0000ff' }
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['remove-duplicate-layers']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.layers).toHaveLength(2);
      expect(parsed.optimizations[0].count).toBe(1);
    });

    it('should not remove any layers when all are unique', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          { id: 'layer1', type: 'fill', paint: { 'fill-color': '#ff0000' } },
          { id: 'layer2', type: 'fill', paint: { 'fill-color': '#00ff00' } }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['remove-duplicate-layers']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.layers).toHaveLength(2);
      expect(parsed.optimizations).toHaveLength(0);
    });
  });

  describe('simplify-expressions optimization', () => {
    it('should simplify ["all", true] to true', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            filter: ['all', true],
            paint: {}
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['simplify-expressions']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.layers[0].filter).toBe(true);
      expect(parsed.optimizations[0].count).toBeGreaterThan(0);
    });

    it('should simplify ["any", false] to false', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            filter: ['any', false],
            paint: {}
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['simplify-expressions']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.layers[0].filter).toBe(false);
    });

    it('should simplify ["!", false] to true', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            filter: ['!', false],
            paint: {}
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['simplify-expressions']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.layers[0].filter).toBe(true);
    });

    it('should simplify ["!", true] to false', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            filter: ['!', true],
            paint: {}
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['simplify-expressions']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.layers[0].filter).toBe(false);
    });

    it('should simplify paint property expressions', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            paint: {
              'fill-opacity': ['all', true]
            }
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['simplify-expressions']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.layers[0].paint['fill-opacity']).toBe(true);
    });
  });

  describe('remove-empty-layers optimization', () => {
    it('should remove layers with no paint or layout properties', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'empty-layer',
            type: 'fill',
            paint: {},
            layout: {}
          },
          {
            id: 'non-empty-layer',
            type: 'fill',
            paint: { 'fill-color': '#ff0000' }
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['remove-empty-layers']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.layers).toHaveLength(1);
      expect(parsed.optimizedStyle.layers[0].id).toBe('non-empty-layer');
      expect(parsed.optimizations[0].count).toBe(1);
    });

    it('should not remove background layers even if empty', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {},
            layout: {}
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['remove-empty-layers']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.optimizedStyle.layers).toHaveLength(1);
      expect(parsed.optimizations).toHaveLength(0);
    });
  });

  describe('consolidate-filters optimization', () => {
    it('should identify layers with identical filters', async () => {
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            filter: ['==', ['get', 'type'], 'water'],
            paint: {}
          },
          {
            id: 'layer2',
            type: 'line',
            filter: ['==', ['get', 'type'], 'water'],
            paint: {}
          }
        ]
      };

      const result = await tool.run({
        style,
        optimizations: ['consolidate-filters']
      });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      // Should identify the group of layers with identical filters
      expect(parsed.optimizations[0].count).toBeGreaterThan(0);
    });
  });

  describe('combined optimizations', () => {
    it('should apply multiple optimizations', async () => {
      const style = {
        version: 8,
        sources: {
          used: { type: 'vector' },
          unused: { type: 'vector' }
        },
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            source: 'used',
            filter: ['all', true],
            paint: { 'fill-color': '#ff0000' }
          },
          {
            id: 'layer2',
            type: 'fill',
            source: 'used',
            filter: ['all', true],
            paint: { 'fill-color': '#ff0000' }
          },
          {
            id: 'empty',
            type: 'fill',
            paint: {},
            layout: {}
          }
        ]
      };

      const result = await tool.run({ style });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      // Should have removed unused source, duplicate layer, empty layer, and simplified expressions
      expect(parsed.optimizations.length).toBeGreaterThan(0);
      expect(parsed.summary.totalOptimizations).toBeGreaterThan(0);
    });
  });

  describe('summary statistics', () => {
    it('should calculate size savings', async () => {
      const style = {
        version: 8,
        sources: {
          unused: { type: 'vector' }
        },
        layers: []
      };

      const result = await tool.run({ style });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary.originalSize).toBeGreaterThan(0);
      expect(parsed.summary.optimizedSize).toBeGreaterThan(0);
      expect(parsed.summary.sizeSaved).toBeGreaterThanOrEqual(0);
      expect(parsed.summary.percentReduction).toBeGreaterThanOrEqual(0);
    });

    it('should show percentage reduction', async () => {
      const style = {
        version: 8,
        sources: {
          unused1: { type: 'vector' },
          unused2: { type: 'vector' },
          unused3: { type: 'vector' }
        },
        layers: []
      };

      const result = await tool.run({ style });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary.percentReduction).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON string', async () => {
      const result = await tool.run({ style: '{invalid json' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error parsing style');
    });
  });

  describe('no optimizations needed', () => {
    it('should return zero optimizations for already optimized style', async () => {
      const style = {
        version: 8,
        sources: {
          'vector-source': { type: 'vector' }
        },
        layers: [
          {
            id: 'layer1',
            type: 'fill',
            source: 'vector-source',
            paint: { 'fill-color': '#ff0000' }
          }
        ]
      };

      const result = await tool.run({ style });
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary.totalOptimizations).toBe(0);
      expect(parsed.summary.sizeSaved).toBe(0);
    });
  });
});
