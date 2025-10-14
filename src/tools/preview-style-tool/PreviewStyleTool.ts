import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool } from '../BaseTool.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  PreviewStyleSchema,
  PreviewStyleInput
} from './PreviewStyleTool.input.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';

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

  async run(input: PreviewStyleInput): Promise<CallToolResult> {
    const username = getUserNameFromToken(input.accessToken);

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

    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}/${input.styleId}.html?${params.toString()}${hashFragment}`;

    return {
      content: [
        {
          type: 'text',
          text: url
        }
      ],
      isError: false
    };
  }
}
