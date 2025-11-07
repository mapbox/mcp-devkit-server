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

        const uiResource = createUIResource({
          uri: `ui://mapbox/geojson-preview/${contentHash}`,
          content: {
            type: 'externalUrl',
            iframeUrl: geojsonIOUrl
          },
          encoding: 'text'
        });
        content.push(uiResource);
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
