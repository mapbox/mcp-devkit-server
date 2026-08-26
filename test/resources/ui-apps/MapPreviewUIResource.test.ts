// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as vm from 'node:vm';
import { MapPreviewUIResource } from '../../../src/resources/ui-apps/MapPreviewUIResource.js';

const uri = new URL('ui://mapbox/map-preview/index.html');

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
  resource: MapPreviewUIResource,
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

describe('MapPreviewUIResource — AGI-905 cross-account token leak', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('embeds only the caller’s own minted token, never another account’s (regression)', async () => {
    const fetchMock = stubMintingFetch();
    const resource = new MapPreviewUIResource();

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
    const resource = new MapPreviewUIResource();
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
    const resource = new MapPreviewUIResource();

    const html = await readHtml(resource, makeToken('sk', 'victim'));

    expect(embeddedToken(html)).toBe('');
  });

  it('renders without a token when minting fails (graceful degradation)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('forbidden', { status: 403 }))
    );
    const resource = new MapPreviewUIResource();

    const result = await resource['readCallback'](
      uri,
      extra(makeToken('sk', 'acct'))
    );

    expect(result.contents).toHaveLength(1);
    expect(embeddedToken(result.contents[0].text as string)).toBe('');
  });

  it('passes a pk token through unchanged without minting', async () => {
    const fetchMock = stubMintingFetch();
    const resource = new MapPreviewUIResource();
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
      const resource = new MapPreviewUIResource();

      const html = await readHtml(resource);

      expect(embeddedToken(html)).toBe('');
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
    }
  });
});

/**
 * Extracts and runs the resource's inline <script> in a sandboxed VM
 * context, with just enough of window/document/mapboxgl stubbed to
 * exercise the merged handleToolResult() dispatch — the one genuinely new
 * piece of logic this consolidation introduces (previously each resource
 * only ever had one branch; now one shared script has to tell a
 * geojson_preview_tool result apart from a preview_style_tool result).
 */
function extractScript(html: string): string {
  const match = html.match(/<script>\s*var TOKEN[\s\S]*?<\/script>/);
  if (!match) throw new Error('Could not find inline <script> block');
  return match[0].replace(/^<script>/, '').replace(/<\/script>$/, '');
}

async function renderHtml(accessToken?: string): Promise<string> {
  const resource = new MapPreviewUIResource();
  if (accessToken?.startsWith('pk.')) {
    const result = await resource['readCallback'](uri, extra(accessToken));
    return result.contents[0].text as string;
  }
  const result = await resource['readCallback'](uri, extra());
  return result.contents[0].text as string;
}

function runScriptSandbox(
  scriptSource: string,
  options: { mapboxglAvailable: boolean }
) {
  const postMessageCalls: Array<Record<string, unknown>> = [];
  let messageListener: ((event: { data: unknown }) => void) | undefined;

  function fakeElement() {
    return {
      style: {} as Record<string, string>,
      textContent: '',
      classList: { add: () => {} },
      addEventListener: () => {}
    };
  }
  const elementsById: Record<string, ReturnType<typeof fakeElement>> = {};
  function getElementById(id: string) {
    if (!elementsById[id]) elementsById[id] = fakeElement();
    return elementsById[id];
  }

  const addSourceSpy = vi.fn();
  const addLayerSpy = vi.fn();
  const setStyleSpy = vi.fn();
  const removeLayerSpy = vi.fn();
  const removeSourceSpy = vi.fn();

  const fakeMapInstance = {
    addControl: () => {},
    on: (event: string, cb: () => void) => {
      if (event === 'load' || event === 'style.load') cb();
    },
    once: (_event: string, cb: () => void) => cb(),
    addSource: addSourceSpy,
    addLayer: addLayerSpy,
    setStyle: setStyleSpy,
    getLayer: () => null,
    getSource: () => null,
    removeLayer: removeLayerSpy,
    removeSource: removeSourceSpy,
    fitBounds: () => {},
    flyTo: () => {},
    resize: () => {},
    getStyle: () => ({ name: 'Test Style' })
  };

  const mapboxglMock = options.mapboxglAvailable
    ? {
        accessToken: '',
        Map: function Map() {
          return fakeMapInstance;
        },
        NavigationControl: function NavigationControl() {}
      }
    : undefined;

  const sandbox: Record<string, unknown> = {
    window: {
      addEventListener: (event: string, cb: typeof messageListener) => {
        if (event === 'message') messageListener = cb;
      },
      parent: {
        postMessage: (message: Record<string, unknown>) => {
          postMessageCalls.push(message);
        }
      }
    },
    document: {
      getElementById: getElementById,
      createElement: () => fakeElement()
    },
    mapboxgl: mapboxglMock,
    console,
    setTimeout,
    URL,
    Map: globalThis.Map
  };
  vm.createContext(sandbox);
  vm.runInContext(scriptSource, sandbox);

  const initId = postMessageCalls.find((m) => m.method === 'ui/initialize')
    ?.id as number | undefined;
  if (initId !== undefined && messageListener) {
    messageListener({ data: { jsonrpc: '2.0', id: initId, result: {} } });
  }

  return {
    sendToolResult: (url: string) => {
      messageListener?.({
        data: {
          jsonrpc: '2.0',
          method: 'ui/notifications/tool-result',
          params: { content: [{ type: 'text', text: url }] }
        }
      });
    },
    mapboxglMock,
    map: fakeMapInstance,
    addSourceSpy,
    addLayerSpy,
    setStyleSpy,
    errorEl: elementsById.error
  };
}

describe('MapPreviewUIResource — merged tool-result dispatch', () => {
  it('routes a geojson_preview_tool URL to the GeoJSON overlay path', async () => {
    const html = await renderHtml(
      'pk.' +
        Buffer.from(JSON.stringify({ u: 'acct' })).toString('base64') +
        '.sig'
    );
    const script = extractScript(html);
    const { sendToolResult, addSourceSpy, addLayerSpy, setStyleSpy } =
      runScriptSandbox(script, { mapboxglAvailable: true });

    const geojson = { type: 'Point', coordinates: [-122.4, 37.8] };
    const geojsonUrl =
      'https://geojson.io/?data=data:application/json,' +
      encodeURIComponent(JSON.stringify(geojson));

    sendToolResult(geojsonUrl);

    expect(addSourceSpy).toHaveBeenCalledWith(
      'geojson',
      expect.objectContaining({ type: 'geojson' })
    );
    expect(addLayerSpy).toHaveBeenCalled();
    expect(setStyleSpy).not.toHaveBeenCalled();
  });

  it('routes a preview_style_tool URL to the style-swap path, reusing the existing map', async () => {
    const html = await renderHtml(
      'pk.' +
        Buffer.from(JSON.stringify({ u: 'acct' })).toString('base64') +
        '.sig'
    );
    const script = extractScript(html);
    const { sendToolResult, setStyleSpy, addSourceSpy, mapboxglMock } =
      runScriptSandbox(script, { mapboxglAvailable: true });

    const styleUrl =
      'https://api.mapbox.com/styles/v1/someuser/some-style-id.html?access_token=pk.newtoken.sig&fresh=true';

    sendToolResult(styleUrl);

    expect(setStyleSpy).toHaveBeenCalledWith(
      'mapbox://styles/someuser/some-style-id'
    );
    // Swaps mapboxgl.accessToken to the URL's own token, not the
    // server-minted one the map was originally created with.
    expect(mapboxglMock?.accessToken).toBe('pk.newtoken.sig');
    expect(addSourceSpy).not.toHaveBeenCalled();
  });

  it('creates a fresh map for a style-preview URL when no eager map exists (no server token)', async () => {
    const saved = process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.MAPBOX_ACCESS_TOKEN;
    try {
      const html = await renderHtml(); // no token at all
      const script = extractScript(html);
      const { sendToolResult, setStyleSpy, mapboxglMock } = runScriptSandbox(
        script,
        { mapboxglAvailable: true }
      );

      const styleUrl =
        'https://api.mapbox.com/styles/v1/someuser/some-style-id.html?access_token=pk.newtoken.sig';

      sendToolResult(styleUrl);

      // setStyle is only used for the "map already exists" path; with no
      // eager map, a fresh mapboxgl.Map(...) is constructed directly with
      // the target style instead.
      expect(setStyleSpy).not.toHaveBeenCalled();
      expect(mapboxglMock?.accessToken).toBe('pk.newtoken.sig');
    } finally {
      if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
    }
  });

  it('shows an error for a tool-result URL matching neither shape', async () => {
    const html = await renderHtml(
      'pk.' +
        Buffer.from(JSON.stringify({ u: 'acct' })).toString('base64') +
        '.sig'
    );
    const script = extractScript(html);
    const { sendToolResult, errorEl } = runScriptSandbox(script, {
      mapboxglAvailable: true
    });

    sendToolResult('https://example.com/not-a-recognized-shape');

    expect(errorEl?.textContent).toContain('Could not parse GeoJSON');
  });
});
