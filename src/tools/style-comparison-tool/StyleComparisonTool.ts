// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { randomUUID } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { BaseTool } from '../BaseTool.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  StyleComparisonSchema,
  StyleComparisonInput
} from './StyleComparisonTool.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import {
  createPreviewToken,
  elicitPreviewToken,
  isTemporaryServerToken,
  listPublicPreviewTokens,
  previewTokenStorage
} from '../../utils/tokenElicitation.js';
import type { HttpRequest } from '../../utils/types.js';

export class StyleComparisonTool extends BaseTool<
  typeof StyleComparisonSchema
> {
  readonly name = 'style_comparison_tool';
  readonly description =
    'Generate a comparison URL for comparing two Mapbox styles side-by-side';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: 'Compare Mapbox Styles Tool'
  };

  readonly meta = {
    ui: {
      resourceUri: 'ui://mapbox/style-comparison/index.html',
      csp: {
        connectDomains: ['https://*.mapbox.com'],
        resourceDomains: ['https://*.mapbox.com'],
        frameDomains: ['https://*.mapbox.com']
      }
    }
  };

  private readonly httpRequest: HttpRequest;

  constructor(params: { httpRequest: HttpRequest }) {
    super({ inputSchema: StyleComparisonSchema });
    this.httpRequest = params.httpRequest;
  }

  /**
   * Validates that a resolved username/styleId contains only safe characters.
   * Style IDs must be alphanumeric with hyphens and underscores only.
   */
  private validateStyleId(resolved: string): void {
    if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(resolved)) {
      throw new Error(
        `Invalid style ID format: "${resolved}". ` +
          `Style IDs must be in username/styleId format using only letters, numbers, hyphens, and underscores.`
      );
    }
  }

  /**
   * Processes style input to extract username/styleId format
   */
  private processStyleId(style: string, accessToken: string): string {
    let resolved: string;

    // If it's a full URL, extract the username/styleId part
    if (style.startsWith('mapbox://styles/')) {
      resolved = style.replace('mapbox://styles/', '');
    } else if (style.includes('/')) {
      // If it contains a slash, assume it's already username/styleId format
      resolved = style;
    } else {
      // If it's just a style ID, try to get username from the token
      try {
        const username = getUserNameFromToken(accessToken);
        resolved = `${username}/${style}`;
      } catch (error) {
        throw new Error(
          `Could not determine username for style ID "${style}". ${error instanceof Error ? error.message : ''}\n` +
            `Please provide either:\n` +
            `1. Full style URL: mapbox://styles/username/${style}\n` +
            `2. Username/styleId format: username/${style}\n` +
            `3. Just the style ID with a valid Mapbox token that contains username information`
        );
      }
    }

    this.validateStyleId(resolved);
    return resolved;
  }

  protected async execute(
    input: StyleComparisonInput,
    serverAccessToken?: string
  ): Promise<CallToolResult> {
    let publicToken: string;

    // Step 1: Determine which token to use for the comparison
    if (input.accessToken) {
      // User provided token directly (backward compatibility)
      publicToken = input.accessToken;
    } else {
      // No token provided - use elicitation flow
      let userName: string;
      try {
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

        const clientCapabilities = this.server.server.getClientCapabilities();
        if (!clientCapabilities?.elicitation) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text:
                  'Preview token required but client does not support elicitation. ' +
                  'Please provide an accessToken parameter directly, or use a client that supports MCP elicitation (e.g., Claude Desktop, Claude Code).'
              }
            ]
          };
        }

        // A server authenticated with a temporary tk.* token (e.g. the hosted MCP
        // DevKit Server) can never call the Tokens API to create a new token, so
        // the "create"/"auto" options are dropped from the dialog before asking.
        const canCreateTokens = !isTemporaryServerToken(serverAccessToken!);

        const existingTokens = canCreateTokens
          ? await listPublicPreviewTokens(
              this.httpRequest,
              MapboxApiBasedTool.mapboxApiEndpoint,
              serverAccessToken!,
              userName
            )
          : [];

        const elicited = await elicitPreviewToken(
          this.server.server,
          existingTokens,
          canCreateTokens
        );

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

        previewTokenStorage.set(userName, publicToken);
      }
    }

    let beforeStyleId;
    let afterStyleId;
    try {
      // Process style IDs to get username/styleId format
      beforeStyleId = this.processStyleId(input.before, publicToken);
      afterStyleId = this.processStyleId(input.after, publicToken);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text:
              error instanceof Error
                ? error.message
                : 'An unknown error occurred'
          }
        ],
        isError: true
      };
    }

    // Build the comparison URL
    const params = new URLSearchParams();
    params.append('access_token', publicToken);
    params.append('before', beforeStyleId);
    params.append('after', afterStyleId);

    // Build base URL
    let url = `https://agent.mapbox.com/tools/style-compare?${params.toString()}`;

    // Add hash fragment for map position if all coordinates are provided
    if (
      input.zoom !== undefined &&
      input.latitude !== undefined &&
      input.longitude !== undefined
    ) {
      // Format: #zoom/latitude/longitude
      url += `#${input.zoom}/${input.latitude}/${input.longitude}`;
    }

    // Build content array with URL
    const content: CallToolResult['content'] = [
      {
        type: 'text',
        text: url
      }
    ];

    // Add MCP-UI resource (for legacy MCP-UI clients)
    const uiResource = createUIResource({
      uri: `ui://mapbox/style-comparison/${beforeStyleId}/${afterStyleId}`,
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
