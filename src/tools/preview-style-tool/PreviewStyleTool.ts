import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { BaseTool } from '../BaseTool.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  PreviewStyleSchema,
  PreviewStyleInput
} from './PreviewStyleTool.input.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import { isMcpUiEnabled } from '../../config/toolConfig.js';
import {
  elicitPreviewToken,
  previewTokenStorage,
  type ExistingTokenInfo
} from '../../utils/tokenElicitation.js';

export class PreviewStyleTool extends BaseTool<typeof PreviewStyleSchema> {
  readonly name = 'preview_style_tool';
  readonly description =
    'Generate preview URL for a Mapbox style using an existing public token';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: 'Preview Mapbox Style Tool'
  };

  constructor() {
    super({ inputSchema: PreviewStyleSchema });
  }

  protected async execute(
    input: PreviewStyleInput,
    serverAccessToken?: string
  ): Promise<CallToolResult> {
    let publicToken: string;
    let userName: string;

    // Step 1: Determine which token to use for preview
    if (input.accessToken) {
      // User provided token directly (backward compatibility)
      publicToken = input.accessToken;
    } else {
      // No token provided - use elicitation flow
      try {
        // Get username from server access token to check storage
        userName = getUserNameFromToken(serverAccessToken || '');
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text:
                'Server access token is required when no preview token is provided. ' +
                (error instanceof Error ? error.message : String(error))
            }
          ]
        };
      }

      // Check for stored preview token (unless user wants to use custom)
      const storedToken = previewTokenStorage.get(userName);
      if (storedToken && !input.useCustomToken) {
        publicToken = storedToken;
      } else {
        // Need to elicit token from user
        if (!this.server) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Server not initialized. Cannot elicit token from user.'
              }
            ]
          };
        }

        // Get existing public tokens to show user
        const existingTokens = await this.listPublicTokens(serverAccessToken);

        // Elicit token choice from user
        const elicited = await elicitPreviewToken(
          this.server.server,
          existingTokens
        );

        // Handle user's choice
        if (elicited.choice === 'provide') {
          if (!elicited.token) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: 'No token provided. Please provide a valid public token.'
                }
              ]
            };
          }
          publicToken = elicited.token;
        } else if (elicited.choice === 'create') {
          // Create new token with user's specifications
          const created = await this.createPreviewToken(
            serverAccessToken,
            elicited.tokenNote,
            elicited.urlRestrictions
          );
          if (!created.success) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Failed to create token: ${created.error}`
                }
              ]
            };
          }
          publicToken = created.token!;
        } else {
          // auto - create basic preview token
          const created = await this.createPreviewToken(serverAccessToken);
          if (!created.success) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Failed to auto-create token: ${created.error}`
                }
              ]
            };
          }
          publicToken = created.token!;
        }

        // Store token for future use
        previewTokenStorage.set(userName, publicToken);
      }
    }

    // Step 2: Get username from the preview token
    try {
      userName = getUserNameFromToken(publicToken);
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : String(error)
          }
        ]
      };
    }

    // Build URL for the embeddable HTML endpoint
    const params = new URLSearchParams();
    params.append('access_token', publicToken);
    params.append('fresh', 'true'); // Ensure secure access

    if (input.title !== undefined) {
      params.append('title', input.title.toString());
    }

    if (input.zoomwheel !== undefined) {
      params.append('zoomwheel', input.zoomwheel.toString());
    }

    // Build hash fragment for map view parameters
    const hashParams: string[] = [];

    const hashFragment =
      hashParams.length > 0 ? `#${hashParams.join('/')}` : '';

    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${userName}/${input.styleId}.html?${params.toString()}${hashFragment}`;

    // Build content array with URL
    const content: CallToolResult['content'] = [
      {
        type: 'text',
        text: url
      }
    ];

    // Conditionally add MCP-UI resource if enabled
    if (isMcpUiEnabled()) {
      const uiResource = createUIResource({
        uri: `ui://mapbox/preview-style/${userName}/${input.styleId}`,
        content: {
          type: 'externalUrl',
          iframeUrl: url
        },
        encoding: 'text',
        uiMetadata: {
          'preferred-frame-size': ['1000px', '700px']
        }
      });
      content.push(uiResource);
    }

    return {
      content,
      isError: false
    };
  }

  /**
   * List existing public tokens from the user's Mapbox account
   */
  private async listPublicTokens(
    accessToken?: string
  ): Promise<ExistingTokenInfo[]> {
    if (!accessToken) {
      return [];
    }

    try {
      const userName = getUserNameFromToken(accessToken);
      const response = await fetch(
        `${MapboxApiBasedTool.mapboxApiEndpoint}tokens/v2/${userName}?access_token=${accessToken}`
      );

      if (!response.ok) {
        // If we can't list tokens, return empty array (non-fatal)
        return [];
      }

      const data = await response.json();
      const tokens = data as Array<{
        id: string;
        note: string;
        scopes: string[];
        token?: string;
      }>;

      // Filter to public tokens with styles:read scope
      return tokens
        .filter(
          (t) => t.token?.startsWith('pk.') && t.scopes.includes('styles:read')
        )
        .map((t) => ({
          id: t.id,
          note: t.note || t.id,
          scopes: t.scopes
        }));
    } catch {
      // Non-fatal error - return empty array
      return [];
    }
  }

  /**
   * Create a new preview token via Mapbox API
   */
  private async createPreviewToken(
    accessToken?: string,
    note?: string,
    urlRestrictions?: string[]
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!accessToken) {
      return {
        success: false,
        error: 'Server access token is required to create preview tokens'
      };
    }

    try {
      const userName = getUserNameFromToken(accessToken);
      const tokenNote =
        note || `MCP Preview Token - ${new Date().toISOString().split('T')[0]}`;

      const body: {
        note: string;
        scopes: string[];
        allowedUrls?: string[];
      } = {
        note: tokenNote,
        // CRITICAL: Only use public scopes to get a public token (pk.*)
        // styles:download is a secret scope and would create sk.* token
        scopes: ['styles:read', 'styles:tiles', 'fonts:read']
      };

      if (urlRestrictions && urlRestrictions.length > 0) {
        body.allowedUrls = urlRestrictions;
      }

      const response = await fetch(
        `${MapboxApiBasedTool.mapboxApiEndpoint}tokens/v2/${userName}?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Failed to create token: ${response.status} ${errorText}`
        };
      }

      const data = (await response.json()) as { token: string };

      // Validate that we got a public token (starts with pk.)
      if (!data.token.startsWith('pk.')) {
        return {
          success: false,
          error: `API returned a non-public token (${data.token.substring(0, 3)}...). Preview tokens must be public tokens (pk.*) that can be safely exposed in URLs.`
        };
      }

      return {
        success: true,
        token: data.token
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error creating token'
      };
    }
  }
}
