// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  DeleteStyleSchema,
  DeleteStyleInput
} from './DeleteStyleTool.input.schema.js';

export class DeleteStyleTool extends MapboxApiBasedTool<
  typeof DeleteStyleSchema
> {
  name = 'delete_style_tool';
  description = 'Delete a Mapbox style by ID';
  readonly annotations = {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
    title: 'Delete Mapbox Style Tool'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({ inputSchema: DeleteStyleSchema, httpRequest: params.httpRequest });
  }

  protected async execute(
    input: DeleteStyleInput,
    accessToken?: string
  ): Promise<CallToolResult> {
    const username = getUserNameFromToken(accessToken);
    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}/${input.styleId}?access_token=${accessToken}`;

    const response = await this.httpRequest(url, {
      method: 'DELETE'
    });

    if (response.status !== 204) {
      throw new Error(
        `Failed to delete style: ${response.status} ${response.statusText}`
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Style deleted successfully'
        }
      ],
      isError: false
    };
  }
}
