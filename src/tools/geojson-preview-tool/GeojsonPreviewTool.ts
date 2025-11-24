// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { createHash } from 'node:crypto';
import { GeoJSON } from 'geojson';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  GeojsonPreviewSchema,
  GeojsonPreviewInput
} from './GeojsonPreviewTool.input.schema.js';
import { isMcpUiEnabled } from '../../config/toolConfig.js';
import type { HttpRequest } from '../../utils/types.js';
import type { ToolExecutionContext } from '../../utils/tracing.js';

export class GeojsonPreviewTool extends MapboxApiBasedTool<
  typeof GeojsonPreviewSchema
> {
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

  constructor(httpRequest: HttpRequest) {
    super({ inputSchema: GeojsonPreviewSchema, httpRequest });
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
  private generateStaticImageUrl(
    geojsonData: GeoJSON,
    accessToken: string
  ): string | null {
    // Create a simplified GeoJSON for the overlay
    // The Static API requires specific format for GeoJSON overlays
    const geojsonString = JSON.stringify(geojsonData);
    const encodedGeoJSON = encodeURIComponent(geojsonString);

    // Use Mapbox Streets style with auto-bounds fitting
    // Format: /styles/v1/{username}/{style_id}/static/geojson({geojson})/auto/{width}x{height}
    // Using 800x600 without @2x to reduce image size for better iframe display
    const staticImageUrl =
      `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
      `geojson(${encodedGeoJSON})/auto/800x600` +
      `?access_token=${accessToken}`;

    // Check if URL is too long (browsers typically limit to ~8192 chars)
    if (staticImageUrl.length > 8000) {
      return null; // Fallback to geojson.io for large GeoJSON
    }

    return staticImageUrl;
  }

  protected async execute(
    input: GeojsonPreviewInput,
    accessToken: string,
    _context: ToolExecutionContext
  ): Promise<CallToolResult> {
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

      // Build content array with URL
      const content: CallToolResult['content'] = [
        {
          type: 'text',
          text: geojsonIOUrl
        }
      ];

      // Conditionally add MCP-UI resource if enabled
      if (isMcpUiEnabled()) {
        // Create content-addressable URI using hash of GeoJSON
        // This enables client-side caching - same GeoJSON = same URI
        const contentHash = createHash('md5')
          .update(geojsonString)
          .digest('hex')
          .substring(0, 16); // Use first 16 chars for brevity

        // Try to generate a Mapbox Static Image URL
        const staticImageUrl = this.generateStaticImageUrl(
          geojsonData,
          accessToken
        );

        if (staticImageUrl) {
          // Use Mapbox Static Images API - embeds as an image
          const uiResource = createUIResource({
            uri: `ui://mapbox/geojson-preview/${contentHash}`,
            content: {
              type: 'externalUrl',
              iframeUrl: staticImageUrl
            },
            encoding: 'text',
            uiMetadata: {
              'preferred-frame-size': ['800px', '600px']
            }
          });
          content.push(uiResource);
        }
        // Note: For large GeoJSON that exceeds URL limits, we skip the MCP-UI resource
        // and the user can still use the geojson.io URL from the text response
      }

      return {
        isError: false,
        content
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
