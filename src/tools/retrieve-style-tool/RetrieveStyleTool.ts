// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import { filterExpandedMapboxStyles } from '../../utils/styleUtils.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  RetrieveStyleSchema,
  RetrieveStyleInput
} from './RetrieveStyleTool.input.schema.js';
import { HttpRequest } from '../../utils/types.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  MapboxStyleOutput,
  MapboxStyleOutputSchema
} from './RetrieveStyleTool.output.schema.js';

export class RetrieveStyleTool extends MapboxApiBasedTool<
  typeof RetrieveStyleSchema,
  typeof MapboxStyleOutputSchema
> {
  name = 'retrieve_style_tool';
  description = 'Retrieve a specific Mapbox style by ID';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: 'Retrieve Mapbox Style Tool'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: RetrieveStyleSchema,
      outputSchema: MapboxStyleOutputSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: RetrieveStyleInput,
    accessToken?: string
  ): Promise<CallToolResult> {
    const username = getUserNameFromToken(accessToken);
    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}/${input.styleId}?access_token=${accessToken}`;

    const response = await this.httpRequest(url);

    if (!response.ok) {
      return this.handleApiError(response, 'retrieve style');
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
