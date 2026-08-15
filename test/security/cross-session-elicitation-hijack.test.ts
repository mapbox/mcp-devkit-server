// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

/**
 * Regression test for a cross-session elicitation hijack.
 *
 * `BaseTool.installTo(server)` does `this.server = server` — mutable state on the tool
 * object itself. `CORE_TOOLS` (src/tools/toolRegistry.ts) instantiates tools once as
 * module-level singletons, and any embedder that reuses those singletons across
 * multiple concurrent sessions (calling `installTo()` again for each new session — the
 * pattern mcp-server's own scripts/dev-http-server.ts uses, and that hosted-mcp-server's
 * dynamic `import()` caching produces too) clobbers `this.server` on every new
 * connection.
 *
 * Before this PR, `this.server` was only ever read for logging. PreviewStyleTool /
 * StyleComparisonTool's elicitation flow is the first thing that reads it for something
 * session-sensitive: `elicitPreviewToken(this.server.server, ...)`. No race or timing
 * window is even needed to trigger it — `this.server` is durably overwritten by whichever
 * session's `installTo()` ran most recently, and stays that way until another session
 * connects. So once session B connects (after session A), *every* subsequent tool call
 * on the shared instance — including one made over session A's own, already-established
 * connection — sends its elicitation request to session B instead. An uninvolved client
 * gets an unprompted "paste your token" dialog for a tool call it never made, and
 * whatever it submits comes back as the *other* session's tool result: an
 * unprompted-dialog-injection + credential-exfiltration primitive, not a hypothetical.
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
import { previewTokenStorage } from '../../src/utils/tokenElicitation.js';
import type { TokenCollectionHandler } from '../../src/utils/tokenCollectionServer.js';
import type { HttpRequest } from '../../src/utils/types.js';

// Non-tk.* tokens so `canCreateTokens` is true and the code actually awaits
// `listPublicPreviewTokens` before reaching the elicitation call.
const SESSION_A_TOKEN =
  'sk.eyJ1IjoidGVzdC11c2VyLWEiLCJhIjoidGVzdC1hcGkifQ.signature-a';
const SESSION_B_TOKEN =
  'sk.eyJ1IjoidGVzdC11c2VyLWIiLCJhIjoidGVzdC1hcGkifQ.signature-b';

// Realistic pk.<base64 JWT payload>.sig shape — PreviewStyleTool decodes the `u` claim
// out of whichever token collectProvidedToken returns to build the preview URL, so this
// needs to parse cleanly for the test to observe that it made it into the result.
const SESSION_A_SUPPLIED_TOKEN = 'pk.eyJ1IjoiYXR0YWNrZXItYWNjb3VudCJ9.sig-a';

interface Harness {
  baseUrl: URL;
  close(): Promise<void>;
}

/** A fake TokenCollectionHandler that resolves immediately with `token`, instead of
 * starting a real local server and waiting for an actual browser submission that will
 * never come in a test. */
function fakeTokenCollectionHandler(token: string): TokenCollectionHandler {
  return {
    collect: vi.fn().mockResolvedValue({
      url: 'http://127.0.0.1:1/fake-collection-url',
      result: Promise.resolve(token),
      cancel: vi.fn()
    })
  };
}

/**
 * Installs a *shared* `PreviewStyleTool` instance onto a fresh `McpServer` for every
 * new session — mirroring how CORE_TOOLS' singletons get reused across sessions in a
 * real multi-tenant deployment. Session-scoped (one transport per Mcp-Session-Id), not
 * the fully-stateless-per-request pattern, so this isn't about the separate capability-
 * negotiation issue documented in test/integration/elicitationOverHttp.test.ts — this
 * harness's whole point is that both sessions' capability negotiation works correctly,
 * and the tool still sends the request to the wrong one.
 */
function startSharedSingletonHarness(
  previewTool: PreviewStyleTool
): Promise<Harness> {
  const sessions = new Map<string, StreamableHTTPServerTransport>();

  async function buildTransport(): Promise<StreamableHTTPServerTransport> {
    const mcpServer = new McpServer(
      { name: 'cross-session-hijack-test', version: '1.0.0' },
      { capabilities: { tools: { listChanged: true } } }
    );
    // The exact line under test: reusing one tool instance across sessions.
    previewTool.installTo(mcpServer);

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
    await mcpServer.connect(transport);
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
      const transport = existing ?? (await buildTransport());

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
    { name: 'cross-session-hijack-test-client', version: '1.0.0' },
    // Declare both modes — an empty `elicitation: {}` is normalized by the SDK to
    // form-only support, which would make the follow-up URL-mode request (see
    // collectProvidedToken) look unsupported and short-circuit to a different
    // fallback path than the one this test is actually exercising.
    { capabilities: { elicitation: { form: {}, url: {} } } }
  );
  client.setRequestHandler(ElicitRequestSchema, (request) => onElicit(request));

  const transport = new StreamableHTTPClientTransport(baseUrl, {
    requestInit: { headers: { Authorization: `Bearer ${bearerToken}` } }
  });
  await client.connect(transport);
  return client;
}

describe('cross-session elicitation hijack (singleton tool instance reused across sessions)', () => {
  let harness: Harness | undefined;
  let clientA: Client | undefined;
  let clientB: Client | undefined;
  const ORIGINAL_ENABLE_LOCAL_URL_ELICITATION =
    process.env.ENABLE_LOCAL_URL_ELICITATION;

  beforeEach(() => {
    previewTokenStorage.clearAll();
    // Opt-in (disabled by default) — this harness simulates the stdio entry point,
    // the one context where src/index.ts enables this automatically.
    process.env.ENABLE_LOCAL_URL_ELICITATION = 'true';
  });

  afterEach(async () => {
    await clientA?.close().catch(() => {});
    await clientB?.close().catch(() => {});
    await harness?.close();
    clientA = undefined;
    clientB = undefined;
    harness = undefined;
    if (ORIGINAL_ENABLE_LOCAL_URL_ELICITATION === undefined) {
      delete process.env.ENABLE_LOCAL_URL_ELICITATION;
    } else {
      process.env.ENABLE_LOCAL_URL_ELICITATION =
        ORIGINAL_ENABLE_LOCAL_URL_ELICITATION;
    }
  });

  it("does not send session A's elicitation prompt to session B, when B connected more recently and B's installTo() call is the last one to touch the shared tool's this.server", async () => {
    const httpRequest: HttpRequest = vi.fn(
      async () => new Response(JSON.stringify([]), { status: 200 })
    ) as unknown as HttpRequest;

    // ONE shared instance, installed onto two different sessions below — this is the
    // exact shape of CORE_TOOLS being reused across concurrent sessions. Only session
    // A's tool call actually completes an elicitation flow in this test, so a single
    // fake token-collection handler resolving with session A's token is enough.
    const previewTool = new PreviewStyleTool({
      httpRequest,
      tokenCollectionHandler: fakeTokenCollectionHandler(
        SESSION_A_SUPPLIED_TOKEN
      )
    });

    harness = await startSharedSingletonHarness(previewTool);

    // Answers both the form-mode choice dialog and the follow-up URL-mode consent
    // request with the same "accept" response — content.token is unused for either
    // step now (see collectProvidedToken); the actual token comes from the fake
    // tokenCollectionHandler above instead.
    const elicitReceivedByA = vi.fn().mockReturnValue({
      action: 'accept',
      content: { choice: 'provide' }
    });
    const elicitReceivedByB = vi.fn().mockReturnValue({
      action: 'accept',
      content: { choice: 'provide' }
    });

    // Session A connects and installs the shared tool onto its own McpServer —
    // `this.server` points at session A's server at this instant.
    clientA = await connectClient(
      harness.baseUrl,
      SESSION_A_TOKEN,
      elicitReceivedByA
    );

    // Session B connects afterward, reusing the SAME `previewTool` instance. Its
    // installTo() call overwrites `this.server` to session B's server — durably, not
    // just for a brief race window. No timing/interleaving is needed for this to
    // matter: it stays this way until a third session connects.
    clientB = await connectClient(
      harness.baseUrl,
      SESSION_B_TOKEN,
      elicitReceivedByB
    );

    // Session A now calls the tool over its own, already-established connection —
    // it never calls installTo() again, so this doesn't touch `this.server`. Whatever
    // is currently in `this.server` (session B's, from the previous step) is what the
    // shared tool instance will use for elicitation, regardless of which session's
    // request is actually being handled.
    const resultForSessionA = await clientA.callTool({
      name: 'preview_style_tool',
      arguments: { styleId: 'session-a-style' }
    });

    // The fix: session A's own client must be the one asked, regardless of what
    // installTo() calls happened on the shared tool instance in the meantime. Called
    // twice — the form-mode choice dialog, then the follow-up URL-mode consent
    // request (see collectProvidedToken) — both correctly routed to session A.
    expect(elicitReceivedByA).toHaveBeenCalledTimes(2);
    expect(elicitReceivedByB).not.toHaveBeenCalled();

    // And the result that comes back for session A's tool call must reflect session
    // A's own answer, not whatever an uninvolved session happened to submit.
    const text = (
      resultForSessionA.content as Array<{ type: string; text?: string }>
    )[0].text as string;
    expect(text).toContain(`access_token=${SESSION_A_SUPPLIED_TOKEN}`);
  });
});
