// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { BaseTool } from '../BaseTool.js';
import {
  StyleComparisonSchema,
  StyleComparisonInput
} from './StyleComparisonTool.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import { isMcpUiEnabled } from '../../config/toolConfig.js';
import {
  elicitPreviewToken,
  previewTokenStorage
} from '../../utils/tokenElicitation.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

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

  constructor() {
    super({ inputSchema: StyleComparisonSchema });
  }

  /**
   * Override run to handle elicitation via RequestHandlerExtra
   */
  async run(
    rawInput: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra?: RequestHandlerExtra<any, any>
  ): Promise<CallToolResult> {
    try {
      const input = this.inputSchema.parse(rawInput);
      const serverAccessToken =
        extra?.authInfo?.token || process.env.MAPBOX_ACCESS_TOKEN;

      // Validate server token exists
      if (!serverAccessToken) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Server access token is required when no preview token is provided. Please configure MAPBOX_ACCESS_TOKEN environment variable.'
            }
          ]
        };
      }

      return this.execute(input, serverAccessToken);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text', text: (error as Error).message }]
      };
    }
  }

  /**
   * List existing public tokens for elicitation
   */
  private async listPublicTokens(
    serverAccessToken?: string
  ): Promise<{ id: string; note: string; scopes: string[] }[]> {
    if (!serverAccessToken) return [];

    try {
      const response = await fetch(
        'https://api.mapbox.com/tokens/v2?limit=100&usage=pk',
        {
          headers: {
            Authorization: `Bearer ${serverAccessToken}`
          }
        }
      );

      if (!response.ok) return [];

      const data = (await response.json()) as Array<{
        id: string;
        note: string;
        scopes: string[];
      }>;
      return data.map((token) => ({
        id: token.id,
        note: token.note || 'Unnamed token',
        scopes: token.scopes
      }));
    } catch {
      return [];
    }
  }

  /**
   * Create a new public preview token
   */
  private async createPreviewToken(
    serverAccessToken?: string,
    tokenNote?: string,
    urlRestrictions?: string[]
  ): Promise<{ token: string }> {
    if (!serverAccessToken) {
      throw new Error('Server access token required to create preview tokens');
    }

    const body: {
      note: string;
      scopes: string[];
      allowedUrls?: string[];
    } = {
      note: tokenNote || 'Auto-created preview token',
      // CRITICAL: Only use public scopes to get a public token (pk.*)
      // styles:download is a secret scope and would create sk.* token
      scopes: ['styles:read', 'styles:tiles', 'fonts:read']
    };

    // Add URL restrictions if provided
    if (urlRestrictions && urlRestrictions.length > 0) {
      body.allowedUrls = urlRestrictions;
    }

    const response = await fetch('https://api.mapbox.com/tokens/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serverAccessToken}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create preview token: ${error}`);
    }

    const data = (await response.json()) as { token: string };
    return { token: data.token };
  }

  /**
   * Processes style input to extract username/styleId format
   */
  private processStyleId(style: string, accessToken: string): string {
    // If it's a full URL, extract the username/styleId part
    if (style.startsWith('mapbox://styles/')) {
      return style.replace('mapbox://styles/', '');
    }

    // If it contains a slash, assume it's already username/styleId format
    if (style.includes('/')) {
      return style;
    }

    // If it's just a style ID, try to get username from the token
    try {
      const username = getUserNameFromToken(accessToken);
      return `${username}/${style}`;
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

  protected async execute(
    input: StyleComparisonInput,
    serverAccessToken?: string
  ): Promise<CallToolResult> {
    // Handle token elicitation if accessToken not provided
    let publicToken: string;

    if (input.accessToken) {
      // Backward compatibility - use provided token directly
      publicToken = input.accessToken;
    } else {
      // Need to elicit token from user
      const userName = getUserNameFromToken(serverAccessToken || '');
      const storedToken = previewTokenStorage.get(userName);

      if (storedToken && !input.useCustomToken) {
        // Use cached token
        publicToken = storedToken;
      } else {
        // Check if client supports elicitation
        if (!this.server?.server) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: 'Server not initialized. Cannot use elicitation.'
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
                  'Please provide an accessToken parameter directly, or use a client that supports ' +
                  'MCP elicitation (MCP Inspector, Cursor, VS Code).'
              }
            ]
          };
        }

        // Elicit from user
        try {
          const existingTokens = await this.listPublicTokens(serverAccessToken);
          const elicited = await elicitPreviewToken(
            this.server.server,
            existingTokens
          );

          if (elicited.choice === 'provide') {
            publicToken = elicited.token!;
          } else if (elicited.choice === 'create') {
            const created = await this.createPreviewToken(
              serverAccessToken,
              elicited.tokenNote,
              elicited.urlRestrictions
            );
            publicToken = created.token!;
          } else {
            // auto-create
            const created = await this.createPreviewToken(serverAccessToken);
            publicToken = created.token!;
          }

          // Cache the token for this session
          previewTokenStorage.set(userName, publicToken);
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Failed to elicit or create preview token: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ]
          };
        }
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

    // Conditionally add MCP-UI resource if enabled
    if (isMcpUiEnabled()) {
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
    }

    return {
      content,
      isError: false
    };
  }
}
