// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

/**
 * Drives preview_style_tool / style_comparison_tool's elicitation flow over a real
 * Streamable HTTP MCP connection — a real `Server` sending an `elicitation/create`
 * request and a real `Client` answering it, not a hand-built stand-in for `this.server`.
 * This is the only place that exercises the actual wire protocol; every other test for
 * these tools fakes `tool['server']` directly and never proves the SDK's own capability
 * negotiation and request/response plumbing works end to end.
 *
 * The server is session-scoped (one `McpServer`/transport pair per `Mcp-Session-Id`,
 * matching the SDK's documented stateful-mode example) — see the comment on
 * `startHarness` below for why that matters specifically for elicitation. The bearer
 * token from the `Authorization` header is attached to the raw Node request as `.auth`
 * before handing off to `StreamableHTTPServerTransport`, mirroring hosted-mcp-server's
 * src/routes/mcp.ts.
 *
 * The Mapbox Tokens API itself is never hit — `httpRequest` is a mock, so this stays
 * fully offline and deterministic (per CLAUDE.md: real network calls are never
 * acceptable in tests).
 */

import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  ElicitRequestSchema,
  type ElicitRequest,
  type ElicitResult
} from '@modelcontextprotocol/sdk/types.js';
import { PreviewStyleTool } from '../../src/tools/preview-style-tool/PreviewStyleTool.js';
import { StyleComparisonTool } from '../../src/tools/style-comparison-tool/StyleComparisonTool.js';
import { previewTokenStorage } from '../../src/utils/tokenElicitation.js';
import type { HttpRequest } from '../../src/utils/types.js';

const TK_SERVER_TOKEN =
  'tk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';
// Shaped like the hosted MCP endpoint's real bearer: a plain 3-part JWT with no
// pk./sk./tk. prefix (see PR #57 discussion) — `isTemporaryServerToken` can't
// recognize this as unable to create tokens, only the API call itself can.
const OAUTH_STYLE_SERVER_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIn0.signature';
const EXISTING_PUBLIC_TOKEN =
  'pk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

/** A mock HttpRequest that fails any call not explicitly queued, so an unexpected
 * network attempt (e.g. the tk.* guard failing to short-circuit) shows up as a loud
 * test failure instead of a silent pass. */
function mockHttpRequest(
  handlers: Record<'GET' | 'POST', () => Response>
): HttpRequest {
  return vi.fn(async (_url, init) => {
    const method = ((init?.method as string) || 'GET').toUpperCase() as
      | 'GET'
      | 'POST';
    const handler = handlers[method];
    if (!handler) {
      throw new Error(`Unexpected ${method} request in test`);
    }
    return handler();
  }) as unknown as HttpRequest;
}

interface TestHarness {
  baseUrl: URL;
  close(): Promise<void>;
}

/**
 * Session-scoped stateful Streamable HTTP server: one `McpServer`/transport pair per
 * `Mcp-Session-Id`, created on the first (`initialize`) request and reused for every
 * subsequent request in that session — the documented SDK pattern for stateful mode.
 *
 * This matters specifically for elicitation: `Server#getClientCapabilities()` (which
 * `PreviewStyleTool`/`StyleComparisonTool` check before calling `elicitInput`) is set
 * once, on whichever `Server` instance processes the client's `initialize` request, and
 * never persists anywhere else. A server that hands each incoming HTTP request to a
 * brand-new `McpServer` (the "stateless" pattern used by mcp-server's
 * scripts/dev-http-server.ts and by hosted-mcp-server's src/routes/mcp.ts, both
 * `sessionIdGenerator: undefined`) means the `initialize` request and every later
 * `tools/call` request land on *different* `Server` objects — the tool call's instance
 * never saw the initialize handshake, so `getClientCapabilities()` is always
 * `undefined` there regardless of what the connecting client actually declared. That
 * was discovered by this test failing under a first attempt at a stateless harness; see
 * PR #57 discussion. Whether that also silently breaks elicitation on the real hosted
 * endpoint (independently of the tk.* issue) is worth following up on separately — it's
 * not this PR's tool code, so it isn't re-litigated here.
 */
function startHarness(
  previewHttpRequest: HttpRequest,
  comparisonHttpRequest: HttpRequest = previewHttpRequest
): Promise<TestHarness> {
  const previewTool = new PreviewStyleTool({ httpRequest: previewHttpRequest });
  const comparisonTool = new StyleComparisonTool({
    httpRequest: comparisonHttpRequest
  });

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  function buildTransport(): StreamableHTTPServerTransport {
    const mcpServer = new McpServer(
      { name: 'elicitation-http-test', version: '1.0.0' },
      { capabilities: { tools: { listChanged: true } } }
    );
    previewTool.installTo(mcpServer);
    comparisonTool.installTo(mcpServer);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        sessions.set(sessionId, transport);
      },
      onsessionclosed: (sessionId) => {
        sessions.delete(sessionId);
      }
    });
    transport.onclose = () => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
    };
    void mcpServer.connect(transport);
    return transport;
  }

  const httpServer: Server = createServer((req, res) => {
    void (async () => {
      const authHeader = req.headers.authorization;
      const match = authHeader?.match(/^Bearer (.+)$/);
      const reqWithAuth = req as IncomingMessage & {
        auth?: { token: string; clientId: string; scopes: string[] };
      };
      if (match) {
        // Mirrors hosted-mcp-server's src/routes/mcp.ts: attach the bearer to the
        // raw request as `.auth` before the transport touches it.
        reqWithAuth.auth = {
          token: match[1],
          clientId: 'test-client',
          scopes: []
        };
      }

      const sessionIdHeader = req.headers['mcp-session-id'];
      const existing =
        typeof sessionIdHeader === 'string'
          ? sessions.get(sessionIdHeader)
          : undefined;
      const transport = existing ?? buildTransport();

      try {
        await transport.handleRequest(reqWithAuth, res);
      } catch (error) {
        if (!res.headersSent) {
          res.writeHead(500).end(String(error));
        }
      }
    })();
  });

  return new Promise((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => {
      const { port } = httpServer.address() as AddressInfo;
      resolve({
        baseUrl: new URL(`http://127.0.0.1:${port}/mcp`),
        close: () =>
          new Promise((res, rej) =>
            httpServer.close((err) => (err ? rej(err) : res()))
          )
      });
    });
  });
}

async function connectClient(
  baseUrl: URL,
  bearerToken: string,
  onElicit: (request: ElicitRequest) => ElicitResult
): Promise<Client> {
  const client = new Client(
    { name: 'elicitation-http-test-client', version: '1.0.0' },
    { capabilities: { elicitation: {} } }
  );
  client.setRequestHandler(ElicitRequestSchema, (request) => onElicit(request));

  const transport = new StreamableHTTPClientTransport(baseUrl, {
    requestInit: { headers: { Authorization: `Bearer ${bearerToken}` } }
  });
  await client.connect(transport);
  return client;
}

/**
 * `ElicitRequest.params` is a union (form-mode vs. other elicitation modes); this
 * server only ever sends the form-mode shape (`message` + `requestedSchema`) that
 * `elicitPreviewToken` builds, so narrowing here is safe for these tests.
 */
function getChoiceEnum(request: ElicitRequest): string[] {
  const params = request.params as unknown as {
    requestedSchema: { properties: { choice: { enum: string[] } } };
  };
  return params.requestedSchema.properties.choice.enum;
}

describe('preview/comparison token elicitation over real Streamable HTTP', () => {
  let harness: TestHarness | undefined;
  let client: Client | undefined;

  beforeEach(() => {
    previewTokenStorage.clearAll();
  });

  afterEach(async () => {
    await client?.close().catch(() => {});
    await harness?.close();
    client = undefined;
    harness = undefined;
  });

  it('trims the dialog to "provide" and never calls the Tokens API when the server token is tk.*', async () => {
    const httpRequest = mockHttpRequest({
      GET: () => {
        throw new Error('should not list tokens for a tk.* server token');
      },
      POST: () => {
        throw new Error('should not create a token for a tk.* server token');
      }
    });
    harness = await startHarness(httpRequest);

    let receivedEnum: unknown;
    client = await connectClient(
      harness.baseUrl,
      TK_SERVER_TOKEN,
      (request) => {
        receivedEnum = getChoiceEnum(request);
        return {
          action: 'accept',
          content: { choice: 'provide', token: EXISTING_PUBLIC_TOKEN }
        };
      }
    );

    const result = await client.callTool({
      name: 'preview_style_tool',
      arguments: { styleId: 'test-style' }
    });

    expect(result.isError).toBeFalsy();
    expect(receivedEnum).toEqual(['provide']);
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('offers all three choices for a non-tk.*-shaped server token and surfaces a scope hint when auto-create fails (the hosted-endpoint case)', async () => {
    const httpRequest = mockHttpRequest({
      GET: () => jsonResponse(200, []),
      POST: () => jsonResponse(403, { message: 'insufficient scopes' })
    });
    harness = await startHarness(httpRequest);

    let receivedEnum: unknown;
    client = await connectClient(
      harness.baseUrl,
      OAUTH_STYLE_SERVER_TOKEN,
      (request) => {
        receivedEnum = getChoiceEnum(request);
        return { action: 'accept', content: { choice: 'auto' } };
      }
    );

    const result = await client.callTool({
      name: 'preview_style_tool',
      arguments: { styleId: 'test-style' }
    });

    expect(receivedEnum).toEqual(['provide', 'create', 'auto']);
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text?: string }>)[0]
      .text as string;
    expect(text).toContain('insufficient scopes');
    expect(text).toContain('tokens:write');
  });

  it('completes auto-create end to end for a server token that can create tokens', async () => {
    const httpRequest = mockHttpRequest({
      GET: () => jsonResponse(200, []),
      POST: () => jsonResponse(200, { token: EXISTING_PUBLIC_TOKEN })
    });
    harness = await startHarness(httpRequest);

    client = await connectClient(
      harness.baseUrl,
      OAUTH_STYLE_SERVER_TOKEN,
      () => ({ action: 'accept', content: { choice: 'auto' } })
    );

    const result = await client.callTool({
      name: 'preview_style_tool',
      arguments: { styleId: 'test-style' }
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text?: string }>)[0]
      .text as string;
    expect(text).toContain(`access_token=${EXISTING_PUBLIC_TOKEN}`);
  });

  it("trims style_comparison_tool's dialog the same way for a tk.* server token", async () => {
    const httpRequest = mockHttpRequest({
      GET: () => {
        throw new Error('should not list tokens for a tk.* server token');
      },
      POST: () => {
        throw new Error('should not create a token for a tk.* server token');
      }
    });
    harness = await startHarness(httpRequest);

    let receivedEnum: unknown;
    client = await connectClient(
      harness.baseUrl,
      TK_SERVER_TOKEN,
      (request) => {
        receivedEnum = getChoiceEnum(request);
        return {
          action: 'accept',
          content: { choice: 'provide', token: EXISTING_PUBLIC_TOKEN }
        };
      }
    );

    const result = await client.callTool({
      name: 'style_comparison_tool',
      arguments: { before: 'mapbox/streets-v12', after: 'mapbox/outdoors-v12' }
    });

    expect(result.isError).toBeFalsy();
    expect(receivedEnum).toEqual(['provide']);
    expect(httpRequest).not.toHaveBeenCalled();
  });
});
