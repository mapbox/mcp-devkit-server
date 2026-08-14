// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { LocalHttpTokenCollectionHandler } from '../../src/utils/tokenCollectionServer.js';

describe('LocalHttpTokenCollectionHandler', () => {
  it('binds to the loopback interface only', async () => {
    const handler = new LocalHttpTokenCollectionHandler();
    const { url, result, cancel } = await handler.collect({ timeoutMs: 5000 });
    // Attach the rejection assertion before cancelling so it's never briefly unhandled.
    const assertion = expect(result).rejects.toThrow(/cancelled/);

    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/[0-9a-f]{48}$/);
    cancel();
    await assertion;
  });

  it('resolves result with the submitted token on POST', async () => {
    const handler = new LocalHttpTokenCollectionHandler();
    const { url, result } = await handler.collect({ timeoutMs: 5000 });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: 'pk.submitted-token' }).toString()
    });

    expect(response.status).toBe(200);
    await expect(result).resolves.toBe('pk.submitted-token');
  });

  it('returns 404 for any path other than the assigned one', async () => {
    const handler = new LocalHttpTokenCollectionHandler();
    const { url, result, cancel } = await handler.collect({ timeoutMs: 5000 });
    const assertion = expect(result).rejects.toThrow(/cancelled/);
    const wrongUrl = new URL(url);
    wrongUrl.pathname = '/some-other-path';

    const response = await fetch(wrongUrl);
    expect(response.status).toBe(404);
    cancel();
    await assertion;
  });

  it('serves a form page on GET', async () => {
    const handler = new LocalHttpTokenCollectionHandler();
    const { url, result, cancel } = await handler.collect({ timeoutMs: 5000 });
    const assertion = expect(result).rejects.toThrow(/cancelled/);

    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    const body = await response.text();
    expect(body).toContain('<form');
    cancel();
    await assertion;
  });

  it('re-serves the form instead of settling when the token field is missing', async () => {
    const handler = new LocalHttpTokenCollectionHandler();
    const { url, result, cancel } = await handler.collect({ timeoutMs: 5000 });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({}).toString()
    });

    expect(response.status).toBe(400);

    // The server is still up and can accept a subsequent valid submission.
    const retry = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: 'pk.retry-token' }).toString()
    });
    expect(retry.status).toBe(200);
    await expect(result).resolves.toBe('pk.retry-token');
    cancel();
  });

  it('rejects a body exceeding the maximum accepted size', async () => {
    const handler = new LocalHttpTokenCollectionHandler();
    const { url, result } = await handler.collect({ timeoutMs: 5000 });
    // Attach the assertion before the request so it's never briefly unhandled,
    // regardless of exactly when the server-side rejection actually settles.
    const assertion = expect(result).rejects.toThrow(
      /exceeds the maximum accepted size/
    );

    const hugeBody = new URLSearchParams({
      token: 'pk.' + 'a'.repeat(20 * 1024)
    }).toString();

    // The connection may be reset mid-write once the size cap is hit; either
    // outcome (fetch throwing, or a non-2xx response) is an acceptable way for the
    // oversized submission to fail — what matters is `result` never resolves with it.
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: hugeBody
    }).catch(() => undefined);

    await assertion;
  });

  it('rejects after the timeout elapses and closes the server', async () => {
    const handler = new LocalHttpTokenCollectionHandler();
    const { url, result } = await handler.collect({ timeoutMs: 50 });

    await expect(result).rejects.toThrow(/Timed out after 50ms/);

    // The server has been torn down; a request to it should now fail to connect.
    await expect(fetch(url)).rejects.toThrow();
  });

  it('cancel() closes the server without resolving or rejecting result observably as a "submitted" outcome', async () => {
    const handler = new LocalHttpTokenCollectionHandler();
    const { url, result, cancel } = await handler.collect({ timeoutMs: 5000 });

    cancel();

    await expect(result).rejects.toThrow(/cancelled/);
    await expect(fetch(url)).rejects.toThrow();
  });

  it('cancel() after result has already settled is a safe no-op', async () => {
    const handler = new LocalHttpTokenCollectionHandler();
    const { url, result, cancel } = await handler.collect({ timeoutMs: 5000 });

    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: 'pk.already-done' }).toString()
    });
    await expect(result).resolves.toBe('pk.already-done');

    expect(() => cancel()).not.toThrow();
  });
});
