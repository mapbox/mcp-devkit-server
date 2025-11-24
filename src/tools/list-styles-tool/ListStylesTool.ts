// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import type { ToolExecutionContext } from '../../utils/tracing.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  ListStylesSchema,
  ListStylesInput
} from './ListStylesTool.input.schema.js';
import {
  ListStylesOutputSchema,
  StylesArraySchema
} from './ListStylesTool.output.schema.js';
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
    accessToken: string,
    _context: ToolExecutionContext
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

    const rawData = await response.json();

    // Validate the API response (which is an array) with graceful fallback
    const validatedData = this.validateOutput(
      StylesArraySchema,
      rawData,
      'ListStylesTool'
    );

    this.log('info', `ListStylesTool: Successfully listed styles`);

    const wrappedData = { styles: validatedData };
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(wrappedData, null, 2)
        }
      ],
      structuredContent: wrappedData,
      isError: false
    };
  }
}
