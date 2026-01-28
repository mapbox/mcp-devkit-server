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
import { isMcpUiEnabled } from '../../config/toolConfig.js';

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
    // The Static API requires specific format for GeoJSON overlays
    const geojsonString = JSON.stringify(geojsonData);
    const encodedGeoJSON = encodeURIComponent(geojsonString);

    // Use Mapbox Streets style with auto-bounds fitting
    // Format: /styles/v1/{username}/{style_id}/static/geojson({geojson})/auto/{width}x{height}@2x
    const staticImageUrl =
      `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
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

      // Extract GeoJSON metadata for descriptive text
      const geojsonType = (geojsonData as { type: string }).type;
      let featureInfo = '';
      if (geojsonType === 'FeatureCollection') {
        const fc = geojsonData as {
          features: Array<{ geometry: { type: string } }>;
        };
        const featureCount = fc.features.length;
        const geometryTypes = [
          ...new Set(fc.features.map((f) => f.geometry.type))
        ];
        featureInfo = `Features: ${featureCount} (${geometryTypes.join(', ')})`;
      } else if (geojsonType === 'Feature') {
        const feature = geojsonData as { geometry: { type: string } };
        featureInfo = `Geometry: ${feature.geometry.type}`;
      } else {
        featureInfo = `Geometry: ${geojsonType}`;
      }

      // Build descriptive text with GeoJSON metadata for better client compatibility
      // This ensures all MCP clients can display meaningful information
      const textDescription = [
        'GeoJSON preview generated successfully.',
        `Type: ${geojsonType}`,
        featureInfo,
        `Preview URL: ${geojsonIOUrl}`
      ].join('\n');

      // Build content array with text first (for compatibility)
      const content: CallToolResult['content'] = [
        {
          type: 'text',
          text: textDescription
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
        const staticImageUrl = this.generateStaticImageUrl(geojsonData);

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
              'preferred-frame-size': ['1000px', '700px']
            }
          });
          content.push(uiResource);
        } else {
          // Fallback to geojson.io URL (for large GeoJSON or when no token)
          // Note: geojson.io may not work in iframes due to X-Frame-Options
          const uiResource = createUIResource({
            uri: `ui://mapbox/geojson-preview/${contentHash}`,
            content: {
              type: 'externalUrl',
              iframeUrl: geojsonIOUrl
            },
            encoding: 'text',
            uiMetadata: {
              'preferred-frame-size': ['1000px', '700px']
            }
          });
          content.push(uiResource);
        }
      }

      // Add MCP Apps metadata (new pattern for broader client compatibility)
      const result: CallToolResult = {
        content,
        isError: false
      };

      // Add ui:// resource URI for MCP Apps pattern
      // This works alongside MCP-UI for backward compatibility
      if (isMcpUiEnabled()) {
        // Create content-addressable URI using hash of GeoJSON
        const contentHash = createHash('md5')
          .update(geojsonString)
          .digest('hex')
          .substring(0, 16);

        result._meta = {
          ui: {
            resourceUri: `ui://mapbox/geojson-preview/${contentHash}`
          }
        };
      }

      return result;
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
