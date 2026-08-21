// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi } from 'vitest';
import { mintScopedPreviewToken } from '../../src/utils/mintScopedPreviewToken.js';

function makeToken(username: string, signature = 'sig'): string {
  const payload = Buffer.from(JSON.stringify({ u: username })).toString(
    'base64'
  );
  return `pk.${payload}.${signature}`;
}

function stubHttpRequest(token: string, status = 200) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    void input;
    void init;
    return new Response(JSON.stringify({ token }), { status });
  });
}

describe('mintScopedPreviewToken', () => {
  it('POSTs to tokens/v2/{username} for the server token’s own account with the requested scopes and note', async () => {
    const serverToken = makeToken('acct', 'server-sig');
    const httpRequest = stubHttpRequest(makeToken('acct', 'minted-sig'));

    await mintScopedPreviewToken(httpRequest, serverToken, {
      note: 'Test preview',
      scopes: ['styles:tiles', 'styles:read']
    });

    expect(httpRequest).toHaveBeenCalledTimes(1);
    const [url, init] = httpRequest.mock.calls[0];
    expect(String(url)).toContain('tokens/v2/acct');
    expect(String(url)).toContain(`access_token=${serverToken}`);
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      note: 'Test preview',
      scopes: ['styles:tiles', 'styles:read']
    });
    expect(new Date(body.expires).getTime()).toBeGreaterThan(Date.now());
  });

  it('defaults to a ~1 hour expiry, overridable via expiresInMs', async () => {
    const serverToken = makeToken('acct');
    const httpRequest = stubHttpRequest(makeToken('acct'));

    const before = Date.now();
    await mintScopedPreviewToken(httpRequest, serverToken, {
      note: 'n',
      scopes: []
    });
    const [, defaultInit] = httpRequest.mock.calls[0];
    const defaultExpires = new Date(
      JSON.parse((defaultInit as RequestInit).body as string).expires
    ).getTime();
    expect(defaultExpires - before).toBeGreaterThan(59 * 60 * 1000);
    expect(defaultExpires - before).toBeLessThan(61 * 60 * 1000);

    await mintScopedPreviewToken(httpRequest, serverToken, {
      note: 'n',
      scopes: [],
      expiresInMs: 5 * 60 * 1000
    });
    const [, customInit] = httpRequest.mock.calls[1];
    const customExpires = new Date(
      JSON.parse((customInit as RequestInit).body as string).expires
    ).getTime();
    expect(customExpires - before).toBeLessThan(6 * 60 * 1000);
  });

  it('returns the minted token when it belongs to the same account as the server token', async () => {
    const serverToken = makeToken('acct');
    const minted = makeToken('acct', 'minted-sig');
    const httpRequest = stubHttpRequest(minted);

    const result = await mintScopedPreviewToken(httpRequest, serverToken, {
      note: 'n',
      scopes: []
    });

    expect(result).toBe(minted);
  });

  it('throws if the minted token belongs to a different account (AGI-905-style cross-account check)', async () => {
    const serverToken = makeToken('victim');
    const httpRequest = stubHttpRequest(makeToken('attacker'));

    await expect(
      mintScopedPreviewToken(httpRequest, serverToken, {
        note: 'n',
        scopes: []
      })
    ).rejects.toThrow('Minted token does not match caller account');
  });

  it('omits `expires` entirely (mints a genuine, non-expiring pk.* token) when expiresInMs is null', async () => {
    const serverToken = makeToken('acct');
    const httpRequest = stubHttpRequest(makeToken('acct'));

    await mintScopedPreviewToken(httpRequest, serverToken, {
      note: 'n',
      scopes: [],
      expiresInMs: null
    });

    const [, init] = httpRequest.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).not.toHaveProperty('expires');
  });

  it('throws with the status code, not the response body, when the Token API call fails', async () => {
    const serverToken = makeToken('acct');
    const httpRequest = vi.fn(
      async () => new Response('super secret leak', { status: 403 })
    );

    await expect(
      mintScopedPreviewToken(httpRequest, serverToken, {
        note: 'n',
        scopes: []
      })
    ).rejects.toThrow('Token API 403');
  });
});
