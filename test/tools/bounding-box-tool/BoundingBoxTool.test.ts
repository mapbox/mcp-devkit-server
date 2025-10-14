// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { BoundingBoxTool } from '../../../src/tools/bounding-box-tool/BoundingBoxTool.js';

type TextContent = { type: 'text'; text: string };

describe('BoundingBoxTool', () => {
  let tool: BoundingBoxTool;

  beforeEach(() => {
    tool = new BoundingBoxTool();
  });

  describe('execute', () => {
    it('should calculate bounding box for a Point', async () => {
      const geojson = {
        type: 'Point',
        coordinates: [-73.9857, 40.7484]
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      expect(JSON.parse(textContent.text)).toEqual([
        -73.9857, 40.7484, -73.9857, 40.7484
      ]);
    });

    it('should calculate bounding box for a Point with string input', async () => {
      const geojson = JSON.stringify({
        type: 'Point',
        coordinates: [-73.9857, 40.7484]
      });

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      expect(JSON.parse(textContent.text)).toEqual([
        -73.9857, 40.7484, -73.9857, 40.7484
      ]);
    });

    it('should calculate bounding box for a LineString', async () => {
      const geojson = {
        type: 'LineString',
        coordinates: [
          [-73.9857, 40.7484],
          [-73.9889, 40.7549],
          [-73.9919, 40.7614]
        ]
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      expect(JSON.parse(textContent.text)).toEqual([
        -73.9919, 40.7484, -73.9857, 40.7614
      ]);
    });

    it('should calculate bounding box for a Polygon', async () => {
      const geojson = {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9857, 40.7484],
            [-73.9889, 40.7549],
            [-73.9919, 40.7614],
            [-73.9887, 40.7549],
            [-73.9857, 40.7484]
          ]
        ]
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      expect(JSON.parse(textContent.text)).toEqual([
        -73.9919, 40.7484, -73.9857, 40.7614
      ]);
    });

    it('should calculate bounding box for a FeatureCollection', async () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-73.9857, 40.7484]
            },
            properties: {}
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-74.006, 40.7128]
            },
            properties: {}
          }
        ]
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      expect(JSON.parse(textContent.text)).toEqual([
        -74.006, 40.7128, -73.9857, 40.7484
      ]);
    });

    it('should calculate bounding box for a MultiPoint', async () => {
      const geojson = {
        type: 'MultiPoint',
        coordinates: [
          [-73.9857, 40.7484],
          [-74.006, 40.7128],
          [-73.9352, 40.7306]
        ]
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      expect(JSON.parse(textContent.text)).toEqual([
        -74.006, 40.7128, -73.9352, 40.7484
      ]);
    });

    it('should calculate bounding box for a MultiPolygon', async () => {
      const geojson = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0]
            ]
          ],
          [
            [
              [2, 2],
              [2, 3],
              [3, 3],
              [3, 2],
              [2, 2]
            ]
          ]
        ]
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      expect(JSON.parse(textContent.text)).toEqual([0, 0, 3, 3]);
    });

    it('should calculate bounding box for a GeometryCollection', async () => {
      const geojson = {
        type: 'GeometryCollection',
        geometries: [
          {
            type: 'Point',
            coordinates: [-73.9857, 40.7484]
          },
          {
            type: 'LineString',
            coordinates: [
              [-74.006, 40.7128],
              [-73.9352, 40.7306]
            ]
          }
        ]
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      expect(JSON.parse(textContent.text)).toEqual([
        -74.006, 40.7128, -73.9352, 40.7484
      ]);
    });

    it('should handle Feature with null geometry', async () => {
      const geojson = {
        type: 'Feature',
        geometry: null,
        properties: {}
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain(
        'No valid coordinates found in the GeoJSON file'
      );
    });

    it('should throw error for invalid JSON string', async () => {
      const geojson = 'invalid json';

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should throw error for unsupported GeoJSON type', async () => {
      const geojson = {
        type: 'UnsupportedType',
        coordinates: []
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Unsupported GeoJSON type: UnsupportedType');
    });

    it('should handle empty FeatureCollection', async () => {
      const geojson = {
        type: 'FeatureCollection',
        features: []
      };

      const result = await tool.run({ geojson });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain(
        'No valid coordinates found in the GeoJSON file'
      );
    });
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('bounding_box_tool');
      expect(tool.description).toBe(
        'Calculates bounding box of given GeoJSON content, returns as [minX, minY, maxX, maxY]'
      );
    });

    it('should have correct input schema', async () => {
      const { BoundingBoxSchema } = await import(
        '../../../src/tools/bounding-box-tool/BoundingBoxTool.input.schema.js'
      );
      expect(BoundingBoxSchema).toBeDefined();
      expect(BoundingBoxSchema.shape.geojson).toBeDefined();
    });
  });
});
