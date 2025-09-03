import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { ListTokensTool } from '../list-tokens-tool/ListTokensTool.js';
import {
  PreviewStyleSchema,
  PreviewStyleInput
} from './PreviewStyleTool.schema.js';

export class PreviewStyleTool extends MapboxApiBasedTool<
  typeof PreviewStyleSchema
> {
  readonly name = 'preview_style_tool';
  readonly description =
    'Generate preview URL for a Mapbox style using an existing public token';

  constructor() {
    super({ inputSchema: PreviewStyleSchema });
  }

  protected async execute(
    input: PreviewStyleInput,
    accessToken?: string
  ): Promise<{ type: 'text'; text: string }> {
    const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);

    // Get list of tokens to find a public token
    const listTokensTool = new ListTokensTool();
    const tokensResult = await listTokensTool.run({
      usage: 'pk' // Filter for public tokens only
    });

    if (tokensResult.isError) {
      throw new Error('Failed to retrieve public tokens');
    }

    // Extract tokens from the response
    const firstContent = tokensResult.content[0];
    if (firstContent.type !== 'text') {
      throw new Error('Unexpected response format from list tokens');
    }
    const tokensData = JSON.parse(firstContent.text);
    const publicTokens = tokensData.tokens;

    if (!publicTokens || publicTokens.length === 0) {
      throw new Error(
        'No public tokens found. Please create a public token first.'
      );
    }

    // Use the first available public token
    const publicToken = publicTokens[0].token;

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

    const url = `${MapboxApiBasedTool.MAPBOX_API_ENDPOINT}styles/v1/${username}/${input.styleId}.html?${params.toString()}${hashFragment}`;

    return {
      type: 'text',
      text: url
    };
  }
}
