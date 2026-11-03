// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import * as vm from 'node:vm';
import { StyleComparisonUIResource } from '../../../src/resources/ui-apps/StyleComparisonUIResource.js';
import { resourceTextOf } from '../../utils/resultTestUtils.js';

const uri = new URL('ui://mapbox/style-comparison/index.html');

async function inlineScript(): Promise<string> {
  const resource = new StyleComparisonUIResource();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html = resourceTextOf(await resource.readCallback(uri, {} as any));
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Could not find inline <script> block');
  return match[1];
}

// Runs the inline script without mapboxgl, so a handled tool-result only
// shows the "Open in browser" button.
async function runScript() {
  let listener: ((event: { data: unknown; source: unknown }) => void) | null =
    null;
  const elements: Record<string, { style: Record<string, string> }> = {};
  const element = (id: string) =>
    (elements[id] ??= {
      style: {},
      textContent: '',
      classList: { add: () => {} },
      addEventListener: () => {}
    } as { style: Record<string, string> });
  const posted: Array<{ id?: number; method?: string }> = [];
  const parentWindow = {
    postMessage: (message: { id?: number; method?: string }) => {
      posted.push(message);
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
      console,
      setTimeout,
      URL,
      Map
    })
  );

  const sendToolResult = (source: unknown) =>
    listener?.({
      data: {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-result',
        params: {
          content: [{ type: 'text', text: 'https://attacker.example/' }]
        }
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
    openBtn: element('open-btn')
  };
}

describe('StyleComparisonUIResource message handling', () => {
  it('handles a tool-result from the host window', async () => {
    const { sendToolResult, parentWindow, openBtn } = await runScript();
    sendToolResult(parentWindow);
    expect(openBtn.style.display).toBe('block');
  });

  it('ignores a tool-result posted by a window other than the host', async () => {
    const { sendToolResult, openBtn } = await runScript();
    sendToolResult({ postMessage: () => {} });
    expect(openBtn.style.display).toBeUndefined();
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
