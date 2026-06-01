// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  GetTilesetRecipeSchema,
  GetTilesetRecipeInput
} from './GetTilesetRecipeTool.input.schema.js';

// Docs: https://docs.mapbox.com/api/maps/mapbox-tiling-service/#retrieve-a-tilesets-recipe

export class GetTilesetRecipeTool extends MapboxApiBasedTool<
  typeof GetTilesetRecipeSchema
> {
  readonly name = 'get_tileset_recipe_tool';
  readonly description =
    'Retrieve the MTS recipe JSON for a tileset. The recipe defines layers, sources, and processing steps. Useful for inspecting how a tileset was built or as a template for creating a new tileset. Requires the `tilesets:read` scope.';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: 'Get Mapbox Tileset Recipe'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: GetTilesetRecipeSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: GetTilesetRecipeInput,
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
      `${MapboxApiBasedTool.mapboxApiEndpoint}tilesets/v1/${input.tileset_id}/recipe`
    );
    url.searchParams.set('access_token', accessToken);

    const response = await this.httpRequest(url.toString(), { method: 'GET' });
    if (!response.ok) {
      return this.handleApiError(response, 'get tileset recipe');
    }

    const data = (await response.json()) as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
      isError: false
    };
  }
}
