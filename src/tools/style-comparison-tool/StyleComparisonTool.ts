// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { randomUUID } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';
import { BaseTool } from '../BaseTool.js';
import {
  StyleComparisonSchema,
  StyleComparisonInput
} from './StyleComparisonTool.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import {
  mintScopedPreviewToken,
  describeAutoMintFailure
} from '../../utils/mintScopedPreviewToken.js';
import type { HttpRequest } from '../../utils/types.js';

export class StyleComparisonTool extends BaseTool<
  typeof StyleComparisonSchema
> {
  readonly name = 'style_comparison_tool';
  readonly description =
    'Generate a live side-by-side comparison of two Mapbox styles. By default, auto-generates a scoped preview token so you can compare them right away — no existing token needed. Pass `share: true` with an existing public `accessToken` instead to generate a comparison link using a token you manage yourself.';
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
    accessToken?: string
  ): Promise<CallToolResult> {
    let publicToken: string;

    if (input.accessToken) {
      // Caller-supplied token — used as-is, for either mode.
      publicToken = input.accessToken;
    } else if (input.share) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text:
              '`share: true` requires an existing public token via `accessToken` — a persistent ' +
              'pk.* token is needed for a durable, shareable link. Get one via list_tokens_tool ' +
              'or create_token_tool, or omit `share` for a quick inline comparison (no token needed).'
          }
        ]
      };
    } else {
      if (!accessToken) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'No Mapbox access token available to generate a comparison.'
            }
          ]
        };
      }
      try {
        // Unlike the inline style preview, the comparison page this URL
        // points to (agent.mapbox.com/tools/style-compare) validates the
        // token prefix itself and hard-rejects anything but pk.* — a
        // short-lived tk.* token (this repo's usual auto-mint default)
        // fails there with a "Configuration Error", confirmed live. So
        // this mints a real, non-expiring pk.* token instead: narrowly
        // scoped, but it persists on the account until manually revoked.
        publicToken = await mintScopedPreviewToken(
          this.httpRequest,
          accessToken,
          {
            note: 'Style Comparison (auto-generated)',
            scopes: ['styles:tiles', 'styles:read', 'fonts:read'],
            expiresInMs: null
          }
        );
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: describeAutoMintFailure(error) }]
        };
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
