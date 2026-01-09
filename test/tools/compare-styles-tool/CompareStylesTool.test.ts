// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { CompareStylesTool } from '../../../src/tools/compare-styles-tool/CompareStylesTool.js';

describe('CompareStylesTool', () => {
  let tool: CompareStylesTool;

  beforeEach(() => {
    tool = new CompareStylesTool();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('compare_styles_tool');
      expect(tool.description).toBe(
        'Compares two Mapbox styles and reports differences in structure, layers, sources, and properties'
      );
    });

    it('should have correct annotations', () => {
      expect(tool.annotations).toEqual({
        title: 'Compare Styles Tool',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      });
    });
  });

  describe('identical styles', () => {
    it('should detect identical styles', async () => {
      const style = {
        version: 8,
        name: 'Test Style',
        sources: {},
        layers: []
      };

      const input = {
        styleA: style,
        styleB: style
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(true);
      expect(parsed.differences).toHaveLength(0);
      expect(parsed.summary.totalDifferences).toBe(0);
    });
  });

  describe('property differences', () => {
    it('should detect added property', async () => {
      const styleA = {
        version: 8,
        sources: {}
      };

      const styleB = {
        version: 8,
        sources: {},
        layers: []
      };

      const input = {
        styleA,
        styleB
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(false);
      expect(parsed.differences).toHaveLength(1);
      expect(parsed.differences[0].type).toBe('added');
      expect(parsed.differences[0].path).toBe('layers');
      expect(parsed.summary.added).toBe(1);
    });

    it('should detect removed property', async () => {
      const styleA = {
        version: 8,
        sources: {},
        layers: []
      };

      const styleB = {
        version: 8,
        sources: {}
      };

      const input = {
        styleA,
        styleB
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(false);
      expect(parsed.differences).toHaveLength(1);
      expect(parsed.differences[0].type).toBe('removed');
      expect(parsed.differences[0].path).toBe('layers');
      expect(parsed.summary.removed).toBe(1);
    });

    it('should detect modified property', async () => {
      const styleA = {
        version: 8,
        name: 'Style A'
      };

      const styleB = {
        version: 8,
        name: 'Style B'
      };

      const input = {
        styleA,
        styleB
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(false);
      expect(parsed.differences).toHaveLength(1);
      expect(parsed.differences[0].type).toBe('modified');
      expect(parsed.differences[0].path).toBe('name');
      expect(parsed.differences[0].valueA).toBe('Style A');
      expect(parsed.differences[0].valueB).toBe('Style B');
      expect(parsed.summary.modified).toBe(1);
    });
  });

  describe('layer differences', () => {
    it('should detect added layer', async () => {
      const styleA = {
        version: 8,
        sources: {},
        layers: []
      };

      const styleB = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#fff' }
          }
        ]
      };

      const input = {
        styleA,
        styleB
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(false);
      expect(
        parsed.differences.some((d: any) => d.path.includes('background'))
      ).toBe(true);
    });

    it('should detect removed layer', async () => {
      const styleA = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background'
          }
        ]
      };

      const styleB = {
        version: 8,
        sources: {},
        layers: []
      };

      const input = {
        styleA,
        styleB
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(false);
      expect(
        parsed.differences.some(
          (d: any) => d.type === 'removed' && d.path.includes('background')
        )
      ).toBe(true);
    });

    it('should detect modified layer', async () => {
      const styleA = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#fff' }
          }
        ]
      };

      const styleB = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#000' }
          }
        ]
      };

      const input = {
        styleA,
        styleB
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(false);
      expect(parsed.differences.some((d: any) => d.type === 'modified')).toBe(
        true
      );
    });
  });

  describe('metadata handling', () => {
    it('should ignore metadata fields when requested', async () => {
      const styleA = {
        version: 8,
        id: 'style-a',
        owner: 'user1',
        created: '2024-01-01',
        modified: '2024-01-02',
        sources: {},
        layers: []
      };

      const styleB = {
        version: 8,
        id: 'style-b',
        owner: 'user2',
        created: '2024-02-01',
        modified: '2024-02-02',
        sources: {},
        layers: []
      };

      const input = {
        styleA,
        styleB,
        ignoreMetadata: true
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(true);
      expect(parsed.differences).toHaveLength(0);
    });

    it('should not ignore metadata fields by default', async () => {
      const styleA = {
        version: 8,
        id: 'style-a',
        sources: {},
        layers: []
      };

      const styleB = {
        version: 8,
        id: 'style-b',
        sources: {},
        layers: []
      };

      const input = {
        styleA,
        styleB
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(false);
      expect(parsed.differences).toHaveLength(1);
      expect(parsed.differences[0].path).toBe('id');
    });
  });

  describe('JSON string input', () => {
    it('should accept JSON strings', async () => {
      const styleA = {
        version: 8,
        sources: {},
        layers: []
      };

      const input = {
        styleA: JSON.stringify(styleA),
        styleB: JSON.stringify(styleA)
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON for style A', async () => {
      const input = {
        styleA: '{invalid json',
        styleB: { version: 8 }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error parsing style A');
    });

    it('should handle invalid JSON for style B', async () => {
      const input = {
        styleA: { version: 8 },
        styleB: '{invalid json'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error parsing style B');
    });
  });

  describe('nested differences', () => {
    it('should detect nested property changes', async () => {
      const styleA = {
        version: 8,
        sources: {
          'mapbox-streets': {
            type: 'vector',
            url: 'mapbox://mapbox.streets'
          }
        }
      };

      const styleB = {
        version: 8,
        sources: {
          'mapbox-streets': {
            type: 'vector',
            url: 'mapbox://mapbox.streets-v8'
          }
        }
      };

      const input = {
        styleA,
        styleB
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.identical).toBe(false);
      expect(
        parsed.differences.some((d: any) =>
          d.path.includes('mapbox-streets.url')
        )
      ).toBe(true);
    });
  });

  describe('summary statistics', () => {
    it('should correctly count difference types', async () => {
      const styleA = {
        version: 8,
        name: 'Old Name',
        sources: {
          removed: { type: 'vector' }
        }
      };

      const styleB = {
        version: 8,
        name: 'New Name',
        sources: {
          added: { type: 'raster' }
        }
      };

      const input = {
        styleA,
        styleB
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary.totalDifferences).toBeGreaterThan(0);
      expect(parsed.summary.added).toBeGreaterThan(0);
      expect(parsed.summary.removed).toBeGreaterThan(0);
      expect(parsed.summary.modified).toBeGreaterThan(0);
    });
  });
});
