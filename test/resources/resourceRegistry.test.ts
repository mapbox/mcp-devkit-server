// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { McpServer, InMemoryTransport } from '@modelcontextprotocol/server';
import type {
  JSONRPCMessage,
  ServerContext
} from '@modelcontextprotocol/server';
import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import {
  getAllResources,
  installResources
} from '../../src/resources/resourceRegistry.js';
import { MapPreviewUIResource } from '../../src/resources/ui-apps/MapPreviewUIResource.js';
import { resourceTextOf } from '../utils/resultTestUtils.js';

function makeToken(prefix: 'sk' | 'pk' | 'tk', username: string): string {
  const payload = Buffer.from(JSON.stringify({ u: username })).toString(
    'base64'
  );
  return `${prefix}.${payload}.sig`;
}

function usernameOf(token: string): string {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).u;
}

// Connects a client whose every request carries `authInfo`, the way an
// authenticating HTTP transport delivers the caller's bearer token.
async function connectWithAuth(
  server: McpServer,
  token: string
): Promise<Client> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const send = clientTransport.send.bind(clientTransport);
  clientTransport.send = (message: JSONRPCMessage) =>
    send(message, {
      authInfo: { token, clientId: 'test-client', scopes: [] }
    });
  await server.connect(serverTransport);
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await client.connect(clientTransport);
  return client;
}

describe('installResources', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('passes the caller authInfo to every resource read callback', async () => {
    const resources = getAllResources();
    const spies = resources.map((resource) =>
      vi
        .spyOn(resource, 'readCallback')
        .mockResolvedValue({ contents: [{ uri: resource.uri, text: '' }] })
    );
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    installResources(server);
    const client = await connectWithAuth(server, 'caller-token');

    for (const resource of resources) {
      await client.readResource({ uri: resource.uri });
    }

    spies.forEach((spy) => {
      expect(spy).toHaveBeenCalledTimes(1);
      const ctx = spy.mock.calls[0][1] as ServerContext;
      expect(ctx.http?.authInfo?.token).toBe('caller-token');
    });
    await client.close();
  });

  it('registers ui:// resources with the MCP Apps mime type', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    installResources(server);
    const client = await connectWithAuth(server, 'caller-token');

    const { resources } = await client.listResources();
    const uiResources = resources.filter((r) => r.uri.startsWith('ui://'));

    expect(uiResources.length).toBeGreaterThan(0);
    uiResources.forEach((r) => expect(r.mimeType).toBe(RESOURCE_MIME_TYPE));
    await client.close();
  });

  it('mints the map preview token on the caller account, not the server env token account', async () => {
    vi.stubEnv('MAPBOX_ACCESS_TOKEN', makeToken('sk', 'server-operator'));
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const username = String(input).match(/tokens\/v2\/([^?]+)/)?.[1] ?? '';
      return new Response(
        JSON.stringify({ token: makeToken('tk', username) }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const resource = new MapPreviewUIResource();
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    installResources(server, [resource]);
    const client = await connectWithAuth(
      server,
      makeToken('sk', 'caller-user')
    );

    const result = await client.readResource({ uri: resource.uri });
    const html = resourceTextOf(result);
    const embedded = html.match(/var TOKEN = '([^']*)'/)?.[1] ?? '';

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'tokens/v2/caller-user?'
    );
    expect(usernameOf(embedded)).toBe('caller-user');
    expect(html).not.toContain('sk.');
    await client.close();
  });
});
