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
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import type { ToolExecutionContext } from '../utils/tracing.js';
import { createToolExecutionContext } from '../utils/tracing.js';

/** Token prefixes Mapbox uses: public, secret, and temporary. */
const TOKEN_PREFIXES = new Set(['pk', 'sk', 'tk']);

/**
 * Character allowlist for an account name lifted out of a token payload, matching the
 * username validation in StyleComparisonTool. This bounds what a token payload can put
 * into a span attribute or log line; it is not a statement of Mapbox's account naming
 * rules. A name outside it is not partially disclosed — it falls back to `***`.
 */
const ACCOUNT_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Replace a token value with a placeholder that keeps the parts safe to publish.
 *
 * Mapbox tokens are JWTs (`<prefix>.<payload>.<signature>`) whose payload carries
 * the account name under `u`, so `pk.eyJ1IjoiZXhhbXBsZSJ9.signature` becomes
 * `pk.example.redacted`. Keeping the prefix and account name makes traces and logs
 * readable — you can still tell a secret token from a public one, and whose account
 * a request billed to — while the signature, which is the part that authenticates,
 * never leaves the process.
 *
 * Anything that does not parse cleanly as such a token falls back to `***`, so an
 * unrecognized shape is never partially disclosed on the assumption it was harmless.
 */
function maskTokenValue(token: string): string {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return '***';
  }

  const [prefix, payload] = parts;
  if (!TOKEN_PREFIXES.has(prefix)) {
    return '***';
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64').toString('utf-8')
    ) as { u?: unknown };

    if (
      typeof decoded.u !== 'string' ||
      !ACCOUNT_NAME_PATTERN.test(decoded.u)
    ) {
      return '***';
    }

    return `${prefix}.${decoded.u}.redacted`;
  } catch {
    return '***';
  }
}

/** Remove access_token query parameter values from strings before logging or returning to callers. */
export function redactToken(s: string): string {
  return s.replace(
    /access_token=([^&\s#"']+)/g,
    (_match, token: string) => `access_token=${maskTokenValue(token)}`
  );
}

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

    let toolContext: ToolExecutionContext | undefined;

    try {
      const input = this.inputSchema.parse(rawInput);

      // Create tool execution context - tracing is handled by the HTTP client
      toolContext = {
        ...createToolExecutionContext(
          this.name,
          0, // Input size not needed since tracing is in HTTP client
          this.httpRequest,
          extra
        ),
        httpRequest: this.httpRequest
      };

      // Execute tool within the tool span context to connect all child spans
      const result = await context.with(
        trace.setSpan(context.active(), toolContext.span),
        async () => {
          return await this.execute(input, accessToken, toolContext!);
        }
      );

      // Mark span as successful and end it
      toolContext.span.setStatus({ code: SpanStatusCode.OK });
      toolContext.span.end();
      return result;
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const errorMessage = redactToken(rawMessage);
      this.log(
        'error',
        `${this.name}: Error during execution: ${errorMessage}`
      );

      // Mark span as failed and end it
      if (toolContext?.span) {
        toolContext.span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage
        });
        toolContext.span.end();
      }

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

  protected handleValidationError(error: unknown): CallToolResult {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Unexpected API response format from Mapbox API: ${error instanceof Error ? error.message : 'Unknown validation error'}`
        }
      ]
    };
  }

  /**
   * Tool logic to be implemented by subclasses.
   * Must return a complete OutputSchema with content and optional structured content.
   */
  protected abstract execute(
    _input: z.infer<InputSchema>,
    accessToken: string,
    context: ToolExecutionContext
  ): Promise<CallToolResult>;
}
