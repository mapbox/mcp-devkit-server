import { randomUUID } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
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
  collectProvidedToken,
  createPreviewToken,
  ElicitationUnavailableError,
  elicitPreviewToken,
  isTemporaryServerToken,
  listPublicPreviewTokens,
  previewTokenStorage
} from '../../utils/tokenElicitation.js';
import {
  localHttpTokenCollectionHandler,
  type TokenCollectionHandler
} from '../../utils/tokenCollectionServer.js';
import type { HttpRequest } from '../../utils/types.js';

// `BaseTool#execute`'s abstract signature accepts `ToolExecutionContext` in this slot;
// overriding with the concrete `RequestHandlerExtra` type here (rather than `any`) would
// fail TS's contravariant parameter check since the two types don't overlap. `any` is the
// same escape hatch `BaseTool.run()` itself already uses for this exact parameter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolCallExtra = RequestHandlerExtra<any, any>;

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
  private readonly tokenCollectionHandler: TokenCollectionHandler;

  constructor(params: {
    httpRequest: HttpRequest;
    tokenCollectionHandler?: TokenCollectionHandler;
  }) {
    super({ inputSchema: PreviewStyleSchema });
    this.httpRequest = params.httpRequest;
    this.tokenCollectionHandler =
      params.tokenCollectionHandler ?? localHttpTokenCollectionHandler;
  }

  /**
   * Overridden only to forward `extra` down to `execute()`. `BaseTool.run()` extracts
   * `accessToken` from `extra` and drops the rest, but elicitation needs `extra.sendRequest`
   * — the per-call, correctly-session-scoped request sender (see the doc comment on
   * `elicitPreviewToken` for why `this.server` can't be used for this instead).
   */
  async run(rawInput: unknown, extra?: ToolCallExtra): Promise<CallToolResult> {
    try {
      const input = this.inputSchema.parse(rawInput);
      const accessToken =
        extra?.authInfo?.token || process.env.MAPBOX_ACCESS_TOKEN;
      return this.execute(input, accessToken, extra);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text', text: (error as Error).message }]
      };
    }
  }

  protected async execute(
    input: PreviewStyleInput,
    serverAccessToken?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawExtra?: any
  ): Promise<CallToolResult> {
    const extra: ToolCallExtra | undefined = rawExtra;
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

      const cacheKey = cacheKeyFor(serverAccessToken || '');
      const storedToken = previewTokenStorage.get(cacheKey);

      // Reuse the cached token unless the caller explicitly wants to choose a
      // different one — in which case we still need `extra.sendRequest` to ask.
      if (storedToken && !input.useCustomToken) {
        publicToken = storedToken;
      } else if (!extra?.sendRequest) {
        // No per-call session context to elicit through at all (e.g. invoked
        // directly, outside a connected MCP session).
        if (storedToken) {
          publicToken = storedToken;
        } else {
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
      } else {
        // A server authenticated with a temporary tk.* token (e.g. the hosted MCP
        // DevKit Server) can never call the Tokens API to create a new token, so
        // the "create"/"auto" options are dropped from the dialog before asking.
        const canCreateTokens = !isTemporaryServerToken(serverAccessToken!);

        // Listing only needs `tokens:read`, a separate scope from the `tokens:write`
        // that canCreateTokens checks — a tk.*-authenticated server lacking the
        // latter isn't thereby known to lack the former too, so this isn't gated on
        // canCreateTokens. The call already fails safe to an empty list on any
        // API/permission error.
        const existingTokens = await listPublicPreviewTokens(
          this.httpRequest,
          MapboxApiBasedTool.mapboxApiEndpoint,
          serverAccessToken!,
          userName
        );

        try {
          // Elicit token choice from user, over *this* call's own connection.
          const elicited = await elicitPreviewToken(
            extra.sendRequest,
            existingTokens,
            canCreateTokens
          );

          // Handle user's choice
          if (elicited.choice === 'provide') {
            // Collected via a follow-up URL-mode elicitation, not this form dialog —
            // the MCP spec requires credentials to go through URL mode, not form mode.
            // Errors here (unsupported client, decline/cancel, validation failure) are
            // handled by the catch below exactly like elicitPreviewToken's own errors.
            publicToken = await collectProvidedToken(
              extra.sendRequest,
              extra.sendNotification,
              this.tokenCollectionHandler
            );
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
        } catch (error) {
          if (error instanceof ElicitationUnavailableError) {
            // The client can't be asked at all (e.g. no elicitation support). Fall
            // back to a cached token if one exists rather than failing outright.
            if (storedToken) {
              publicToken = storedToken;
            } else {
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
          } else {
            // The client was asked and the user declined/cancelled, or something
            // else went wrong — surface it rather than silently reusing a cache.
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
        }
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
