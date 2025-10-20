// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import { filterExpandedMapboxStyles } from '../../utils/styleUtils.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  MapboxStyleInputSchema,
  MapboxStyleInput
} from './CreateStyleTool.input.schema.js';
import {
  MapboxStyleOutput,
  MapboxStyleOutputSchema
} from './CreateStyleTool.output.schema.js';

export class CreateStyleTool extends MapboxApiBasedTool<
  typeof MapboxStyleInputSchema,
  typeof MapboxStyleOutputSchema
> {
  name = 'create_style_tool';
  description = 'Create a new Mapbox style';
  readonly annotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
    title: 'Create Mapbox Style Tool'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: MapboxStyleInputSchema,
      outputSchema: MapboxStyleOutputSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: MapboxStyleInput,
    accessToken?: string
  ): Promise<CallToolResult> {
    const username = getUserNameFromToken(accessToken);
    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}?access_token=${accessToken}`;

    const response = await this.httpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create style: ${response.status} ${response.statusText}`
          }
        ],
        isError: true
      };
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

    this.log('info', `CreateStyleTool: Successfully created style ${data.id}`);

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
