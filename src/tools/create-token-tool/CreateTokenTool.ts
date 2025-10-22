import { fetchClient } from '../../utils/fetchRequest.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  CreateTokenSchema,
  CreateTokenInput
} from './CreateTokenTool.schema.js';

export class CreateTokenTool extends MapboxApiBasedTool<
  typeof CreateTokenSchema
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

  constructor(private fetch: typeof globalThis.fetch = fetchClient) {
    super({ inputSchema: CreateTokenSchema });
  }

  protected async execute(
    input: CreateTokenInput,
    accessToken?: string
  ): Promise<{ type: 'text'; text: string }> {
    const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);

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
        throw new Error('Maximum 100 allowed URLs per token');
      }
      body.allowedUrls = input.allowedUrls;
    }

    if (input.expires) {
      body.expires = input.expires;
    }

    try {
      const response = await this.fetch(url, {
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
        throw new Error(
          `Failed to create token: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      this.log('info', `CreateTokenTool: Successfully created token`);

      return {
        type: 'text',
        text: JSON.stringify(data, null, 2)
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to create token: ${String(error)}`);
    }
  }
}
