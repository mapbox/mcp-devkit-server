// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import {
  ListTilesetsSchema,
  ListTilesetsInput
} from './ListTilesetsTool.input.schema.js';

// Docs: https://docs.mapbox.com/api/maps/mapbox-tiling-service/#list-tilesets

export class ListTilesetsTool extends MapboxApiBasedTool<
  typeof ListTilesetsSchema
> {
  readonly name = 'list_tilesets_tool';
  readonly description =
    'List Mapbox tilesets for the authenticated user. Supports filtering by type (raster/vector), visibility (public/private), sorting, and pagination. Requires the `tilesets:list` scope on the access token.';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: 'List Mapbox Tilesets'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: ListTilesetsSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: ListTilesetsInput,
    accessToken: string
  ): Promise<CallToolResult> {
    if (!accessToken) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'MAPBOX_ACCESS_TOKEN is not set' }]
      };
    }

    let userName: string;
    try {
      userName = getUserNameFromToken(accessToken);
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Invalid access token: ${(error as Error).message}`
          }
        ]
      };
    }

    const url = new URL(
      `${MapboxApiBasedTool.mapboxApiEndpoint}tilesets/v1/${userName}`
    );
    url.searchParams.set('access_token', accessToken);
    if (input.type) url.searchParams.set('type', input.type);
    if (input.visibility) url.searchParams.set('visibility', input.visibility);
    if (input.sortby) url.searchParams.set('sortby', input.sortby);
    if (input.limit !== undefined)
      url.searchParams.set('limit', String(input.limit));
    if (input.start) url.searchParams.set('start', input.start);

    const response = await this.httpRequest(url.toString(), { method: 'GET' });
    if (!response.ok) {
      return this.handleApiError(response, 'list tilesets');
    }

    const data = (await response.json()) as unknown;
    const linkHeader = response.headers.get('Link');
    const nextStart = linkHeader ? extractNextStart(linkHeader) : undefined;

    const tilesets = Array.isArray(data) ? data : [];
    const summary =
      tilesets.length === 0
        ? 'No tilesets found.'
        : `Found ${tilesets.length} tileset${tilesets.length === 1 ? '' : 's'}.` +
          (nextStart ? ` More available; next_start: ${nextStart}` : '');

    return {
      content: [
        { type: 'text', text: summary },
        {
          type: 'text',
          text: JSON.stringify({ tilesets, next_start: nextStart }, null, 2)
        }
      ],
      structuredContent: {
        tilesets,
        count: tilesets.length,
        next_start: nextStart
      },
      isError: false
    };
  }
}

function extractNextStart(linkHeader: string): string | undefined {
  // Link: <https://api.mapbox.com/tilesets/v1/user?start=abcdef>; rel="next"
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  if (!match) return undefined;
  try {
    const url = new URL(match[1]);
    return url.searchParams.get('start') ?? undefined;
  } catch {
    return undefined;
  }
}
