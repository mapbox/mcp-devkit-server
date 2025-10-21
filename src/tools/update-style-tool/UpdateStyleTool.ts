// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { HttpRequest } from '../../utils/types.js';
import { filterExpandedMapboxStyles } from '../../utils/styleUtils.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  UpdateStyleInput,
  UpdateStyleInputSchema
} from './UpdateStyleTool.input.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  MapboxStyleOutputSchema,
  MapboxStyleOutput
} from './UpdateStyleTool.output.schema.js';

export class UpdateStyleTool extends MapboxApiBasedTool<
  typeof UpdateStyleInputSchema,
  typeof MapboxStyleOutputSchema
> {
  name = 'update_style_tool';
  description = 'Update an existing Mapbox style';
  readonly annotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
    title: 'Update Mapbox Style Tool'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: UpdateStyleInputSchema,
      outputSchema: MapboxStyleOutputSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: UpdateStyleInput,
    accessToken?: string
  ): Promise<CallToolResult> {
    const username = getUserNameFromToken(accessToken);
    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}/${input.styleId}?access_token=${accessToken}`;

    const payload: Record<string, unknown> = {};
    if (input.name) payload.name = input.name;
    if (input.style) Object.assign(payload, input.style);

    const response = await this.httpRequest(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return this.handleApiError(response, 'update style');
    }

    const rawData = await response.json();
    // Validate response against schema with graceful fallback
    let data: MapboxStyleOutput;
    try {
      data = MapboxStyleOutputSchema.parse(rawData);
    } catch (validationError) {
      this.log(
        'warning',
        `Schema validation failed for search response: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
      );
      // Graceful fallback to raw data
      data = rawData as MapboxStyleOutput;
    }

    this.log('info', `UpdateStyleTool: Successfully updated style ${data.id}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(filterExpandedMapboxStyles(data), null, 2)
        }
      ],
      structuredContent: filterExpandedMapboxStyles(data),
      isError: false
    };
  }
}
