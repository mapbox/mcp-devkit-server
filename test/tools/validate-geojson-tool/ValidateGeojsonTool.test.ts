// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidateGeojsonTool } from '../../../src/tools/validate-geojson-tool/ValidateGeojsonTool.js';

describe('ValidateGeojsonTool', () => {
  let tool: ValidateGeojsonTool;

  beforeEach(() => {
    tool = new ValidateGeojsonTool();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('validate_geojson_tool');
      expect(tool.description).toBe(
        'Validates GeoJSON objects for correctness, checking structure, coordinates, and geometry types'
      );
    });

    it('should have correct annotations', () => {
      expect(tool.annotations).toEqual({
        title: 'Validate GeoJSON Tool',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      });
    });
  });

  describe('valid GeoJSON', () => {
    it('should validate a valid Point', async () => {
      const input = {
        geojson: {
          type: 'Point',
          coordinates: [102.0, 0.5]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.statistics.type).toBe('Point');
      expect(parsed.statistics.geometryTypes).toEqual(['Point']);
      expect(parsed.statistics.bbox).toEqual([102.0, 0.5, 102.0, 0.5]);
    });

    it('should validate a valid LineString', async () => {
      const input = {
        geojson: {
          type: 'LineString',
          coordinates: [
            [102.0, 0.0],
            [103.0, 1.0],
            [104.0, 0.0],
            [105.0, 1.0]
          ]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.statistics.type).toBe('LineString');
    });

    it('should validate a valid Polygon with closed ring', async () => {
      const input = {
        geojson: {
          type: 'Polygon',
          coordinates: [
            [
              [100.0, 0.0],
              [101.0, 0.0],
              [101.0, 1.0],
              [100.0, 1.0],
              [100.0, 0.0]
            ]
          ]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.warnings).toHaveLength(0);
      expect(parsed.statistics.type).toBe('Polygon');
    });

    it('should validate a valid Feature', async () => {
      const input = {
        geojson: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [102.0, 0.5]
          },
          properties: {
            name: 'Test Point'
          }
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.statistics.featureCount).toBe(1);
    });

    it('should validate a valid FeatureCollection', async () => {
      const input = {
        geojson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [102.0, 0.5]
              },
              properties: { name: 'Point 1' }
            },
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [102.0, 0.0],
                  [103.0, 1.0]
                ]
              },
              properties: { name: 'Line 1' }
            }
          ]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.statistics.featureCount).toBe(2);
      expect(parsed.statistics.geometryTypes).toContain('Point');
      expect(parsed.statistics.geometryTypes).toContain('LineString');
    });

    it('should validate a GeometryCollection', async () => {
      const input = {
        geojson: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'Point',
              coordinates: [100.0, 0.0]
            },
            {
              type: 'LineString',
              coordinates: [
                [101.0, 0.0],
                [102.0, 1.0]
              ]
            }
          ]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
    });

    it('should accept JSON string input', async () => {
      const input = {
        geojson: JSON.stringify({
          type: 'Point',
          coordinates: [102.0, 0.5]
        })
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });
  });

  describe('invalid GeoJSON structure', () => {
    it('should detect missing type property', async () => {
      const input = {
        geojson: JSON.stringify({
          coordinates: [102.0, 0.5]
        })
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors).toHaveLength(1);
      expect(parsed.errors[0].message).toContain(
        'Missing required "type" property'
      );
    });

    it('should detect invalid GeoJSON type', async () => {
      const input = {
        geojson: {
          type: 'InvalidType',
          coordinates: [102.0, 0.5]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain('Invalid GeoJSON type');
    });

    it('should detect Feature missing geometry property', async () => {
      const input = {
        geojson: {
          type: 'Feature',
          properties: {}
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain(
        'Feature missing "geometry" property'
      );
    });

    it('should warn about Feature missing properties', async () => {
      const input = {
        geojson: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [102.0, 0.5]
          }
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings[0].message).toContain(
        'Feature missing "properties" property'
      );
    });

    it('should detect FeatureCollection missing features array', async () => {
      const input = {
        geojson: {
          type: 'FeatureCollection'
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain(
        'FeatureCollection missing "features" array'
      );
    });

    it('should warn about empty FeatureCollection', async () => {
      const input = {
        geojson: {
          type: 'FeatureCollection',
          features: []
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings[0].message).toContain(
        'FeatureCollection has no features'
      );
    });
  });

  describe('coordinate validation', () => {
    it('should detect Point with missing coordinates', async () => {
      const input = {
        geojson: {
          type: 'Point'
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain(
        'missing "coordinates" property'
      );
    });

    it('should detect invalid position (not an array)', async () => {
      const input = {
        geojson: {
          type: 'Point',
          coordinates: 'invalid'
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain('must be an array');
    });

    it('should detect position with insufficient coordinates', async () => {
      const input = {
        geojson: {
          type: 'Point',
          coordinates: [102.0]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain(
        'must have at least 2 elements'
      );
    });

    it('should detect non-numeric coordinates', async () => {
      const input = {
        geojson: {
          type: 'Point',
          coordinates: ['102.0', '0.5']
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain('coordinates must be numbers');
    });

    it('should warn about longitude out of range', async () => {
      const input = {
        geojson: {
          type: 'Point',
          coordinates: [200.0, 0.0]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings[0].message).toContain('Longitude');
      expect(parsed.warnings[0].message).toContain('outside valid range');
    });

    it('should warn about latitude out of range', async () => {
      const input = {
        geojson: {
          type: 'Point',
          coordinates: [0.0, 100.0]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings[0].message).toContain('Latitude');
      expect(parsed.warnings[0].message).toContain('outside valid range');
    });

    it('should detect LineString with too few positions', async () => {
      const input = {
        geojson: {
          type: 'LineString',
          coordinates: [[102.0, 0.0]]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(
        parsed.errors.some((e: any) =>
          e.message.includes('must have at least 2 positions')
        )
      ).toBe(true);
    });

    it('should detect Polygon with too few positions', async () => {
      const input = {
        geojson: {
          type: 'Polygon',
          coordinates: [
            [
              [100.0, 0.0],
              [101.0, 0.0],
              [100.0, 1.0]
            ]
          ]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain(
        'must have at least 4 positions'
      );
    });

    it('should warn about unclosed Polygon ring', async () => {
      const input = {
        geojson: {
          type: 'Polygon',
          coordinates: [
            [
              [100.0, 0.0],
              [101.0, 0.0],
              [101.0, 1.0],
              [100.0, 1.0]
            ]
          ]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings[0].message).toContain(
        'Polygon ring is not closed'
      );
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON string', async () => {
      const input = {
        geojson: '{invalid json'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error parsing GeoJSON');
    });
  });

  describe('statistics calculation', () => {
    it('should calculate bounding box correctly', async () => {
      const input = {
        geojson: {
          type: 'LineString',
          coordinates: [
            [100.0, 0.0],
            [101.0, 1.0],
            [99.0, -1.0]
          ]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.statistics.bbox).toEqual([99.0, -1.0, 101.0, 1.0]);
    });

    it('should count features correctly', async () => {
      const input = {
        geojson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [0, 0] },
              properties: {}
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [1, 1] },
              properties: {}
            },
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [2, 2] },
              properties: {}
            }
          ]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.statistics.featureCount).toBe(3);
    });

    it('should collect geometry types correctly', async () => {
      const input = {
        geojson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [0, 0] },
              properties: {}
            },
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [
                  [0, 0],
                  [1, 1]
                ]
              },
              properties: {}
            },
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [0, 0],
                    [1, 0],
                    [1, 1],
                    [0, 1],
                    [0, 0]
                  ]
                ]
              },
              properties: {}
            }
          ]
        }
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.statistics.geometryTypes).toContain('Point');
      expect(parsed.statistics.geometryTypes).toContain('LineString');
      expect(parsed.statistics.geometryTypes).toContain('Polygon');
    });
  });
});
