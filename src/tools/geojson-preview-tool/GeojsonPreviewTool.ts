// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { createHash } from 'node:crypto';
import { GeoJSON } from 'geojson';
import { BaseTool } from '../BaseTool.js';
import {
  GeojsonPreviewSchema,
  GeojsonPreviewInput
} from './GeojsonPreviewTool.input.schema.js';

export class GeojsonPreviewTool extends BaseTool<typeof GeojsonPreviewSchema> {
  name = 'geojson_preview_tool';
  description =
    'Generate a geojson.io URL to visualize GeoJSON data. Returns only the URL link.';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: 'Preview GeoJSON Data Tool'
  };

  readonly meta = {
    ui: {
      resourceUri: 'ui://mapbox/geojson-preview/index.html',
      csp: {
        connectDomains: ['https://api.mapbox.com'],
        resourceDomains: ['https://api.mapbox.com']
      }
    }
  };

  constructor() {
    super({ inputSchema: GeojsonPreviewSchema });
  }

  private isValidGeoJSON(data: unknown): data is GeoJSON {
    if (
      !data ||
      typeof data !== 'object' ||
      !(data as Record<string, unknown>).type
    )
      return false;

    const validTypes = [
      'Point',
      'LineString',
      'Polygon',
      'MultiPoint',
      'MultiLineString',
      'MultiPolygon',
      'GeometryCollection',
      'Feature',
      'FeatureCollection'
    ];
    return validTypes.includes(
      (data as Record<string, unknown>).type as string
    );
  }

  /**
   * Generate a Mapbox Static Images API URL for the GeoJSON data
   * @see https://docs.mapbox.com/api/maps/static-images/
   */
  private generateStaticImageUrl(geojsonData: GeoJSON): string | null {
    const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      return null; // Fallback to geojson.io if no token available
    }

    // Create a simplified GeoJSON for the overlay
    const geojsonString = JSON.stringify(geojsonData);
    const encodedGeoJSON = encodeURIComponent(geojsonString);

    // Use Mapbox Light basemap style with auto-bounds fitting and retina display (@2x)
    // Format: /styles/v1/{username}/{style_id}/static/geojson({geojson})/auto/{width}x{height}@2x
    const staticImageUrl =
      `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/` +
      `geojson(${encodedGeoJSON})/auto/1000x700@2x` +
      `?access_token=${accessToken}`;

    // Check if URL is too long (browsers typically limit to ~8192 chars)
    if (staticImageUrl.length > 8000) {
      return null; // Fallback to geojson.io for large GeoJSON
    }

    return staticImageUrl;
  }

  protected async execute(input: GeojsonPreviewInput): Promise<CallToolResult> {
    try {
      // Parse and validate JSON format
      const geojsonData = JSON.parse(input.geojson);

      // Validate GeoJSON structure
      if (!this.isValidGeoJSON(geojsonData)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'GeoJSON processing failed: Invalid GeoJSON structure'
            }
          ]
        };
      }

      // Generate geojson.io URL
      const geojsonString = JSON.stringify(geojsonData);
      const encodedGeoJSON = encodeURIComponent(geojsonString);
      const geojsonIOUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJSON}`;

      // Try to generate a Mapbox Static Image URL
      // The MCP App will fetch this and convert to blob URL to work with CSP
      const staticImageUrl = this.generateStaticImageUrl(geojsonData);

      // Use static image URL if available (MCP App will handle CSP via blob URL),
      // otherwise fall back to geojson.io
      const displayUrl = staticImageUrl || geojsonIOUrl;

      // Build content array with URL
      const content: CallToolResult['content'] = [
        {
          type: 'text',
          text: displayUrl
        }
      ];

      // Add MCP-UI resource (for legacy MCP-UI clients)
      // Create content-addressable URI using hash of GeoJSON
      // This enables client-side caching - same GeoJSON = same URI
      const contentHash = createHash('md5')
        .update(geojsonString)
        .digest('hex')
        .substring(0, 16); // Use first 16 chars for brevity

      // Use the same URL for MCP-UI as we returned in text content
      const uiResource = createUIResource({
        uri: `ui://mapbox/geojson-preview/${contentHash}`,
        content: {
          type: 'externalUrl',
          iframeUrl: displayUrl
        },
        encoding: 'text',
        uiMetadata: {
          'preferred-frame-size': ['1000px', '700px']
        }
      });
      content.push(uiResource);

      return {
        content,
        isError: false
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `GeoJSON processing failed: ${errorMessage}`
          }
        ]
      };
    }
  }
}
