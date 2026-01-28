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
    input: StyleComparisonInput
  ): Promise<CallToolResult> {
    let beforeStyleId;
    let afterStyleId;
    try {
      // Process style IDs to get username/styleId format
      beforeStyleId = this.processStyleId(input.before, input.accessToken);
      afterStyleId = this.processStyleId(input.after, input.accessToken);
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
    params.append('access_token', input.accessToken);
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

    // Build descriptive text with comparison metadata for better client compatibility
    // This ensures all MCP clients can display meaningful information
    const textDescription = [
      'Mapbox style comparison generated successfully.',
      `Before: ${beforeStyleId}`,
      `After: ${afterStyleId}`,
      input.zoom !== undefined &&
      input.latitude !== undefined &&
      input.longitude !== undefined
        ? `View: ${input.latitude}, ${input.longitude} @ zoom ${input.zoom}`
        : null,
      `Comparison URL: ${url}`
    ]
      .filter(Boolean)
      .join('\n');

    // Build content array with text first (for compatibility)
    const content: CallToolResult['content'] = [
      {
        type: 'text',
        text: textDescription
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

    // Add MCP Apps metadata (new pattern for broader client compatibility)
    const result: CallToolResult = {
      content,
      isError: false
    };

    // Add ui:// resource URI for MCP Apps pattern
    // This works alongside MCP-UI for backward compatibility
    if (isMcpUiEnabled()) {
      result._meta = {
        ui: {
          resourceUri: `ui://mapbox/style-comparison/${beforeStyleId}/${afterStyleId}`
        }
      };
    }

    return result;
  }
}
