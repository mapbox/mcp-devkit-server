// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { GeojsonPreviewTool } from '../../../src/tools/geojson-preview-tool/GeojsonPreviewTool.js';

describe('GeojsonPreviewTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const tool = new GeojsonPreviewTool();
      expect(tool.name).toBe('geojson_preview_tool');
      expect(tool.description).toBe(
        'Generate a geojson.io URL to visualize GeoJSON data. Returns only the URL link.'
      );
    });

    it('should have correct input schema', async () => {
      const { GeojsonPreviewSchema } = await import(
        '../../../src/tools/geojson-preview-tool/GeojsonPreviewTool.input.schema.js'
      );
      expect(GeojsonPreviewSchema).toBeDefined();
    });
  });

  it('should generate geojson.io URL and MCP-UI resource for Point geometry (default)', async () => {
    const tool = new GeojsonPreviewTool();
    const pointGeoJSON = {
      type: 'Point',
      coordinates: [-122.4194, 37.7749]
    };

    const result = await tool.run({ geojson: JSON.stringify(pointGeoJSON) });

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(2);
    expect(result.content[0].type).toBe('text');
    const content = result.content[0];
    if (content.type === 'text') {
      // Should return Mapbox Static Images URL or geojson.io fallback
      expect(content.text).toMatch(
        /^https:\/\/(api\.mapbox\.com\/styles\/|geojson\.io)/
      );
    }

    // Verify MCP-UI resource is included by default
    // Could be either Mapbox Static Images API or geojson.io (fallback)
    expect(result.content[1]).toMatchObject({
      type: 'resource',
      resource: {
        uri: expect.stringMatching(/^ui:\/\/mapbox\/geojson-preview\//),
        mimeType: 'text/uri-list',
        text: expect.stringMatching(/^https:\/\//)
      }
    });

    // Verify the iframe URL is either Mapbox Static Images API or geojson.io
    const iframeUrl = (result.content[1] as any).resource.text;
    expect(
      iframeUrl.includes('api.mapbox.com/styles') ||
        iframeUrl.includes('geojson.io')
    ).toBe(true);
  });

  it('returns URL and MCP-UI resource for backward compatibility', async () => {
    const tool = new GeojsonPreviewTool();
    const pointGeoJSON = {
      type: 'Point',
      coordinates: [-122.4194, 37.7749]
    };

    const result = await tool.run({ geojson: JSON.stringify(pointGeoJSON) });

    expect(result.isError).toBe(false);
    // Now returns both URL and MCP-UI resource
    expect(result.content).toHaveLength(2);
    expect(result.content[0].type).toBe('text');
    // Second item is MCP-UI resource
    expect(result.content[1].type).toBe('resource');
  });

  it('should handle GeoJSON as string', async () => {
    const tool = new GeojsonPreviewTool();
    const featureGeoJSON = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749]
      },
      properties: { name: 'San Francisco' }
    };
    const geoJSONString = JSON.stringify(featureGeoJSON);

    const result = await tool.run({ geojson: geoJSONString });

    expect(result.isError).toBe(false);
    // Now returns both URL and MCP-UI resource
    expect(result.content).toHaveLength(2);
    const content = result.content[0];
    if (content.type === 'text') {
      // Should return Mapbox Static Images URL or geojson.io fallback
      expect(content.text).toMatch(
        /^https:\/\/(api\.mapbox\.com\/styles\/|geojson\.io)/
      );
    }
  });

  it('should handle FeatureCollection', async () => {
    const tool = new GeojsonPreviewTool();
    const featureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] },
          properties: { name: 'Point 1' }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-122.4194, 37.7749],
              [-122.4094, 37.7849]
            ]
          },
          properties: { name: 'Line 1' }
        }
      ]
    };

    const result = await tool.run({
      geojson: JSON.stringify(featureCollection)
    });

    expect(result.isError).toBe(false);
    // Now returns both URL and MCP-UI resource
    expect(result.content).toHaveLength(2);
    const content = result.content[0];
    if (content.type === 'text') {
      // Should return Mapbox Static Images URL or geojson.io fallback
      expect(content.text).toMatch(
        /^https:\/\/(api\.mapbox\.com\/styles\/|geojson\.io)/
      );
    }
  });

  it('should handle invalid JSON string gracefully', async () => {
    const tool = new GeojsonPreviewTool();
    const invalidJSON = '{ invalid json }';

    const result = await tool.run({ geojson: invalidJSON });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: "GeoJSON processing failed: Expected property name or '}' in JSON at position 2 (line 1 column 3)"
    });
  });

  it('should handle invalid GeoJSON structure gracefully', async () => {
    const tool = new GeojsonPreviewTool();
    const invalidGeoJSON = {
      type: 'InvalidType',
      coordinates: [1, 2, 3]
    };

    const result = await tool.run({ geojson: JSON.stringify(invalidGeoJSON) });

    // Now validates GeoJSON structure, should return error for invalid types
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: 'GeoJSON processing failed: Invalid GeoJSON structure'
    });
  });

  it('should generate proper URL encoding', async () => {
    const tool = new GeojsonPreviewTool();
    const geoJSON = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749]
      },
      properties: { name: 'Test & Special Characters!' }
    };

    const result = await tool.run({ geojson: JSON.stringify(geoJSON) });

    expect(result.isError).toBe(false);
    // Now returns both URL and MCP-UI resource
    expect(result.content).toHaveLength(2);
    const content = result.content[0];
    if (content.type === 'text') {
      // Should return Mapbox Static Images URL or geojson.io fallback
      expect(content.text).toMatch(
        /^https:\/\/(api\.mapbox\.com\/styles\/|geojson\.io)/
      );
    }
  });
});
