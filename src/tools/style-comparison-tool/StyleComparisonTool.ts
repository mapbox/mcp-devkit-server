// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { randomUUID } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/server';
import { BaseTool } from '../BaseTool.js';
import {
  StyleComparisonSchema,
  StyleComparisonInput
} from './StyleComparisonTool.input.schema.js';
import {
  StyleComparisonOutputSchema,
  StyleComparisonOutput
} from './StyleComparisonTool.output.schema.js';
import {
  getUserNameFromToken,
  mapboxApiEndpoint
} from '../../utils/jwtUtils.js';
import {
  mintScopedPreviewToken,
  describeAutoMintFailure
} from '../../utils/mintScopedPreviewToken.js';
import type { HttpRequest } from '../../utils/types.js';

export class StyleComparisonTool extends BaseTool<
  typeof StyleComparisonSchema,
  typeof StyleComparisonOutputSchema
> {
  readonly name = 'style_comparison_tool';
  readonly description =
    'Show a live side-by-side comparison of two Mapbox styles with a draggable slider, rendered inline in clients that support MCP Apps. By default, auto-generates a short-lived scoped preview token so you can compare them right away — no existing token needed. Also returns a Styles API preview link for each style, to open or share on its own. Pass an existing public `accessToken` to use a token you manage yourself, so those links keep working after the hour.';
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
        resourceDomains: ['https://*.mapbox.com']
      }
    }
  };

  private readonly httpRequest: HttpRequest;

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: StyleComparisonSchema,
      outputSchema: StyleComparisonOutputSchema
    });
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
      publicToken = input.accessToken;
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
        // The comparison renders in our own ui:// panel with GL JS, which
        // accepts a short-lived tk.* token, so nothing persists on the account.
        publicToken = await mintScopedPreviewToken(
          this.httpRequest,
          accessToken,
          {
            note: 'Style Comparison (auto-generated)',
            scopes: ['styles:tiles', 'styles:read', 'fonts:read']
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

    let position = '';
    let hash = '';
    let view: Pick<StyleComparisonOutput, 'center' | 'zoom'> = {};
    if (
      input.zoom !== undefined &&
      input.latitude !== undefined &&
      input.longitude !== undefined
    ) {
      position = ` at zoom ${input.zoom}, ${input.latitude}, ${input.longitude}`;
      hash = `#${input.zoom}/${input.latitude}/${input.longitude}`;
      view = { center: [input.longitude, input.latitude], zoom: input.zoom };
    }

    // Standalone Styles API preview pages for each side, so the styles can
    // be opened or shared outside the inline comparison panel.
    const previewUrl = (styleId: string) =>
      `${mapboxApiEndpoint()}styles/v1/${styleId}.html?${new URLSearchParams({
        access_token: publicToken,
        fresh: 'true'
      }).toString()}${hash}`;

    const structuredContent: StyleComparisonOutput = {
      before: beforeStyleId,
      after: afterStyleId,
      accessToken: publicToken,
      beforePreviewUrl: previewUrl(beforeStyleId),
      afterPreviewUrl: previewUrl(afterStyleId),
      ...view
    };

    const expiry = input.accessToken
      ? 'They use the access token you supplied.'
      : 'They use an auto-generated token and stop working in about an hour; pass your own public accessToken for links that last.';

    return {
      content: [
        {
          type: 'text',
          text:
            `Comparing ${beforeStyleId} (before, left) with ${afterStyleId} (after, right)${position}.\n\n` +
            `Preview links to open or share each style on its own. ${expiry}\n` +
            `- Before: ${structuredContent.beforePreviewUrl}\n` +
            `- After: ${structuredContent.afterPreviewUrl}`
        }
      ],
      structuredContent,
      isError: false,
      _meta: {
        viewUUID: randomUUID()
      }
    };
  }
}
