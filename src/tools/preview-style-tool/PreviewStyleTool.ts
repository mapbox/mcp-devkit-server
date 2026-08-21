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
import { mintScopedPreviewToken } from '../../utils/mintScopedPreviewToken.js';
import type { HttpRequest } from '../../utils/types.js';

export class PreviewStyleTool extends BaseTool<typeof PreviewStyleSchema> {
  readonly name = 'preview_style_tool';
  readonly description =
    'Generate a live preview of a Mapbox style. By default, auto-generates a short-lived preview token so you can view it right away — no existing token needed. Pass `share: true` with an existing public `accessToken` instead to generate a durable, shareable preview link.';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: 'Preview Mapbox Style Tool'
  };

  readonly meta = {
    ui: {
      resourceUri: 'ui://mapbox/map-preview/index.html',
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
    accessToken?: string
  ): Promise<CallToolResult> {
    let userName: string;
    let publicToken: string;

    if (input.accessToken) {
      // Caller-supplied token — used as-is, for either mode.
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
              'or create_token_tool, or omit `share` for a quick inline preview (no token needed).'
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
              text: 'No Mapbox access token available to generate a preview.'
            }
          ]
        };
      }
      try {
        userName = getUserNameFromToken(accessToken);
        publicToken = await mintScopedPreviewToken(
          this.httpRequest,
          accessToken,
          {
            note: 'Style Preview (auto-generated, expires in 1h)',
            scopes: ['styles:tiles', 'styles:read', 'fonts:read']
          }
        );
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
