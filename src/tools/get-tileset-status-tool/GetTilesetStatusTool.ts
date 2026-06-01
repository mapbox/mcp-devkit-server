// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  GetTilesetStatusSchema,
  GetTilesetStatusInput
} from './GetTilesetStatusTool.input.schema.js';

// Docs:
//   https://docs.mapbox.com/api/maps/mapbox-tiling-service/#retrieve-tileset-status
//   https://docs.mapbox.com/api/maps/mapbox-tiling-service/#retrieve-a-publish-job

export class GetTilesetStatusTool extends MapboxApiBasedTool<
  typeof GetTilesetStatusSchema
> {
  readonly name = 'get_tileset_status_tool';
  readonly description =
    "Get the publish job status for a Mapbox tileset. With just `tileset_id`, returns the most recent job's status summary (`queued` / `processing` / `success` / `failed`) and any errors. With `job_id`, returns the full detail for that specific job. Useful for polling a publish in progress. Requires the `tilesets:read` scope.";
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: 'Get Mapbox Tileset Job Status'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: GetTilesetStatusSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: GetTilesetStatusInput,
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

    const path = input.job_id
      ? `tilesets/v1/${input.tileset_id}/jobs/${input.job_id}`
      : `tilesets/v1/${input.tileset_id}/status`;

    const url = new URL(`${MapboxApiBasedTool.mapboxApiEndpoint}${path}`);
    url.searchParams.set('access_token', accessToken);

    const response = await this.httpRequest(url.toString(), { method: 'GET' });
    if (!response.ok) {
      return this.handleApiError(
        response,
        input.job_id ? 'get tileset job' : 'get tileset status'
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    // Status endpoint returns { status, jobs }; job endpoint returns full job
    const status =
      typeof data.stage === 'string'
        ? data.stage
        : typeof data.status === 'string'
          ? data.status
          : undefined;
    const summary = status
      ? `Tileset status: ${status}`
      : 'Tileset status retrieved.';

    return {
      content: [
        { type: 'text', text: summary },
        { type: 'text', text: JSON.stringify(data, null, 2) }
      ],
      structuredContent: data,
      isError: false
    };
  }
}
