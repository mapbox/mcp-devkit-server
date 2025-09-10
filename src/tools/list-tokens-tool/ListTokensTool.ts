import { fetchClient } from '../../utils/fetchRequest.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { ListTokensSchema, ListTokensInput } from './ListTokensTool.schema.js';

export class ListTokensTool extends MapboxApiBasedTool<
  typeof ListTokensSchema
> {
  readonly name = 'list_tokens_tool';
  readonly description =
    'List Mapbox access tokens for the authenticated user with optional filtering and pagination. When using pagination, the "start" parameter must be obtained from the "next_start" field of the previous response (it is not a token ID)';

  constructor(private fetchImpl: typeof fetch = fetchClient) {
    super({ inputSchema: ListTokensSchema });
  }

  protected async execute(
    input: ListTokensInput,
    accessToken?: string
  ): Promise<{ type: 'text'; text: string }> {
    if (!accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is not set');
    }

    const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);

    this.log(
      'info',
      `ListTokensTool: Starting token list with filters: ${JSON.stringify(input)}`
    );

    // Build initial query parameters
    const params = new URLSearchParams();
    params.append('access_token', accessToken);

    if (input.default !== undefined) {
      params.append('default', String(input.default));
    }
    if (input.limit !== undefined) {
      params.append('limit', String(input.limit));
    }
    if (input.sortby) {
      params.append('sortby', input.sortby);
    }
    if (input.start) {
      params.append('start', input.start);
    }
    if (input.usage) {
      params.append('usage', input.usage);
    }

    let url: string | null =
      `${MapboxApiBasedTool.mapboxApiEndpoint}tokens/v2/${username}?${params.toString()}`;
    const allTokens: unknown[] = [];
    let pageCount = 0;
    let nextPageUrl: string | null = null;

    // Only auto-paginate if no start parameter is provided (not doing manual pagination)
    // and no limit is specified (limit means user wants specific number of results)
    const shouldAutoPaginate = !input.start && !input.limit;

    try {
      // Fetch pages
      while (url) {
        pageCount++;
        this.log('info', `ListTokensTool: Fetching page ${pageCount}`);
        this.log('debug', `ListTokensTool: Fetching URL: ${url}`);

        const response = await this.fetchImpl(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorBody = await response.text();
          this.log(
            'error',
            `ListTokensTool: API Error - Status: ${response.status}, Body: ${errorBody}`
          );
          throw new Error(
            `Failed to list tokens: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        // Handle both array response and object with tokens property
        const tokens = Array.isArray(data)
          ? data
          : (data as { tokens?: unknown[] }).tokens || [];

        allTokens.push(...tokens);
        this.log(
          'info',
          `ListTokensTool: Retrieved ${tokens.length} tokens on page ${pageCount}`
        );

        // Check for next page
        url = null;
        const linkHeader = response.headers.get('Link');
        if (linkHeader) {
          const links = this.parseLinkHeader(linkHeader);
          if (links.next) {
            // Ensure the next URL includes the access token
            const nextUrl = new URL(links.next);
            if (!nextUrl.searchParams.has('access_token')) {
              nextUrl.searchParams.append('access_token', accessToken);
            }
            const nextUrlString = nextUrl.toString();

            if (shouldAutoPaginate) {
              url = nextUrlString;
              this.log('info', `ListTokensTool: Next page available: ${url}`);
            } else {
              // For manual pagination, extract the start parameter from the next URL
              const nextUrl = new URL(links.next);
              const startParam = nextUrl.searchParams.get('start');
              if (startParam) {
                nextPageUrl = startParam;
                this.log(
                  'info',
                  `ListTokensTool: Next page start token saved for manual pagination: ${nextPageUrl}`
                );
              }
            }
          }
        }
      }

      this.log(
        'info',
        `ListTokensTool: Successfully retrieved ${allTokens.length} total tokens across ${pageCount} page(s)`
      );

      // Format the response
      const result: { tokens: unknown[]; count: number; next_start?: string } =
        {
          tokens: allTokens,
          count: allTokens.length
        };

      // Include next page start token if available and we're doing manual pagination
      if (nextPageUrl && (input.limit || input.start)) {
        result.next_start = nextPageUrl;
      }

      return {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to list tokens: ${String(error)}`);
    }
  }

  /**
   * Parse the Link header for pagination information
   */
  private parseLinkHeader(linkHeader: string): Record<string, string> {
    const links: Record<string, string> = {};
    const parts = linkHeader.split(',');

    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        const [, url, rel] = match;
        links[rel] = url;
      }
    }

    return links;
  }
}
