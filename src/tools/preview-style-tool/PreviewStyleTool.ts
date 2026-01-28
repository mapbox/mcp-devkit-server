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

  protected async execute(input: PreviewStyleInput): Promise<CallToolResult> {
    let userName: string;
    try {
      userName = getUserNameFromToken(input.accessToken);
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

    // Use the user-provided public token
    const publicToken = input.accessToken;

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

    // Build descriptive text with map metadata for better client compatibility
    // This ensures all MCP clients can display meaningful information
    const textDescription = [
      'Mapbox style preview generated successfully.',
      `Style: ${userName}/${input.styleId}`,
      `Preview URL: ${url}`,
      input.title !== undefined ? `Title display: ${input.title}` : null,
      input.zoomwheel !== undefined
        ? `Zoom control: ${input.zoomwheel ? 'enabled' : 'disabled'}`
        : null
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
          resourceUri: `ui://mapbox/preview-style/${userName}/${input.styleId}`
        }
      };
    }

    return result;
  }
}
