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
    'Generate a geojson.io/next URL to visualize GeoJSON data. Returns only the URL link.';
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
        frameDomains: ['https://geojson.io']
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

      // Generate geojson.io/next URL
      const geojsonString = JSON.stringify(geojsonData);
      const encodedGeoJSON = encodeURIComponent(geojsonString);
      const geojsonIOUrl = `https://geojson.io/next/#data=data:application/json,${encodedGeoJSON}`;

      // Use geojson.io/next as the display URL
      const displayUrl = geojsonIOUrl;

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
