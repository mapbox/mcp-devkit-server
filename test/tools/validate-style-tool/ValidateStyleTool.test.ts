// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidateStyleTool } from '../../../src/tools/validate-style-tool/ValidateStyleTool.js';

describe('ValidateStyleTool', () => {
  let tool: ValidateStyleTool;

  beforeEach(() => {
    tool = new ValidateStyleTool();
  });

  it('should have correct tool metadata', () => {
    expect(tool.name).toBe('validate_style_tool');
    expect(tool.description).toBeTruthy();
    expect(tool.annotations).toBeDefined();
  });

  it('should validate a valid minimal style', async () => {
    const validStyle = {
      version: 8,
      sources: {
        'my-source': {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        }
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: { 'background-color': '#000000' }
        }
      ]
    };

    const result = await tool.run({ style: validStyle });

    expect(result.isError).toBe(false);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.valid).toBe(true);
    expect(parsedResponse.errors).toHaveLength(0);
    expect(parsedResponse.summary.layerCount).toBe(1);
    expect(parsedResponse.summary.sourceCount).toBe(1);
  });

  it('should detect missing version', async () => {
    const invalidStyle = {
      sources: {},
      layers: []
    };

    const result = await tool.run({ style: invalidStyle });

    expect(result.isError).toBe(false);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.valid).toBe(false);
    expect(parsedResponse.errors).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('missing required property "version"')
      })
    );
  });

  it('should detect missing layers array', async () => {
    const invalidStyle = {
      version: 8,
      sources: {}
    };

    const result = await tool.run({ style: invalidStyle });

    expect(result.isError).toBe(false);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.valid).toBe(false);
    expect(parsedResponse.errors).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('missing required property "layers"')
      })
    );
  });

  it('should detect invalid layer type', async () => {
    const invalidStyle = {
      version: 8,
      sources: {},
      layers: [
        {
          id: 'test-layer',
          type: 'invalid-type',
          source: 'test-source'
        }
      ]
    };

    const result = await tool.run({ style: invalidStyle });

    expect(result.isError).toBe(false);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.valid).toBe(false);
    expect(parsedResponse.errors).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('"invalid-type" found')
      })
    );
  });

  it('should detect duplicate layer IDs', async () => {
    const invalidStyle = {
      version: 8,
      sources: {
        'test-source': {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        }
      },
      layers: [
        {
          id: 'duplicate-id',
          type: 'fill',
          source: 'test-source'
        },
        {
          id: 'duplicate-id',
          type: 'line',
          source: 'test-source'
        }
      ]
    };

    const result = await tool.run({ style: invalidStyle });

    expect(result.isError).toBe(false);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.valid).toBe(false);
    expect(parsedResponse.errors).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('duplicate layer id "duplicate-id"')
      })
    );
  });

  it('should detect non-existent source reference', async () => {
    const invalidStyle = {
      version: 8,
      sources: {},
      layers: [
        {
          id: 'test-layer',
          type: 'fill',
          source: 'non-existent-source'
        }
      ]
    };

    const result = await tool.run({ style: invalidStyle });

    expect(result.isError).toBe(false);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.valid).toBe(false);
    expect(parsedResponse.errors).toContainEqual(
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining(
          'source "non-existent-source" not found'
        )
      })
    );
  });

  it('should accept style as JSON string', async () => {
    const validStyle = {
      version: 8,
      sources: {},
      layers: []
    };

    const result = await tool.run({ style: JSON.stringify(validStyle) });

    expect(result.isError).toBe(false);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse).toHaveProperty('valid');
    expect(parsedResponse).toHaveProperty('errors');
  });

  it('should return error for invalid JSON string', async () => {
    const result = await tool.run({ style: '{ invalid json }' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error parsing style JSON');
  });

  it('should provide warnings for missing sprite and glyphs', async () => {
    const style = {
      version: 8,
      sources: {},
      layers: []
    };

    const result = await tool.run({ style });

    expect(result.isError).toBe(false);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.info).toContainEqual(
      expect.objectContaining({
        severity: 'info',
        message: 'No sprite URL defined'
      })
    );
    expect(parsedResponse.info).toContainEqual(
      expect.objectContaining({
        severity: 'info',
        message: 'No glyphs URL defined'
      })
    );
  });

  it('should include summary information', async () => {
    const style = {
      version: 8,
      sources: {
        source1: { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' },
        source2: {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        }
      },
      layers: [
        { id: 'layer1', type: 'background' },
        { id: 'layer2', type: 'fill', source: 'source2' }
      ],
      sprite: 'mapbox://sprites/mapbox/streets-v11',
      glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf'
    };

    const result = await tool.run({ style });

    expect(result.isError).toBe(false);
    const parsedResponse = JSON.parse(result.content[0].text);
    expect(parsedResponse.summary).toEqual({
      version: 8,
      layerCount: 2,
      sourceCount: 2,
      hasSprite: true,
      hasGlyphs: true
    });
  });

  describe('regression: issue #123 - zoom expression placement', () => {
    it('should reject a zoom interpolation nested inside a case (previously a false negative)', async () => {
      const style = {
        version: 8,
        sources: {
          s: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          }
        },
        layers: [
          {
            id: 'l',
            type: 'circle',
            source: 's',
            paint: {
              'circle-opacity': [
                'case',
                ['==', ['get', 'inside'], true],
                ['interpolate', ['linear'], ['zoom'], 4, 0.4, 6, 0.28, 8, 0],
                ['interpolate', ['linear'], ['zoom'], 4, 0.2, 6, 0.14, 8, 0]
              ]
            }
          }
        ]
      };

      const result = await tool.run({ style });

      expect(result.isError).toBe(false);
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.valid).toBe(false);
      expect(
        parsedResponse.errors.some((e: any) =>
          e.message.includes(
            '"zoom" expression may only be used as input to a top-level'
          )
        )
      ).toBe(true);
    });

    it('should accept the same style with a top-level (non-nested) zoom interpolation', async () => {
      const style = {
        version: 8,
        sources: {
          s: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          }
        },
        layers: [
          {
            id: 'l',
            type: 'circle',
            source: 's',
            paint: {
              'circle-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                4,
                0.4,
                6,
                0.28,
                8,
                0
              ]
            }
          }
        ]
      };

      const result = await tool.run({ style });

      expect(result.isError).toBe(false);
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.valid).toBe(true);
      expect(parsedResponse.errors).toHaveLength(0);
    });
  });

  describe('deeply nested (adversarial) expressions', () => {
    it('should reject a style with an expression exceeding the max nesting depth instead of recursing unbounded', async () => {
      let expression: any = ['get', 'value'];
      for (let i = 0; i < 5000; i++) {
        expression = ['+', expression, 1];
      }
      const style = {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'l',
            type: 'background',
            paint: { 'background-opacity': expression }
          }
        ]
      };

      const start = Date.now();
      const result = await tool.run({ style });
      expect(Date.now() - start).toBeLessThan(1000);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('exceeds maximum nesting depth');
    });
  });
});
