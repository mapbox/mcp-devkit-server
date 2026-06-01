// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  GetTilesetSchema,
  GetTilesetInput
} from './GetTilesetTool.input.schema.js';

// Docs: https://docs.mapbox.com/api/maps/mapbox-tiling-service/#retrieve-tileset-information

export class GetTilesetTool extends MapboxApiBasedTool<
  typeof GetTilesetSchema
> {
  readonly name = 'get_tileset_tool';
  readonly description =
    'Retrieve metadata for a single Mapbox tileset by id (`username.id`). Returns information like name, visibility, created/modified timestamps, and bounds. Requires the `tilesets:read` scope.';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: 'Get Mapbox Tileset'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: GetTilesetSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: GetTilesetInput,
    accessToken: string
  ): Promise<CallToolResult> {
    if (!accessToken) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'MAPBOX_ACCESS_TOKEN is not set' }]
      };
    }

    if (!/^[A-Za-z0-9-]+\.[A-Za-z0-9-]+$/.test(input.tileset_id)) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Invalid tileset_id "${input.tileset_id}". Expected "username.id" format.`
          }
        ]
      };
    }

    const url = new URL(
      `${MapboxApiBasedTool.mapboxApiEndpoint}tilesets/v1/${input.tileset_id}`
    );
    url.searchParams.set('access_token', accessToken);

    const response = await this.httpRequest(url.toString(), { method: 'GET' });
    if (!response.ok) {
      return this.handleApiError(response, 'get tileset');
    }

    const data = (await response.json()) as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
      isError: false
    };
  }
}
