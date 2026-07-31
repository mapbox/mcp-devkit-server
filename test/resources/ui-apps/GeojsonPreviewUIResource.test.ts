// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { GeojsonPreviewUIResource } from '../../../src/resources/ui-apps/GeojsonPreviewUIResource.js';

const uri = new URL('ui://mapbox/geojson-preview/index.html');

// Build a Mapbox-style 3-part JWT whose payload carries the username (`u`).
function makeToken(prefix: 'sk' | 'pk' | 'tk', username: string): string {
  const payload = Buffer.from(JSON.stringify({ u: username })).toString(
    'base64'
  );
  return `${prefix}.${payload}.sig`;
}

function embeddedToken(html: string): string | null {
  const m = html.match(/var TOKEN = '([^']*)'/);
  return m ? m[1] : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extra(token?: string): any {
  return token ? { authInfo: { token } } : {};
}

async function readHtml(
  resource: GeojsonPreviewUIResource,
  token?: string
): Promise<string> {
  const result = await resource['readCallback'](uri, extra(token));
  return result.contents[0].text as string;
}

// Stub global fetch to mirror real Mapbox behaviour: POST tokens/v2/{username}
// mints a `tk` token for THAT account. Returns the mock for call assertions.
function stubMintingFetch() {
  const fn = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const username = decodeURIComponent(
      url.match(/tokens\/v2\/([^?]+)/)?.[1] ?? ''
    );
    return new Response(JSON.stringify({ token: makeToken('tk', username) }), {
      status: 200
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('GeojsonPreviewUIResource — AGI-905 cross-account token leak', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('embeds only the caller’s own minted token, never another account’s (regression)', async () => {
    const fetchMock = stubMintingFetch();
    const resource = new GeojsonPreviewUIResource();

    const htmlA = await readHtml(resource, makeToken('sk', 'accountA'));
    const htmlB = await readHtml(resource, makeToken('sk', 'accountB'));

    const tokA = embeddedToken(htmlA);
    const tokB = embeddedToken(htmlB);

    // Each caller receives a token minted for their own account.
    expect(tokA).toBe(makeToken('tk', 'accountA'));
    expect(tokB).toBe(makeToken('tk', 'accountB'));

    // B must never receive A's token.
    expect(tokB).not.toBe(tokA);
    expect(htmlB).not.toContain(tokA as string);

    // No process-global cache: each read mints fresh.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('mints a fresh token on every read (no shared cache, even for the same caller)', async () => {
    const fetchMock = stubMintingFetch();
    const resource = new GeojsonPreviewUIResource();
    const sk = makeToken('sk', 'acct');

    await readHtml(resource, sk);
    await readHtml(resource, sk);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not embed a token minted for a different account (identity assertion)', async () => {
    // Simulate a (hypothetical) backend returning a token for someone else.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ token: makeToken('tk', 'attacker') }), {
            status: 200
          })
      )
    );
    const resource = new GeojsonPreviewUIResource();

    const html = await readHtml(resource, makeToken('sk', 'victim'));

    expect(embeddedToken(html)).toBe('');
  });

  it('renders without a token when minting fails (graceful degradation)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('forbidden', { status: 403 }))
    );
    const resource = new GeojsonPreviewUIResource();

    const result = await resource['readCallback'](
      uri,
      extra(makeToken('sk', 'acct'))
    );

    expect(result.contents).toHaveLength(1);
    expect(embeddedToken(result.contents[0].text as string)).toBe('');
  });

  it('passes a pk token through unchanged without minting', async () => {
    const fetchMock = stubMintingFetch();
    const resource = new GeojsonPreviewUIResource();
    const pk = makeToken('pk', 'acct');

    const html = await readHtml(resource, pk);

    expect(embeddedToken(html)).toBe(pk);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders without a token when no token is provided', async () => {
    const saved = process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.MAPBOX_ACCESS_TOKEN;
    try {
      const fetchMock = stubMintingFetch();
      const resource = new GeojsonPreviewUIResource();

      const html = await readHtml(resource);

      expect(embeddedToken(html)).toBe('');
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
    }
  });
});
