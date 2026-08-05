// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { createHash } from 'node:crypto';
import { ElicitResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { HttpRequest } from './types.js';

/**
 * The per-call `sendRequest` a tool receives via `RequestHandlerExtra` — bound
 * correctly to whichever session actually made the current call, unlike a `Server`
 * instance stashed on `this` (see {@link elicitPreviewToken} for why that matters).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SendRequest = RequestHandlerExtra<any, any>['sendRequest'];

/**
 * Thrown when the elicitation request itself could not be delivered or answered —
 * most commonly because the connected client doesn't implement elicitation at all, so
 * `sendRequest` rejects (e.g. with a "method not found" style protocol error) rather
 * than resolving with a real `ElicitResult`. Distinguished from a normal decline/cancel
 * (a *successful* response the user just said no to) so callers can fall back to a
 * cached token instead of surfacing a scary error for something the user never saw.
 */
export class ElicitationUnavailableError extends Error {}

/**
 * Token choice options for preview token elicitation
 */
export type TokenChoice = 'provide' | 'create' | 'auto';

/**
 * A literal Mapbox temporary token (`tk.*`) is scoped to a single short-lived
 * session and is not granted `tokens:write`, so attempting to create a new
 * token with one is a guaranteed API rejection. This is a narrow, string-shape
 * check on the server's own access token (e.g. `MAPBOX_ACCESS_TOKEN=tk...`) —
 * it lets callers skip a doomed round trip to the Tokens API in that specific
 * case.
 *
 * It is not a general test for "can this token create tokens". Servers that
 * embed this package behind their own auth (for example, an OAuth-based
 * hosted deployment) may pass through a bearer that isn't shaped like a
 * Mapbox token at all yet still lacks `tokens:write` for its own reasons —
 * this check can't see that, and the create/auto-create paths fall through to
 * the Tokens API and surface whatever error it returns (see
 * {@link createPreviewToken}).
 */
export function isTemporaryServerToken(accessToken: string): boolean {
  return accessToken.startsWith('tk.');
}

/**
 * Result of an attempt to create a new preview token via the Mapbox Tokens API.
 */
export interface CreatePreviewTokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Result of token elicitation
 */
export interface ElicitedTokenInfo {
  choice: TokenChoice;
  token?: string;
  urlRestrictions?: string[];
  tokenNote?: string;
}

/**
 * Existing token info for display
 */
export interface ExistingTokenInfo {
  id: string;
  note: string;
  scopes: string[];
}

/**
 * Elicits preview token information from the user via MCP elicitation.
 * This keeps the token out of chat history for better security.
 *
 * Takes the per-call `extra.sendRequest` from `RequestHandlerExtra`, not a `Server`
 * instance. `Server#elicitInput()` would be the obvious choice, but it reads from
 * `this` — and a tool that stashes its `Server` on `this.server` in `installTo()` and
 * reads it back later in `execute()` is reading *shared, mutable* state: if the same
 * tool instance is ever reused across multiple concurrent sessions (singleton tool
 * instances installed onto a new session's server on every connection — exactly what
 * `CORE_TOOLS` are, and what mcp-server's own scripts/dev-http-server.ts and
 * hosted-mcp-server's request handling both do), `this.server` durably points at
 * whichever session connected *last*, not whichever session is making *this* call.
 * That sends the "paste your token" prompt to a different, uninvolved client, and
 * whatever it submits comes back as this call's result — a real cross-session
 * hijack, not a hypothetical. `extra.sendRequest` is supplied fresh per call by the
 * SDK, correctly scoped to the session that made the current request, so it can't be
 * clobbered by another session connecting in between.
 *
 * @param sendRequest - The current call's `extra.sendRequest`
 * @param existingTokens - List of user's existing public tokens
 * @param canCreateTokens - Whether the server's own access token is able to create
 *   new tokens. When false (the server is authenticated with a `tk.*` temporary
 *   token, see {@link isTemporaryServerToken}), the "create" and "auto" options are
 *   omitted from the dialog entirely, since selecting them would only fail against
 *   the Mapbox API. Defaults to `true` for callers that haven't checked.
 * @returns Elicited token information based on user's choice
 * @throws {ElicitationUnavailableError} if the client can't be asked at all (e.g. it
 *   doesn't implement elicitation)
 * @throws {Error} if the client was asked but the user declined or cancelled
 */
export async function elicitPreviewToken(
  sendRequest: SendRequest,
  existingTokens: ExistingTokenInfo[],
  canCreateTokens = true
): Promise<ElicitedTokenInfo> {
  const hasExistingTokens = existingTokens.length > 0;
  const tokenList = hasExistingTokens
    ? existingTokens
        .map((t) => `- ${t.note || t.id}: ${t.scopes.join(', ')}`)
        .join('\n')
    : 'No existing public tokens found.';

  const choices: TokenChoice[] = canCreateTokens
    ? ['provide', 'create', 'auto']
    : ['provide'];
  const choiceNames = canCreateTokens
    ? [
        'I have a token to provide',
        'Create a new preview token with custom settings',
        'Auto-create a basic preview token for me'
      ]
    : ['I have a token to provide'];

  const creationNote = canCreateTokens
    ? 'For best security, consider using a URL-restricted token that only works on your domains.'
    : "This server is authenticated with a temporary session token, which can't create new " +
      'Mapbox tokens. Paste an existing public token (pk.*) with styles:read scope below.';

  // Mirrors what Server#elicitInput() builds internally (method + form-mode params),
  // but sent via the current call's own sendRequest rather than a stashed Server.
  let result;
  try {
    result = await sendRequest(
      {
        method: 'elicitation/create',
        params: {
          mode: 'form',
          message: `Preview Token Setup

Preview URLs require a public token with styles:read scope. This token will be visible in the preview URL.

${hasExistingTokens ? 'Your existing public tokens:\n' + tokenList : tokenList}

${creationNote}`,
          requestedSchema: {
            type: 'object',
            properties: {
              choice: {
                type: 'string',
                title: 'Token Option',
                description: 'How would you like to provide the preview token?',
                enum: choices,
                enumNames: choiceNames
              },
              token: {
                type: 'string',
                title: 'Your Token',
                description:
                  'Paste your public Mapbox token here (must have styles:read scope)',
                minLength: 10
              },
              tokenNote: {
                type: 'string',
                title: 'Token Name (Optional)',
                description:
                  'A descriptive name for your new token (e.g., "Preview Token - Production")',
                maxLength: 256
              },
              urlRestrictions: {
                type: 'string',
                title: 'URL Restrictions (Optional)',
                description:
                  'Comma-separated URLs to restrict token usage (e.g., "https://yourdomain.com/*,https://staging.yourdomain.com/*")'
              }
            },
            required: ['choice']
          }
        }
      },
      ElicitResultSchema
    );
  } catch (error) {
    throw new ElicitationUnavailableError(
      error instanceof Error ? error.message : String(error)
    );
  }

  // Check if user accepted or declined
  if (result.action !== 'accept' || !result.content) {
    throw new Error('Token elicitation was cancelled or declined by user');
  }

  // Parse the result
  const choice = (result.content.choice as TokenChoice) || choices[0];
  const token = result.content.token as string | undefined;
  const tokenNote = result.content.tokenNote as string | undefined;
  const urlRestrictionsStr = result.content.urlRestrictions as
    | string
    | undefined;

  const urlRestrictions = urlRestrictionsStr
    ? urlRestrictionsStr
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
    : undefined;

  return {
    choice,
    token,
    urlRestrictions,
    tokenNote
  };
}

/**
 * Derives a `previewTokenStorage` cache key from the server's own access token, rather
 * than from the username decoded out of it. `getUserNameFromToken` never verifies a
 * JWT's signature — it just base64-decodes the payload — so an unverified `u` claim is
 * not a safe cache key: two different presented tokens could decode to the same
 * username without this process ever independently confirming that. Hosted deployments
 * (e.g. hosted-mcp-server) verify the bearer upstream before it reaches this code, but
 * this package is also usable standalone or behind other gateways that may not, so the
 * cache itself shouldn't depend on that assumption. Hashing the full token ties the
 * cache slot to the exact credential presented instead.
 */
export function cacheKeyFor(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Session-level storage for preview token preferences, keyed by {@link cacheKeyFor}.
 * In a real implementation, this could be stored in a database or cache.
 */
class PreviewTokenStorage {
  private tokenCache = new Map<string, string>();

  /**
   * Store a preview token under the given cache key
   */
  set(cacheKey: string, token: string): void {
    this.tokenCache.set(cacheKey, token);
  }

  /**
   * Get the stored preview token for the given cache key
   */
  get(cacheKey: string): string | undefined {
    return this.tokenCache.get(cacheKey);
  }

  /**
   * Clear the stored token for the given cache key
   */
  clear(cacheKey: string): void {
    this.tokenCache.delete(cacheKey);
  }

  /**
   * Clear all stored tokens
   */
  clearAll(): void {
    this.tokenCache.clear();
  }
}

/**
 * Global preview token storage instance
 */
export const previewTokenStorage = new PreviewTokenStorage();

/**
 * Lists the user's existing public tokens with `styles:read` scope, to show as options
 * during elicitation. Goes through the shared HttpPipeline rather than a bare `fetch`,
 * so retry/User-Agent policies and span redaction apply to this call like any other
 * Mapbox API request. Failures are treated as non-fatal (an empty list) since this is
 * only used to populate a picker, not required for the elicitation flow to work.
 */
export async function listPublicPreviewTokens(
  httpRequest: HttpRequest,
  mapboxApiEndpoint: string,
  accessToken: string,
  userName: string
): Promise<ExistingTokenInfo[]> {
  try {
    const response = await httpRequest(
      `${mapboxApiEndpoint}tokens/v2/${encodeURIComponent(userName)}?access_token=${accessToken}`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const tokens = data as Array<{
      id: string;
      note: string;
      scopes: string[];
      token?: string;
    }>;

    return tokens
      .filter(
        (t) => t.token?.startsWith('pk.') && t.scopes.includes('styles:read')
      )
      .map((t) => ({
        id: t.id,
        note: t.note || t.id,
        scopes: t.scopes
      }));
  } catch {
    return [];
  }
}

/**
 * Creates a new preview token via the Mapbox Tokens API, scoped to the minimum needed
 * for a style/comparison preview URL (`styles:read`, `styles:tiles`, `fonts:read` — all
 * public scopes, so the API is guaranteed to hand back a `pk.*` token rather than `sk.*`;
 * `styles:download` in particular is a secret-only scope and must not be requested here).
 *
 * Skips the request and returns a structured failure immediately when the server's own
 * access token is a literal Mapbox temporary token (`tk.*`, see
 * {@link isTemporaryServerToken}) — that shape is a guaranteed rejection. Any other
 * caller that lacks `tokens:write` (for instance a hosted deployment's own auth bearer,
 * which isn't shaped like a Mapbox token at all) isn't detectable ahead of time, so that
 * case falls through to the API call below and gets a scope-shortage hint appended to
 * whatever error the Tokens API returns.
 */
export async function createPreviewToken(
  httpRequest: HttpRequest,
  mapboxApiEndpoint: string,
  accessToken: string,
  userName: string,
  note?: string,
  urlRestrictions?: string[]
): Promise<CreatePreviewTokenResult> {
  if (isTemporaryServerToken(accessToken)) {
    return {
      success: false,
      error:
        "This server is authenticated with a temporary session token (tk.*), which can't " +
        'create new Mapbox tokens. Provide an existing public token (pk.*) instead, either ' +
        'via the elicitation dialog\'s "I have a token to provide" option or the ' +
        '`accessToken` parameter.'
    };
  }

  try {
    const tokenNote =
      note || `MCP Preview Token - ${new Date().toISOString().split('T')[0]}`;

    const body: {
      note: string;
      scopes: string[];
      allowedUrls?: string[];
    } = {
      note: tokenNote,
      scopes: ['styles:read', 'styles:tiles', 'fonts:read']
    };

    if (urlRestrictions && urlRestrictions.length > 0) {
      body.allowedUrls = urlRestrictions;
    }

    const response = await httpRequest(
      `${mapboxApiEndpoint}tokens/v2/${encodeURIComponent(userName)}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let message = `Failed to create token: ${response.status} ${errorText}`;

      // Creating a token always requires `tokens:write` on the caller's own access
      // token, so a 401/403 here is a permission problem — surface the same
      // scope-shortage hint MapboxApiBasedTool#handleApiError gives other tools,
      // rather than leaving the caller to guess from a bare status code and body.
      const looksLikePermissionError =
        response.status === 401 ||
        response.status === 403 ||
        /scope|permission/i.test(errorText);
      if (looksLikePermissionError) {
        message +=
          '\n\nThis looks like a scope/permission issue: creating a token requires ' +
          "`tokens:write` on the caller's own access token. If you're running behind a " +
          'hosted or proxied deployment, that token may not carry it even though it ' +
          'works for other operations. Use "I have a token to provide" with an ' +
          'existing public token instead.';
      }

      return {
        success: false,
        error: message
      };
    }

    const data = (await response.json()) as { token: string };

    if (!data.token.startsWith('pk.')) {
      return {
        success: false,
        error: `API returned a non-public token (${data.token.substring(0, 3)}...). Preview tokens must be public tokens (pk.*) that can be safely exposed in URLs.`
      };
    }

    return {
      success: true,
      token: data.token
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error creating token'
    };
  }
}
