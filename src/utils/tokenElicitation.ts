// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { createHash, randomUUID } from 'node:crypto';
import {
  ElicitResultSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { redactToken } from '../tools/MapboxApiBasedTool.js';
import {
  localHttpTokenCollectionHandler,
  type TokenCollectionHandler
} from './tokenCollectionServer.js';
import type { HttpRequest } from './types.js';

/**
 * The per-call `sendRequest`/`sendNotification` a tool receives via `RequestHandlerExtra`
 * — bound correctly to whichever session actually made the current call, unlike a
 * `Server` instance stashed on `this` (see {@link elicitPreviewToken} for why that
 * matters).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SendRequest = RequestHandlerExtra<any, any>['sendRequest'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SendNotification = RequestHandlerExtra<any, any>['sendNotification'];

/**
 * How long to wait for the client to answer an elicitation prompt before giving up.
 * Set explicitly (matching the SDK's own `DEFAULT_REQUEST_TIMEOUT_MSEC`) rather than
 * omitting `timeout` and letting the SDK default apply implicitly — a future SDK bump
 * changing that constant shouldn't silently change how long a session-holding-open
 * elicitation call can be kept pending. A human genuinely filling out the dialog needs
 * on the order of tens of seconds; a client that never answers at all (accidentally or
 * as a resource-exhaustion attempt — each pending call ties up its session's live
 * connection for the duration) shouldn't be able to hold the request open indefinitely.
 * Capping the number of *concurrent* pending elicitations a single deployment will
 * tolerate is an infrastructure-level concern (rate limiting, connection limits) outside
 * what this package can enforce on its own.
 */
const ELICITATION_TIMEOUT_MSEC = 60_000;

/** Real Mapbox tokens are well under this; anything longer is almost certainly not a
 * token at all. Enforced against whatever a user submits via URL-mode token collection
 * (see {@link validatePublicPreviewToken}) — the local collection page's own `maxLength`
 * attribute is advisory only, since it's just client-side HTML. */
const MAX_TOKEN_LENGTH = 2048;

/**
 * How long to wait for the out-of-band URL-mode collection flow to complete once the
 * user has agreed to open the link — separate from, and much longer than,
 * {@link ELICITATION_TIMEOUT_MSEC}, since this step requires a human to actually open a
 * browser and type something, not just click a button in an already-open dialog.
 */
const URL_MODE_COLLECTION_TIMEOUT_MSEC = 5 * 60_000;

/**
 * Opt-in, not opt-out: defaults to disabled, and must be set to `"true"` to enable
 * URL-mode token collection. When disabled (the default), the "provide" choice falls
 * straight back to the "client does not support elicitation, please provide accessToken
 * directly" message.
 *
 * The default {@link TokenCollectionHandler} (`localHttpTokenCollectionHandler`) starts
 * a server bound to `127.0.0.1` on *this* process's own machine — correct only when this
 * package runs as a local stdio server, and wrong for any deployment where this process
 * runs somewhere other than the end user's own machine (e.g. hosted-mcp-server, a cloud
 * deployment): there, the URL would point at the *browser's* loopback interface, where
 * nothing is listening. This package's own stdio entry point (`src/index.ts`) is the
 * only context confirmed safe, so it opts in there explicitly (unless the environment
 * already set this var, which is left untouched); every other embedder — this package
 * used as a library, a test harness, a future unknown embedder — stays safe by default
 * and must deliberately opt in only after confirming the same machine/browser
 * relationship holds, rather than relying on every embedder remembering to opt out.
 */
function isLocalUrlElicitationEnabled(): boolean {
  return process.env.ENABLE_LOCAL_URL_ELICITATION === 'true';
}

const MAX_TOKEN_NOTE_LENGTH = 256;

/** Matches CreateTokenTool's own `allowedUrls` cap. */
const MAX_URL_RESTRICTIONS = 100;

/** Bounds the raw comma-separated `urlRestrictions` string before it's split into an
 * array. The array-length cap above only limits the *parsed* result — nothing stops a
 * client from returning one unsplit string far larger than 100 short URLs would ever
 * require, so this is enforced independently and before the `.split()` call. */
const MAX_URL_RESTRICTIONS_RAW_LENGTH = 4096;

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
 * Result of the initial (form-mode) token-choice elicitation. Deliberately does not
 * carry a token value — see {@link collectProvidedToken} for how the `'provide'` choice
 * is followed up on. `tokenNote`/`urlRestrictions` are non-sensitive configuration for
 * the `'create'` choice, not credentials, so they stay in form mode.
 */
export interface ElicitedTokenInfo {
  choice: TokenChoice;
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
      'Mapbox tokens. Choose "I have a token to provide" below.';

  // Mirrors what Server#elicitInput() builds internally (method + form-mode params),
  // but sent via the current call's own sendRequest rather than a stashed Server. Note
  // there is no `token` field here: the MCP spec requires credentials to be collected
  // via URL-mode elicitation, not form mode (see collectProvidedToken below) — only
  // non-sensitive choice/configuration fields belong in this dialog.
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

${creationNote}

If you choose "I have a token to provide", you'll get a separate link to submit it securely — the token itself is never entered into this form.`,
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
                  'Comma-separated URLs to restrict token usage (e.g., "https://yourdomain.com/*,https://staging.yourdomain.com/*")',
                maxLength: MAX_URL_RESTRICTIONS_RAW_LENGTH
              }
            },
            required: ['choice']
          }
        }
      },
      ElicitResultSchema,
      { timeout: ELICITATION_TIMEOUT_MSEC }
    );
  } catch (error) {
    if (
      error instanceof McpError &&
      (error.code === ErrorCode.RequestTimeout ||
        (error.code === ErrorCode.InvalidRequest &&
          /cancelled/i.test(error.message)))
    ) {
      // The client understood the request and either never answered it in time, or
      // the caller aborted it — distinct from a client that doesn't implement
      // elicitation at all. Re-thrown as-is (not wrapped as "unavailable") so callers
      // surface it instead of silently falling back to a stale cached token: a caller
      // passing `useCustomToken: true` explicitly wants a fresh answer, not the token
      // this call was meant to replace.
      throw error;
    }
    throw new ElicitationUnavailableError(
      error instanceof Error ? error.message : String(error)
    );
  }

  // Check if user accepted or declined
  if (result.action !== 'accept' || !result.content) {
    throw new Error('Token elicitation was cancelled or declined by user');
  }

  // Parse the result. requestedSchema above is only a hint for the client's own form
  // UI — nothing stops a client (malicious, or just not honoring it) from returning a
  // differently-shaped payload, so every field's runtime type is checked explicitly
  // rather than blindly cast. An unchecked cast here previously let a non-string
  // token silently skip the length guard below, and let a non-string urlRestrictions
  // reach `.split()` and throw an unclassified TypeError instead of a clear error.
  const rawChoice = result.content.choice;
  if (
    typeof rawChoice !== 'string' ||
    !choices.includes(rawChoice as TokenChoice)
  ) {
    throw new Error(
      `Client returned an unrecognized token choice (${JSON.stringify(rawChoice)}); expected one of: ${choices.join(', ')}.`
    );
  }
  const choice = rawChoice as TokenChoice;

  const tokenNote = result.content.tokenNote;
  if (tokenNote !== undefined && typeof tokenNote !== 'string') {
    throw new Error(
      'Client returned a non-string value for the tokenNote field.'
    );
  }

  const urlRestrictionsStr = result.content.urlRestrictions;
  if (
    urlRestrictionsStr !== undefined &&
    typeof urlRestrictionsStr !== 'string'
  ) {
    throw new Error(
      'Client returned a non-string value for the urlRestrictions field.'
    );
  }
  if (
    urlRestrictionsStr !== undefined &&
    urlRestrictionsStr.length > MAX_URL_RESTRICTIONS_RAW_LENGTH
  ) {
    throw new Error(
      `Provided urlRestrictions value is ${urlRestrictionsStr.length} characters, which exceeds the ${MAX_URL_RESTRICTIONS_RAW_LENGTH}-character maximum.`
    );
  }

  const urlRestrictions = urlRestrictionsStr
    ? urlRestrictionsStr
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
    : undefined;

  // The requestedSchema's minLength/maxLength are hints for the client's own form UI,
  // not a security boundary — nothing stops a client (malicious, or just not honoring
  // the hints) from returning arbitrary content.
  if (tokenNote !== undefined && tokenNote.length > MAX_TOKEN_NOTE_LENGTH) {
    throw new Error(
      `Token name is ${tokenNote.length} characters, which exceeds the ${MAX_TOKEN_NOTE_LENGTH}-character maximum.`
    );
  }
  if (
    urlRestrictions !== undefined &&
    urlRestrictions.length > MAX_URL_RESTRICTIONS
  ) {
    throw new Error(
      `Provided ${urlRestrictions.length} URL restrictions, which exceeds the ${MAX_URL_RESTRICTIONS}-URL maximum.`
    );
  }

  return {
    choice,
    urlRestrictions,
    tokenNote
  };
}

/**
 * Validates a candidate preview token submitted through URL-mode collection. Applies
 * the exact same rules every other path that produces a preview token already enforces
 * (the `accessToken` input parameter, and the create/auto-create API responses): must
 * be a non-empty string, under {@link MAX_TOKEN_LENGTH}, and `pk.*`-prefixed. A secret
 * token (`sk.*`) submitted here is rejected for the same reason it's rejected
 * everywhere else — it cannot be safely exposed in a preview URL.
 */
export function validatePublicPreviewToken(token: string): string {
  if (token.length === 0) {
    throw new Error('No token provided. Please provide a valid public token.');
  }
  if (token.length > MAX_TOKEN_LENGTH) {
    throw new Error(
      `Provided token is ${token.length} characters, which exceeds the ${MAX_TOKEN_LENGTH}-character maximum for a Mapbox token.`
    );
  }
  if (!token.startsWith('pk.')) {
    throw new Error(
      'Invalid access token. Only public tokens (starting with pk.*) are allowed for preview URLs. Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs.'
    );
  }
  return token;
}

/**
 * Collects a preview token via URL-mode elicitation, per the MCP spec's requirement
 * that credentials MUST NOT be requested via form mode. Sends a `mode: 'url'`
 * elicitation pointing at the URL `tokenCollectionHandler.collect()` provides, waits for
 * the user to both consent (the elicitation response) and actually submit a value (the
 * out-of-band collection promise), then validates it exactly like every other token
 * source in this file.
 *
 * @throws {ElicitationUnavailableError} if URL-mode collection is disabled
 *   ({@link isLocalUrlElicitationEnabled}) or the client can't be asked at all (e.g. it
 *   doesn't support URL-mode elicitation) — callers should treat this exactly like the
 *   existing "client doesn't support elicitation" fallback.
 * @throws {Error} if the client was asked but declined/cancelled, if the out-of-band
 *   submission times out, or if the submitted value fails validation.
 */
export async function collectProvidedToken(
  sendRequest: SendRequest,
  sendNotification: SendNotification,
  tokenCollectionHandler: TokenCollectionHandler = localHttpTokenCollectionHandler
): Promise<string> {
  if (!isLocalUrlElicitationEnabled()) {
    throw new ElicitationUnavailableError(
      'URL-mode token collection is disabled on this deployment (ENABLE_LOCAL_URL_ELICITATION=false).'
    );
  }

  const { url, result, cancel } = await tokenCollectionHandler.collect({
    timeoutMs: URL_MODE_COLLECTION_TIMEOUT_MSEC
  });

  const elicitationId = randomUUID();
  let consent;
  try {
    consent = await sendRequest(
      {
        method: 'elicitation/create',
        params: {
          mode: 'url',
          elicitationId,
          message:
            'Please provide your Mapbox public token to continue. This opens a page ' +
            'served locally on your own machine — the token goes directly to the MCP ' +
            'DevKit server process, not through this chat.',
          url
        }
      },
      ElicitResultSchema,
      { timeout: ELICITATION_TIMEOUT_MSEC }
    );
  } catch (error) {
    cancel();
    if (
      error instanceof McpError &&
      (error.code === ErrorCode.RequestTimeout ||
        (error.code === ErrorCode.InvalidRequest &&
          /cancelled/i.test(error.message)))
    ) {
      throw error;
    }
    throw new ElicitationUnavailableError(
      error instanceof Error ? error.message : String(error)
    );
  }

  if (consent.action !== 'accept') {
    cancel();
    throw new Error('Token elicitation was cancelled or declined by user');
  }

  let rawToken: string;
  try {
    rawToken = await result;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }

  const token = validatePublicPreviewToken(rawToken);

  // Best-effort UX signal that the out-of-band flow completed; not required for
  // correctness (our own `await result` above is what actually drives completion).
  try {
    await sendNotification({
      method: 'notifications/elicitation/complete',
      params: { elicitationId }
    });
  } catch {
    // Ignore — some clients may not support this notification at all.
  }

  return token;
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

/** Bounds previewTokenStorage's worst-case memory footprint regardless of how many
 * distinct cache keys ever get presented — deliberately independent of *why* the
 * count might grow (a long-lived multi-tenant deployment accumulating real distinct
 * users over time is just as capable of doing this as anything adversarial). */
const MAX_CACHED_TOKENS = 1000;

/**
 * Session-level storage for preview token preferences, keyed by {@link cacheKeyFor}.
 * In a real implementation, this could be stored in a database or cache.
 *
 * Bounded LRU: evicts the least-recently-used entry once at capacity, so memory usage
 * has a fixed ceiling no matter how many distinct keys are ever presented.
 */
class PreviewTokenStorage {
  private tokenCache = new Map<string, string>();

  /**
   * Store a preview token under the given cache key
   */
  set(cacheKey: string, token: string): void {
    // Re-inserting moves a key to the end (most-recently-used) in Map's iteration
    // order; delete first so an existing key doesn't just get its value updated
    // in place at its old position.
    this.tokenCache.delete(cacheKey);
    this.tokenCache.set(cacheKey, token);

    if (this.tokenCache.size > MAX_CACHED_TOKENS) {
      const oldestKey = this.tokenCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.tokenCache.delete(oldestKey);
      }
    }
  }

  /**
   * Get the stored preview token for the given cache key
   */
  get(cacheKey: string): string | undefined {
    const token = this.tokenCache.get(cacheKey);
    if (token !== undefined) {
      // Bump to most-recently-used on read too, so an actively-used entry survives
      // eviction even if it was one of the first ever inserted.
      this.tokenCache.delete(cacheKey);
      this.tokenCache.set(cacheKey, token);
    }
    return token;
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
      let message = `Failed to create token: ${response.status} ${redactToken(errorText)}`;

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

    const data = (await response.json()) as { token?: unknown };

    if (typeof data.token !== 'string') {
      return {
        success: false,
        error:
          'API response did not include a token. Unexpected response shape from the Mapbox Tokens API.'
      };
    }

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
    // A network-level failure (e.g. a misconfigured endpoint) can throw with the full
    // request URL — including this call's own `access_token=...` query param — in its
    // message. Redact before this reaches a caller, the same as every other Mapbox API
    // tool's errors do via MapboxApiBasedTool#run(); these tools don't extend that
    // class, and this is a returned value rather than a thrown rejection regardless,
    // so that redaction wouldn't apply here even if they did.
    return {
      success: false,
      error: redactToken(
        error instanceof Error ? error.message : 'Unknown error creating token'
      )
    };
  }
}
