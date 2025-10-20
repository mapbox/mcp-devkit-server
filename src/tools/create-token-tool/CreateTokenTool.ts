// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  CreateTokenSchema,
  CreateTokenInput
} from './CreateTokenTool.input.schema.js';
import { CreateTokenOutputSchema } from './CreateTokenTool.output.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';

export class CreateTokenTool extends MapboxApiBasedTool<
  typeof CreateTokenSchema,
  typeof CreateTokenOutputSchema
> {
  readonly name = 'create_token_tool';
  readonly description =
    'Create a new Mapbox public access token with specified scopes and optional URL restrictions.';
  readonly annotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
    title: 'Create Mapbox Token Tool'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: CreateTokenSchema,
      outputSchema: CreateTokenOutputSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: CreateTokenInput,
    accessToken?: string
  ): Promise<CallToolResult> {
    const username = getUserNameFromToken(accessToken);

    this.log(
      'info',
      `CreateTokenTool: Creating public token with note: "${input.note}", scopes: ${JSON.stringify(input.scopes)}`
    );

    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}tokens/v2/${username}?access_token=${accessToken}`;

    const body: {
      note: string;
      scopes: string[];
      allowedUrls?: string[];
      expires?: string;
    } = {
      note: input.note,
      scopes: input.scopes
    };

    if (input.allowedUrls) {
      if (input.allowedUrls.length > 100) {
        return {
          content: [
            {
              type: 'text',
              text: 'Maximum 100 allowed URLs per token'
            }
          ],
          isError: true
        };
      }
      body.allowedUrls = input.allowedUrls;
    }

    if (input.expires) {
      body.expires = input.expires;
    }

    const response = await this.httpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.log(
        'error',
        `CreateTokenTool: API Error - Status: ${response.status}, Body: ${errorBody}`
      );
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create token: ${response.status} ${response.statusText}`
          }
        ],
        isError: true
      };
    }

    const data = await response.json();
    const parseResult = CreateTokenOutputSchema.safeParse(data);
    if (!parseResult.success) {
      this.log(
        'error',
        `CreateTokenTool: Output schema validation failed\n${parseResult.error}`
      );
      return {
        content: [
          {
            type: 'text',
            text: `CreateTokenTool: Response does not conform to output schema:\n${parseResult.error}`
          }
        ],
        isError: true
      };
    }
    this.log('info', `CreateTokenTool: Successfully created token`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(parseResult.data, null, 2)
        }
      ],
      structuredContent: parseResult.data,
      isError: false
    };
  }
}
