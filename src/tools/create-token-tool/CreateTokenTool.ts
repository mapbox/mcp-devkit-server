import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  CreateTokenSchema,
  CreateTokenInput,
  SECRET_SCOPES
} from './CreateTokenTool.schema.js';

export class CreateTokenTool extends MapboxApiBasedTool<
  typeof CreateTokenSchema
> {
  readonly name = 'create_token_tool';
  readonly description =
    'Create a new Mapbox access token with specified scopes and optional URL restrictions. Token type (public/secret) is automatically determined by scopes: PUBLIC scopes (styles:tiles, styles:read, fonts:read, datasets:read, vision:read) create public tokens; SECRET scopes create secret tokens that are only visible once upon creation.';

  constructor() {
    super({ inputSchema: CreateTokenSchema });
  }

  protected async execute(
    input: CreateTokenInput,
    accessToken?: string
  ): Promise<{ type: 'text'; text: string }> {
    const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);

    this.log(
      'info',
      `CreateTokenTool: Starting token creation with note: "${input.note}", scopes: ${JSON.stringify(input.scopes)}`
    );

    // Check if any secret scopes are being used
    const hasSecretScopes = input.scopes.some((scope) =>
      SECRET_SCOPES.includes(scope as (typeof SECRET_SCOPES)[number])
    );

    if (hasSecretScopes) {
      this.log(
        'info',
        'CreateTokenTool: Creating a SECRET token due to secret scopes. This token will only be visible once upon creation.'
      );
    } else {
      this.log(
        'info',
        'CreateTokenTool: Creating a PUBLIC token (only public scopes detected).'
      );
    }

    const url = `${MapboxApiBasedTool.MAPBOX_API_ENDPOINT}tokens/v2/${username}?access_token=${accessToken}`;

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
      const response = await fetch(url, {
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
