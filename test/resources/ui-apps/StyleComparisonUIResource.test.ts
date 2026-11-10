// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import * as vm from 'node:vm';
import { StyleComparisonUIResource } from '../../../src/resources/ui-apps/StyleComparisonUIResource.js';
import { resourceTextOf } from '../../utils/resultTestUtils.js';

const uri = new URL('ui://mapbox/style-comparison/index.html');

async function resourceHtml(): Promise<string> {
  const resource = new StyleComparisonUIResource();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return resourceTextOf(await resource.readCallback(uri, {} as any));
}

async function inlineScript(): Promise<string> {
  const match = (await resourceHtml()).match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Could not find inline <script> block');
  return match[1];
}

type FakeElement = {
  style: Record<string, string>;
  textContent: string;
  title?: string;
};

type FakeMap = {
  options: { container: string; style: string; center: number[]; zoom: number };
  fire: (event: string, payload?: unknown) => void;
};

// Runs the inline script against a stub DOM and, unless `withGl` is false, a
// stub mapboxgl that records the maps and Compare instances it creates.
async function runScript({ withGl = true } = {}) {
  let listener: ((event: { data: unknown; source: unknown }) => void) | null =
    null;
  const elements: Record<string, FakeElement> = {};
  const element = (id: string) =>
    (elements[id] ??= {
      style: {},
      textContent: '',
      classList: { add: () => {} },
      addEventListener: () => {}
    } as FakeElement);
  const posted: Array<{ id?: number; method?: string }> = [];
  const parentWindow = {
    postMessage: (message: { id?: number; method?: string }) => {
      posted.push(message);
    }
  };

  const maps: FakeMap[] = [];
  const compares: unknown[][] = [];
  const mapboxgl = {
    accessToken: '',
    Map: function (this: unknown, options: FakeMap['options']) {
      const handlers: Record<string, Array<(payload?: unknown) => void>> = {};
      const map = {
        options,
        on: (event: string, cb: (payload?: unknown) => void) => {
          (handlers[event] ??= []).push(cb);
        },
        getStyle: () => ({ name: `Name of ${options.container}` }),
        resize: () => {},
        fire: (event: string, payload?: unknown) =>
          (handlers[event] ?? []).forEach((cb) => cb(payload))
      };
      maps.push(map);
      return map;
    },
    Compare: function (...args: unknown[]) {
      compares.push(args);
    }
  };

  vm.runInContext(
    await inlineScript(),
    vm.createContext({
      window: {
        addEventListener: (type: string, cb: typeof listener) => {
          if (type === 'message') listener = cb;
        },
        parent: parentWindow
      },
      document: { getElementById: element, createElement: () => element('') },
      ...(withGl ? { mapboxgl } : {}),
      console,
      setTimeout,
      Map
    })
  );

  const sendToolResult = (
    source: unknown,
    structuredContent: unknown = {
      before: 'mapbox/streets-v12',
      after: 'mapbox/outdoors-v12',
      accessToken: 'tk.test',
      center: [-122.4, 37.7],
      zoom: 10
    }
  ) =>
    listener?.({
      data: {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-result',
        params: { content: [], structuredContent }
      },
      source
    });

  const answerInitialize = (source: unknown) =>
    listener?.({
      data: {
        jsonrpc: '2.0',
        id: posted.find((m) => m.method === 'ui/initialize')?.id,
        result: {}
      },
      source
    });
  const initialized = () =>
    posted.some((m) => m.method === 'ui/notifications/initialized');

  return {
    sendToolResult,
    answerInitialize,
    initialized,
    parentWindow,
    mapboxgl,
    maps,
    compares,
    element
  };
}

describe('StyleComparisonUIResource', () => {
  it('loads only Mapbox-hosted scripts and never frames a hosted comparison page', async () => {
    const html = await resourceHtml();
    expect(html).not.toContain('agent.mapbox.com');
    expect(html).not.toContain('<iframe');
    for (const [, src] of html.matchAll(/<script src="([^"]+)"/g)) {
      expect(src).toMatch(/^https:\/\/api\.mapbox\.com\//);
    }
  });

  it('builds both maps from the tool result structured content', async () => {
    const { sendToolResult, parentWindow, mapboxgl, maps, compares, element } =
      await runScript();
    sendToolResult(parentWindow);

    expect(mapboxgl.accessToken).toBe('tk.test');
    expect(maps.map((m) => m.options)).toEqual([
      {
        container: 'before',
        style: 'mapbox://styles/mapbox/streets-v12?fresh=true',
        center: [-122.4, 37.7],
        zoom: 10
      },
      {
        container: 'after',
        style: 'mapbox://styles/mapbox/outdoors-v12?fresh=true',
        center: [-122.4, 37.7],
        zoom: 10
      }
    ]);

    // The slider is only created once both styles have loaded.
    maps[0].fire('style.load');
    expect(compares).toHaveLength(0);
    maps[1].fire('style.load');
    expect(compares).toHaveLength(1);
    expect(compares[0][3]).toEqual({
      mousemove: false,
      orientation: 'vertical'
    });

    expect(element('before-label').textContent).toBe(
      'Name of before (mapbox/streets-v12)'
    );
    expect(element('loading').style.display).toBe('none');
  });

  it('shows which side failed and why when a style cannot be loaded', async () => {
    const { sendToolResult, parentWindow, maps, compares, element } =
      await runScript();
    sendToolResult(parentWindow);

    maps[0].fire('style.load');
    maps[1].fire('error', { error: { status: 404 } });
    maps[1].fire('style.load');

    expect(compares).toHaveLength(0);
    expect(element('error').style.display).toBe('block');
    expect(element('error').textContent).toContain(
      'Failed to load the "after" style (mapbox/outdoors-v12).'
    );
    expect(element('error').textContent).toContain('not found');
  });

  it('ignores errors after a style has loaded, such as a missing tile', async () => {
    const { sendToolResult, parentWindow, maps, element } = await runScript();
    sendToolResult(parentWindow);

    maps[0].fire('style.load');
    maps[0].fire('error', { error: { status: 404 } });

    expect(element('error').style.display).toBeUndefined();
  });

  it('rejects a tool result whose style IDs are not username/styleId', async () => {
    const { sendToolResult, parentWindow, maps, element } = await runScript();
    sendToolResult(parentWindow, {
      before: 'mapbox/streets-v12',
      after: '../../evil',
      accessToken: 'tk.test'
    });

    expect(maps).toHaveLength(0);
    expect(element('error').textContent).toBe(
      'No style comparison found in tool result'
    );
  });

  it('reports a GL JS load failure instead of hanging on the loading message', async () => {
    const { sendToolResult, parentWindow, element } = await runScript({
      withGl: false
    });
    sendToolResult(parentWindow);

    expect(element('error').textContent).toBe('Could not load Mapbox GL JS');
  });

  it('ignores a tool-result posted by a window other than the host', async () => {
    const { sendToolResult, maps } = await runScript();
    sendToolResult({ postMessage: () => {} });
    expect(maps).toHaveLength(0);
  });

  it('ignores a reply to a pending request posted by a window other than the host', async () => {
    const { answerInitialize, initialized, parentWindow } = await runScript();

    answerInitialize({ postMessage: () => {} });
    await Promise.resolve();
    expect(initialized()).toBe(false);

    answerInitialize(parentWindow);
    await Promise.resolve();
    expect(initialized()).toBe(true);
  });
});
