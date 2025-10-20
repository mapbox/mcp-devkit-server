// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  ListStylesSchema,
  ListStylesInput
} from './ListStylesTool.input.schema.js';
import { ListStylesOutputSchema } from './ListStylesTool.output.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';

export class ListStylesTool extends MapboxApiBasedTool<
  typeof ListStylesSchema,
  typeof ListStylesOutputSchema
> {
  name = 'list_styles_tool';
  description =
    'List styles for a Mapbox account. Use limit parameter to avoid large responses (recommended: limit=5-10). Use start parameter for pagination.';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: 'List Mapbox Styles Tool'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: ListStylesSchema,
      outputSchema: ListStylesOutputSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: ListStylesInput,
    accessToken?: string
  ): Promise<CallToolResult> {
    const username = getUserNameFromToken(accessToken);

    // Build query parameters
    const params = new URLSearchParams();
    if (!accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is not set');
    }
    params.append('access_token', accessToken);

    if (input.limit) {
      params.append('limit', input.limit.toString());
    }

    if (input.start) {
      params.append('start', input.start);
    }

    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}?${params.toString()}`;

    const response = await this.httpRequest(url);

    if (!response.ok) {
      return this.handleApiError(response, 'list styles');
    }

    const data = await response.json();
    const parseResult = ListStylesOutputSchema.safeParse(data);
    if (!parseResult.success) {
      this.log(
        'error',
        `ListStylesTool: Output schema validation failed\n${parseResult.error}`
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: `ListStylesTool: Response does not conform to output schema:\n${parseResult.error}`
          }
        ],
        isError: true
      };
    }
    this.log('info', `ListStylesTool: Successfully listed styles`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ data: parseResult.data }, null, 2)
        }
      ],
      structuredContent: {
        data: parseResult.data
      },
      isError: false
    };
  }
}
