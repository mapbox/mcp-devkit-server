import { randomUUID } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { BaseTool } from '../BaseTool.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  PreviewStyleSchema,
  PreviewStyleInput
} from './PreviewStyleTool.input.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import {
  cacheKeyFor,
  createPreviewToken,
  elicitPreviewToken,
  isTemporaryServerToken,
  listPublicPreviewTokens,
  previewTokenStorage
} from '../../utils/tokenElicitation.js';
import type { HttpRequest } from '../../utils/types.js';

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

  readonly meta = {
    ui: {
      resourceUri: 'ui://mapbox/preview-style/index.html',
      csp: {
        connectDomains: ['https://*.mapbox.com'],
        resourceDomains: ['https://*.mapbox.com'],
        frameDomains: ['https://*.mapbox.com']
      }
    }
  };

  private readonly httpRequest: HttpRequest;

  constructor(params: { httpRequest: HttpRequest }) {
    super({ inputSchema: PreviewStyleSchema });
    this.httpRequest = params.httpRequest;
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

      // Check for stored preview token (unless user wants to use custom AND the
      // client can actually act on that — a client with no elicitation support
      // can't honor useCustomToken anyway, so silently reuse the cache instead
      // of forcing an avoidable error).
      const clientSupportsElicitation = Boolean(
        this.server?.server.getClientCapabilities()?.elicitation
      );
      const cacheKey = cacheKeyFor(serverAccessToken || '');
      const storedToken = previewTokenStorage.get(cacheKey);
      if (
        storedToken &&
        (!input.useCustomToken || !clientSupportsElicitation)
      ) {
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

        // Check if client supports elicitation capability
        if (!clientSupportsElicitation) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text:
                  'Preview token required but client does not support elicitation. ' +
                  'Please provide an accessToken parameter directly, or use a client that supports MCP elicitation (e.g., MCP Inspector, Cursor, VS Code).'
              }
            ]
          };
        }

        // A server authenticated with a temporary tk.* token (e.g. the hosted MCP
        // DevKit Server) can never call the Tokens API to create a new token, so
        // the "create"/"auto" options are dropped from the dialog before asking.
        const canCreateTokens = !isTemporaryServerToken(serverAccessToken!);

        // Get existing public tokens to show user
        const existingTokens = canCreateTokens
          ? await listPublicPreviewTokens(
              this.httpRequest,
              MapboxApiBasedTool.mapboxApiEndpoint,
              serverAccessToken!,
              userName
            )
          : [];

        // Elicit token choice from user
        const elicited = await elicitPreviewToken(
          this.server.server,
          existingTokens,
          canCreateTokens
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
          const created = await createPreviewToken(
            this.httpRequest,
            MapboxApiBasedTool.mapboxApiEndpoint,
            serverAccessToken!,
            userName,
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
          const created = await createPreviewToken(
            this.httpRequest,
            MapboxApiBasedTool.mapboxApiEndpoint,
            serverAccessToken!,
            userName
          );
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
        previewTokenStorage.set(cacheKey, publicToken);
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

    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${encodeURIComponent(userName)}/${encodeURIComponent(input.styleId)}.html?${params.toString()}${hashFragment}`;

    // Build content array with URL
    const content: CallToolResult['content'] = [
      {
        type: 'text',
        text: url
      }
    ];

    // Add MCP-UI resource (for legacy MCP-UI clients)
    const uiResource = createUIResource({
      uri: `ui://mapbox/preview-style/${encodeURIComponent(userName)}/${encodeURIComponent(input.styleId)}`,
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

    return {
      content,
      isError: false,
      _meta: {
        viewUUID: randomUUID()
      }
    };
  }
}
