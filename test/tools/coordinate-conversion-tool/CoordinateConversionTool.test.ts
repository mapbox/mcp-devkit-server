// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { CoordinateConversionTool } from '../../../src/tools/coordinate-conversion-tool/CoordinateConversionTool.js';

describe('CoordinateConversionTool', () => {
  let tool: CoordinateConversionTool;

  beforeEach(() => {
    tool = new CoordinateConversionTool();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('coordinate_conversion_tool');
      expect(tool.description).toBe(
        'Converts coordinates between WGS84 (longitude/latitude) and EPSG:3857 (Web Mercator) coordinate systems'
      );
    });

    it('should have correct input schema', async () => {
      const { CoordinateConversionSchema } = await import(
        '../../../src/tools/coordinate-conversion-tool/CoordinateConversionTool.input.schema.js'
      );
      expect(CoordinateConversionSchema).toBeDefined();
    });
  });

  describe('WGS84 to EPSG:3857 conversion', () => {
    it('should convert longitude/latitude to Web Mercator correctly', async () => {
      const input = {
        coordinates: [-74.006, 40.7128], // NYC coordinates
        from: 'wgs84' as const,
        to: 'epsg3857' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(
        (result.content[0] as { type: 'text'; text: string }).text
      );
      expect(parsed.input).toEqual([-74.006, 40.7128]);
      expect(parsed.from).toBe('wgs84');
      expect(parsed.to).toBe('epsg3857');

      // Check that the conversion produced reasonable Web Mercator values
      const [x, y] = parsed.output;
      expect(x).toBeCloseTo(-8238310.24, 0); // Expected X coordinate for NYC
      expect(y).toBeCloseTo(4970071.58, 0); // Expected Y coordinate for NYC
    });

    it('should convert origin (0,0) correctly', async () => {
      const input = {
        coordinates: [0, 0],
        from: 'wgs84' as const,
        to: 'epsg3857' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(
        (result.content[0] as { type: 'text'; text: string }).text
      );
      const [x, y] = parsed.output;
      expect(x).toBeCloseTo(0, 6);
      expect(y).toBeCloseTo(0, 6);
    });

    it('should handle extreme valid latitudes', async () => {
      const input = {
        coordinates: [0, 85.05], // Near maximum valid latitude for Web Mercator
        from: 'wgs84' as const,
        to: 'epsg3857' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(
        (result.content[0] as { type: 'text'; text: string }).text
      );
      const [x, y] = parsed.output;
      expect(x).toBeCloseTo(0, 6);
      expect(y).toBeGreaterThan(19000000); // Should be a very large Y value
    });

    it('should reject invalid longitude values', async () => {
      const input = {
        coordinates: [181, 0], // Invalid longitude
        from: 'wgs84' as const,
        to: 'epsg3857' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Longitude must be between -180 and 180');
    });

    it('should reject invalid latitude values', async () => {
      const input = {
        coordinates: [0, 86], // Invalid latitude for Web Mercator
        from: 'wgs84' as const,
        to: 'epsg3857' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Latitude must be between -85.0511 and 85.0511');
    });
  });

  describe('EPSG:3857 to WGS84 conversion', () => {
    it('should convert Web Mercator to longitude/latitude correctly', async () => {
      const input = {
        coordinates: [-8238310.24, 4970071.58], // NYC in Web Mercator (updated coordinates)
        from: 'epsg3857' as const,
        to: 'wgs84' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(
        (result.content[0] as { type: 'text'; text: string }).text
      );
      const [lon, lat] = parsed.output;
      expect(lon).toBeCloseTo(-74.006, 3);
      expect(lat).toBeCloseTo(40.7128, 3);
    });

    it('should convert origin (0,0) correctly', async () => {
      const input = {
        coordinates: [0, 0],
        from: 'epsg3857' as const,
        to: 'wgs84' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(
        (result.content[0] as { type: 'text'; text: string }).text
      );
      const [lon, lat] = parsed.output;
      expect(lon).toBeCloseTo(0, 6);
      expect(lat).toBeCloseTo(0, 6);
    });

    it('should reject coordinates outside Web Mercator bounds', async () => {
      const earthRadius = 6378137;
      const maxExtent = Math.PI * earthRadius;

      const input = {
        coordinates: [maxExtent + 1, 0], // Outside valid bounds
        from: 'epsg3857' as const,
        to: 'wgs84' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('outside valid Web Mercator range');
    });
  });

  describe('Roundtrip conversions', () => {
    it('should maintain precision in roundtrip conversions', async () => {
      const originalCoords = [-122.4194, 37.7749]; // San Francisco

      // Convert WGS84 -> EPSG:3857
      const toMercator = await tool.run({
        coordinates: originalCoords,
        from: 'wgs84' as const,
        to: 'epsg3857' as const
      });

      const mercatorCoords = JSON.parse(
        (toMercator.content[0] as { type: 'text'; text: string }).text
      ).output;

      // Convert EPSG:3857 -> WGS84
      const backToWgs84 = await tool.run({
        coordinates: mercatorCoords,
        from: 'epsg3857' as const,
        to: 'wgs84' as const
      });

      const finalCoords = JSON.parse(
        (backToWgs84.content[0] as { type: 'text'; text: string }).text
      ).output;

      expect(finalCoords[0]).toBeCloseTo(originalCoords[0], 6);
      expect(finalCoords[1]).toBeCloseTo(originalCoords[1], 6);
    });
  });

  describe('Same coordinate system conversions', () => {
    it('should return original coordinates when from and to are the same', async () => {
      const input = {
        coordinates: [-74.006, 40.7128],
        from: 'wgs84' as const,
        to: 'wgs84' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(
        (result.content[0] as { type: 'text'; text: string }).text
      );
      expect(parsed.input).toEqual([-74.006, 40.7128]);
      expect(parsed.output).toEqual([-74.006, 40.7128]);
      expect(parsed.message).toContain('No conversion needed');
    });
  });

  describe('Input validation', () => {
    it('should require exactly 2 coordinates', async () => {
      const input = {
        coordinates: [1, 2, 3], // Too many coordinates
        from: 'wgs84' as const,
        to: 'epsg3857' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
    });

    it('should require valid coordinate system names', async () => {
      const input = {
        coordinates: [0, 0],
        from: 'invalid' as unknown as 'wgs84' | 'epsg3857',
        to: 'epsg3857' as const
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
    });
  });
});
