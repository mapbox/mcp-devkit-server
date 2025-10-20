// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ZodTypeAny, z } from 'zod';
import { BaseTool } from './BaseTool.js';
import type {
  CallToolResult,
  ToolAnnotations
} from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../utils/types.js';

/**
 * Standard error response format from Mapbox API
 */
interface MapboxApiError {
  message?: string;
  [key: string]: unknown;
}

export abstract class MapboxApiBasedTool<
  InputSchema extends ZodTypeAny,
  OutputSchema extends ZodTypeAny = ZodTypeAny
> extends BaseTool<InputSchema, OutputSchema> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly annotations: ToolAnnotations;

  static get mapboxAccessToken() {
    return process.env.MAPBOX_ACCESS_TOKEN;
  }

  static get mapboxApiEndpoint() {
    return process.env.MAPBOX_API_ENDPOINT || 'https://api.mapbox.com/';
  }

  protected httpRequest: HttpRequest;

  constructor(params: {
    inputSchema: InputSchema;
    outputSchema?: OutputSchema;
    httpRequest: HttpRequest;
  }) {
    super(params);
    this.httpRequest = params.httpRequest;
  }

  /**
   * Validates if a string has the format of a JWT token (header.payload.signature)
   * Docs: https://docs.mapbox.com/api/accounts/tokens/#token-format
   * @param token The token string to validate
   * @returns boolean indicating if the token has valid JWT format
   */
  private isValidJwtFormat(token: string): boolean {
    // JWT consists of three parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Check that all parts are non-empty
    return parts.every((part) => part.length > 0);
  }

  /**
   * Validates and runs the tool logic.
   */
  async run(
    rawInput: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extra?: RequestHandlerExtra<any, any>
  ): Promise<CallToolResult> {
    try {
      // First check if token is provided via authentication context
      // Check both standard token field and accessToken in extra for compatibility
      // In the streamableHttp, the authInfo is injected into extra from `req.auth`
      // https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/server/streamableHttp.ts#L405
      const authToken = extra?.authInfo?.token;
      const accessToken = authToken || MapboxApiBasedTool.mapboxAccessToken;
      if (!accessToken) {
        const errorMessage =
          'No access token available. Please provide via Bearer auth or MAPBOX_ACCESS_TOKEN env var';
        this.log('error', `${this.name}: ${errorMessage}`);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true
        };
      }

      // Validate that the token has the correct JWT format
      if (!this.isValidJwtFormat(accessToken)) {
        const errorMessage = 'Access token is not in valid JWT format';
        this.log('error', `${this.name}: ${errorMessage}`);
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true
        };
      }

      const input = this.inputSchema.parse(rawInput);
      const result = await this.execute(input, accessToken);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.log(
        'error',
        `${this.name}: Error during execution: ${errorMessage}`
      );

      return {
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handles HTTP error responses from Mapbox API.
   * Attempts to parse the error response body to extract helpful messages.
   *
   * @param response - The failed HTTP response
   * @param operation - Description of the operation that failed (e.g., "list styles", "create token")
   * @returns A CallToolResult with error details
   */
  protected async handleApiError(
    response: Response,
    operation: string
  ): Promise<CallToolResult> {
    let errorMessage = `Failed to ${operation}: ${response.status} ${response.statusText}`;

    try {
      // Try to parse the response as JSON to get more details
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = (await response.json()) as MapboxApiError;

        // Mapbox API typically returns { "message": "..." } for errors
        if (errorData.message) {
          errorMessage = `Failed to ${operation}: ${errorData.message}`;

          // Check if it's a scope/permission error
          if (
            errorData.message.toLowerCase().includes('scope') ||
            errorData.message.toLowerCase().includes('permission')
          ) {
            errorMessage +=
              '\n\nThis operation requires a token with appropriate scopes. Please check your MAPBOX_ACCESS_TOKEN has the necessary permissions.';
          }
        }
      } else {
        // If not JSON, try to get text
        const errorText = await response.text();
        if (errorText) {
          errorMessage += `\n${errorText}`;
        }
      }
    } catch (parseError) {
      // If we can't parse the error body, just use the basic message
      this.log('warning', `Failed to parse error response: ${parseError}`);
    }

    this.log('error', `${this.name}: ${errorMessage}`);

    return {
      content: [
        {
          type: 'text',
          text: errorMessage
        }
      ],
      isError: true
    };
  }

  /**
   * Tool logic to be implemented by subclasses.
   * Must return a complete OutputSchema with content and optional structured content.
   */
  protected abstract execute(
    _input: z.infer<InputSchema>,
    accessToken: string
  ): Promise<CallToolResult>;
}
