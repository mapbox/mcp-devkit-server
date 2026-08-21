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
