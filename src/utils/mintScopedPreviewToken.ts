// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { HttpRequest } from './types.js';
import { getUserNameFromToken, mapboxApiEndpoint } from './jwtUtils.js';

/**
 * Mints a public token scoped to `scopes`, on the same account as
 * `serverAccessToken`. Used to auto-generate a preview token when a caller
 * hasn't supplied — and doesn't need to manage — a token of their own, e.g.
 * for a one-off inline style preview or comparison.
 *
 * By default (`expiresInMs` omitted or a number), the Tokens API mints a
 * short-lived **`tk.*`** temporary token — confirmed live against the real
 * API — which is what GL JS and the Styles API's embeddable HTML preview
 * page both accept. Pass `expiresInMs: null` to mint a genuine, non-expiring
 * **`pk.*`** public token instead — required for any consumer that validates
 * the token prefix itself and rejects non-`pk.*` tokens outright (confirmed
 * live: `agent.mapbox.com/tools/style-compare`, which `style_comparison_tool`
 * embeds, does exactly this and 400s on a `tk.*` token). A `pk.*` token
 * minted this way does not self-expire; it persists on the account (scoped
 * narrowly to `scopes`) until manually revoked.
 *
 * Verifies the minted token belongs to the caller's own account before
 * returning it — defense in depth against a misbehaving/misconfigured
 * backend returning a different account's token (see the AGI-905 regression
 * suite this same check protects against in `MapPreviewUIResource`).
 *
 * Do NOT cache the result across calls: on a multi-tenant server, caching
 * by anything less than the caller's own identity risks handing one
 * caller's token to another.
 */
export async function mintScopedPreviewToken(
  httpRequest: HttpRequest,
  serverAccessToken: string,
  params: { note: string; scopes: string[]; expiresInMs?: number | null }
): Promise<string> {
  const expectedUsername = getUserNameFromToken(serverAccessToken);
  const expires =
    params.expiresInMs === null
      ? undefined
      : new Date(
          Date.now() + (params.expiresInMs ?? 60 * 60 * 1000)
        ).toISOString();

  const url = `${mapboxApiEndpoint()}tokens/v2/${expectedUsername}?access_token=${serverAccessToken}`;
  const response = await httpRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      note: params.note,
      scopes: params.scopes,
      ...(expires ? { expires } : {})
    })
  });

  if (!response.ok) {
    // Do not include the response body — it may echo the token back.
    throw new Error(`Token API ${response.status}`);
  }

  const data = (await response.json()) as { token: string };
  if (getUserNameFromToken(data.token) !== expectedUsername) {
    throw new Error('Minted token does not match caller account');
  }
  return data.token;
}

/**
 * Turns a failure from the auto-mint path (either `getUserNameFromToken`
 * on the server's own token, or `mintScopedPreviewToken` itself) into a
 * message that actually tells the caller what to do next, instead of
 * surfacing jwtUtils' raw, `MAPBOX_ACCESS_TOKEN`-flavored error text or a
 * bare `Token API 403`.
 *
 * Two known failure shapes, both confirmed against this repo's own code
 * and docs rather than assumed:
 *
 * 1. The server's own access token isn't a personal Mapbox account token
 *    at all, so a username can't even be resolved from it before a mint
 *    attempt — this is the hosted MCP endpoint's normal case. Per
 *    README.md: "the hosted deployment authenticates each request with
 *    its own access token rather than your personal Mapbox account
 *    token" and doesn't expose `create_token_tool` at all. There's no
 *    reliable way to detect this shape ahead of time (it isn't a Mapbox
 *    `pk./sk./tk.` token, so it never reaches the mint call), so this is
 *    keyed off `getUserNameFromToken`'s own error text.
 * 2. The server's own token IS a Mapbox token but lacks `tokens:write` —
 *    the mint call itself 401s/403s.
 *
 * Anything else (e.g. a transient network/5xx failure) is passed through
 * unchanged rather than guessed at.
 */
export function describeAutoMintFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const actionableSuffix =
    'Pass accessToken directly instead: get an existing public token via ' +
    'list_tokens_tool, or create one with create_token_tool if it is ' +
    'available in this deployment.';

  const cannotResolveAccount =
    message.includes('is not in valid JWT format') ||
    message.includes('does not contain username in payload') ||
    message.includes('No access token provided');
  if (cannotResolveAccount) {
    return (
      "Could not auto-generate a preview token: this server's own access " +
      "token isn't a personal Mapbox account token (expected on " +
      'deployments — like the hosted MCP endpoint — that authenticate a ' +
      `different way). ${actionableSuffix}`
    );
  }

  if (/^Token API 40[13]$/.test(message)) {
    return (
      "Could not auto-generate a preview token: this server's access " +
      'token does not have permission to create new tokens (tokens:write). ' +
      actionableSuffix
    );
  }

  return message;
}
