// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  ListTokensSchema,
  ListTokensInput
} from './ListTokensTool.input.schema.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import {
  ListTokensOutputSchema,
  TokenObjectSchema
} from './ListTokensTool.output.schema.js';

export class ListTokensTool extends MapboxApiBasedTool<
  typeof ListTokensSchema,
  typeof ListTokensOutputSchema
> {
  readonly name = 'list_tokens_tool';
  readonly description =
    'List Mapbox access tokens for the authenticated user with optional filtering and pagination. When using pagination, the "start" parameter must be obtained from the "next_start" field of the previous response (it is not a token ID)';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: 'List Mapbox Tokens Tool'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: ListTokensSchema,
      outputSchema: ListTokensOutputSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: ListTokensInput,
    accessToken?: string
  ): Promise<CallToolResult> {
    if (!accessToken) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'MAPBOX_ACCESS_TOKEN is not set'
          }
        ]
      };
    }

    let userName;
    try {
      userName = getUserNameFromToken(accessToken);
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Invalid access token: ${(error as Error).message}`
          }
        ]
      };
    }

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
      `${MapboxApiBasedTool.mapboxApiEndpoint}tokens/v2/${userName}?${params.toString()}`;
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

        const response = await this.httpRequest(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          return this.handleApiError(response, 'list tokens');
        }

        const data = await response.json();

        // Handle both array response and object with tokens property
        const tokens = Array.isArray(data)
          ? data
          : (data as { tokens?: unknown[] }).tokens || [];

        // Validate tokens array against TokenObjectSchema
        const parseResult = TokenObjectSchema.array().safeParse(tokens);
        if (!parseResult.success) {
          this.log(
            'error',
            `ListTokensTool: Token array schema validation failed\n${parseResult.error}`
          );
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `ListTokensTool: Response does not conform to token array schema:\n${parseResult.error}`
              }
            ]
          };
        }
        allTokens.push(...parseResult.data);
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
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ],
        structuredContent: result,
        isError: false
      };
    } catch (error) {
      this.log('error', `ListTokensTool: Unexpected error: ${error}`);
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `ListTokensTool: Unexpected error: ${error}`
          }
        ]
      };
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
