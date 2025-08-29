import { BaseTool } from '../BaseTool.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { ListTokensTool } from '../list-tokens-tool/ListTokensTool.js';
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

  constructor() {
    super({ inputSchema: StyleComparisonSchema });
  }

  /**
   * Fetches the first available public token from the user's account
   */
  private async fetchPublicToken(): Promise<string | null> {
    try {
      const listTokensTool = new ListTokensTool();
      const tokensResult = await listTokensTool.run({
        usage: 'pk' // Filter for public tokens only
      });

      if (!tokensResult.isError) {
        const firstContent = tokensResult.content[0];
        if (firstContent.type === 'text') {
          const tokensData = JSON.parse(firstContent.text);
          const publicTokens = tokensData.tokens;
          if (publicTokens && publicTokens.length > 0) {
            return publicTokens[0].token;
          }
        }
      }
    } catch {
      // Return null if fetching fails
    }
    return null;
  }

  /**
   * Ensures we have a valid public token for the comparison URL
   */
  private async ensurePublicToken(providedToken?: string): Promise<string> {
    // If no token provided, try to get one from the account
    if (!providedToken) {
      const fetchedToken = await this.fetchPublicToken();
      if (!fetchedToken) {
        throw new Error(
          'No access token provided and no public token found. Please provide a public access token (pk.*) with styles:read permission.'
        );
      }
      return fetchedToken;
    }

    // If it's already a public token, use it
    if (providedToken.startsWith('pk.')) {
      return providedToken;
    }

    // If it's a secret token, try to get a public token instead
    if (providedToken.startsWith('sk.')) {
      const publicToken = await this.fetchPublicToken();
      if (!publicToken) {
        throw new Error(
          'Secret tokens (sk.*) cannot be used for style comparison. ' +
            'No public token found in your account. Please create a public token with styles:read permission or provide one directly.'
        );
      }
      return publicToken;
    }

    // Unknown token format
    throw new Error(
      `Invalid token format. Expected a public token starting with 'pk.' but got '${providedToken.substring(0, 3)}...'. ` +
        'Style comparison requires a public token with styles:read permission.'
    );
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
    input: StyleComparisonInput,
    providedToken?: string
  ): Promise<{ type: 'text'; text: string }> {
    // Ensure we have a valid public token
    const accessToken = await this.ensurePublicToken(
      input.accessToken || providedToken
    );

    // Process style IDs to get username/styleId format
    const beforeStyleId = this.processStyleId(input.before, accessToken);
    const afterStyleId = this.processStyleId(input.after, accessToken);

    // Build the comparison URL
    const params = new URLSearchParams();
    params.append('access_token', accessToken);
    params.append('before', beforeStyleId);
    params.append('after', afterStyleId);

    const url = `https://agent.mapbox.com/tools/style-compare?${params.toString()}`;

    return {
      type: 'text',
      text: url
    };
  }
}
