// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { HttpRequest } from './types.js';

/**
 * Token choice options for preview token elicitation
 */
export type TokenChoice = 'provide' | 'create' | 'auto';

/**
 * Mapbox's Tokens API rejects requests to create a token when the caller is
 * authenticated with a temporary token (`tk.*`) — temporary tokens are scoped
 * to a single short-lived session and are never granted `tokens:write`. This
 * is the case for the hosted MCP DevKit Server, which authenticates each
 * request with a per-session `tk.*` token rather than the caller's own
 * pk./sk. token. Detecting this upfront lets callers skip a doomed API round
 * trip and steer the user straight to "provide an existing token" instead.
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
 * @param server - MCP Server instance
 * @param existingTokens - List of user's existing public tokens
 * @param canCreateTokens - Whether the server's own access token is able to create
 *   new tokens. When false (the server is authenticated with a `tk.*` temporary
 *   token, see {@link isTemporaryServerToken}), the "create" and "auto" options are
 *   omitted from the dialog entirely, since selecting them would only fail against
 *   the Mapbox API. Defaults to `true` for callers that haven't checked.
 * @returns Elicited token information based on user's choice
 */
export async function elicitPreviewToken(
  server: Server,
  existingTokens: ExistingTokenInfo[],
  canCreateTokens = true
): Promise<ElicitedTokenInfo> {
  const hasExistingTokens = existingTokens.length > 0;
  const tokenList = hasExistingTokens
    ? existingTokens
        .map((t) => `- ${t.note || t.id}: ${t.scopes.join(', ')}`)
        .join('\n')
    : 'No existing public tokens found.';

  const choices = canCreateTokens
    ? (['provide', 'create', 'auto'] as const)
    : (['provide'] as const);
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

  const result = await server.elicitInput({
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
  });

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
 * Session-level storage for preview token preferences.
 * In a real implementation, this could be stored in a database or cache.
 */
class PreviewTokenStorage {
  private tokenCache = new Map<string, string>();

  /**
   * Store a preview token for a specific username
   */
  set(username: string, token: string): void {
    this.tokenCache.set(username, token);
  }

  /**
   * Get stored preview token for a username
   */
  get(username: string): string | undefined {
    return this.tokenCache.get(username);
  }

  /**
   * Clear stored token for a username
   */
  clear(username: string): void {
    this.tokenCache.delete(username);
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
 * Returns a structured failure instead of throwing when the server's own access token is
 * a temporary `tk.*` token (see {@link isTemporaryServerToken}) — the Tokens API rejects
 * token-creation requests from those, so this is checked before making the request rather
 * than surfacing whatever generic error the API happens to return for it.
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
      return {
        success: false,
        error: `Failed to create token: ${response.status} ${errorText}`
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
