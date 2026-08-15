// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import {
  createServer,
  type IncomingMessage,
  type ServerResponse
} from 'node:http';
import { randomBytes } from 'node:crypto';

/**
 * Collects a sensitive value (a Mapbox access token) out-of-band from the MCP
 * connection itself, per the MCP spec's requirement that servers MUST use URL-mode
 * elicitation — not form-mode — for credentials ("Servers MUST NOT use form mode
 * elicitation to request sensitive information such as passwords, API keys, access
 * tokens, or payment credentials").
 *
 * `collect()` starts the out-of-band flow and returns the URL to present to the user
 * via a URL-mode elicitation request, plus a promise that resolves once the value has
 * been submitted (or rejects on timeout/failure). Callers MUST call `cancel()` if they
 * give up waiting on `result` (e.g. because the URL-mode elicitation request itself was
 * declined or unsupported) to release the resources started by `collect()`.
 */
export interface TokenCollectionHandler {
  collect(options: { timeoutMs: number }): Promise<{
    /** URL to present to the user via URL-mode elicitation. */
    url: string;
    /** Resolves with the raw submitted value, or rejects on timeout/failure. */
    result: Promise<string>;
    /** Releases resources without resolving `result`. Safe to call after `result`
     * has already settled — a no-op in that case. */
    cancel: () => void;
  }>;
}

/** Bounds how much of a POST body is buffered before the token itself is even
 * inspected — independent defense-in-depth against a huge submitted body, on top of
 * whatever length limit the caller enforces on the parsed token value afterward. */
const MAX_BODY_BYTES = 16 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Request body exceeds the maximum accepted size.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function formPage(): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Mapbox MCP DevKit — Preview Token</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem;">
  <h1>Provide your Mapbox public token</h1>
  <p>This page is running locally on your own machine and was opened at your request by
  your MCP client. The token you submit here is sent directly to the MCP DevKit server
  process running on this machine — not to your MCP client, and not through chat
  history.</p>
  <form method="POST">
    <input type="password" name="token" placeholder="pk...." required minlength="10" maxlength="2048" style="width: 100%; padding: 0.5rem; font-size: 1rem; box-sizing: border-box;" autofocus>
    <button type="submit" style="margin-top: 1rem; padding: 0.5rem 1.5rem; font-size: 1rem;">Submit</button>
  </form>
</body>
</html>`;
}

const SUCCESS_PAGE = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Mapbox MCP DevKit — Preview Token</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem;">
<h1>Token received</h1>
<p>You can close this window and return to your MCP client.</p>
</body>
</html>`;

/**
 * Default `TokenCollectionHandler`: a short-lived HTTP server bound to the loopback
 * interface only (`127.0.0.1`, never `0.0.0.0`), serving exactly one form at a random,
 * single-use path and accepting exactly one submission before tearing itself down. This
 * is the same pattern CLI OAuth flows use (`gh auth login`, `gcloud auth login`) — a
 * local callback server the user's own browser can reach.
 *
 * This only makes sense when the MCP server process and the user's browser run on the
 * same machine, which is true for this package's only shipped entry point
 * (`src/index.ts`, stdio-based). It is NOT appropriate for a deployment where the
 * server process runs somewhere other than the end user's own machine (e.g.
 * hosted-mcp-server, a cloud deployment) — a URL pointing at `127.0.0.1` there would
 * resolve to the *browser's* loopback interface, where nothing is listening. See
 * `ENABLE_LOCAL_URL_ELICITATION` in `tokenElicitation.ts` for the opt-out for that case.
 */
export class LocalHttpTokenCollectionHandler implements TokenCollectionHandler {
  async collect(options: { timeoutMs: number }): Promise<{
    url: string;
    result: Promise<string>;
    cancel: () => void;
  }> {
    const server = createServer();

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.removeListener('error', reject);
        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === 'string') {
      server.close();
      throw new Error(
        'Failed to determine local token-collection server address.'
      );
    }

    const path = `/${randomBytes(24).toString('hex')}`;
    const url = `http://127.0.0.1:${address.port}${path}`;

    let settled = false;
    let resolveResult!: (value: string) => void;
    let rejectResult!: (reason: unknown) => void;
    const result = new Promise<string>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    const finish = (action: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      server.close();
      action();
    };

    server.on('request', (req: IncomingMessage, res: ServerResponse) => {
      if (req.url !== path) {
        res.writeHead(404).end();
        return;
      }

      if (req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(formPage());
        return;
      }

      if (req.method === 'POST') {
        readBody(req)
          .then((body) => {
            const token = new URLSearchParams(body).get('token');
            if (!token) {
              // Let the user retry on the same page rather than tearing the server
              // down over one malformed submission.
              res.writeHead(400, {
                'content-type': 'text/html; charset=utf-8'
              });
              res.end(formPage());
              return;
            }
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            res.end(SUCCESS_PAGE);
            finish(() => resolveResult(token));
          })
          .catch((error) => {
            res.writeHead(400).end();
            finish(() =>
              rejectResult(
                error instanceof Error ? error : new Error(String(error))
              )
            );
          });
        return;
      }

      res.writeHead(405).end();
    });

    server.on('error', (error) => finish(() => rejectResult(error)));

    const timeoutHandle = setTimeout(() => {
      finish(() =>
        rejectResult(
          new Error(
            `Timed out after ${options.timeoutMs}ms waiting for the token to be submitted.`
          )
        )
      );
    }, options.timeoutMs);

    return {
      url,
      result,
      cancel: () =>
        finish(() => rejectResult(new Error('Token collection was cancelled.')))
    };
  }
}

/** Shared default instance, wired into the tools' constructors in `toolRegistry.ts` the
 * same way the `httpRequest` singleton in `httpPipeline.ts` is. */
export const localHttpTokenCollectionHandler =
  new LocalHttpTokenCollectionHandler();
