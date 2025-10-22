import { BaseTool } from '../BaseTool.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  StyleComparisonSchema,
  StyleComparisonInput
} from './StyleComparisonTool.schema.js';

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
      const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);
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
  ): Promise<{ type: 'text'; text: string }> {
    // Process style IDs to get username/styleId format
    const beforeStyleId = this.processStyleId(input.before, input.accessToken);
    const afterStyleId = this.processStyleId(input.after, input.accessToken);

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

    return {
      type: 'text',
      text: url
    };
  }
}
