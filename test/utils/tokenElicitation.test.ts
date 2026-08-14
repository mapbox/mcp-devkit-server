// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  cacheKeyFor,
  collectProvidedToken,
  createPreviewToken,
  ElicitationUnavailableError,
  elicitPreviewToken,
  isTemporaryServerToken,
  listPublicPreviewTokens,
  previewTokenStorage,
  validatePublicPreviewToken
} from '../../src/utils/tokenElicitation.js';
import type { TokenCollectionHandler } from '../../src/utils/tokenCollectionServer.js';
import { setupHttpRequest } from './httpPipelineUtils.js';

const MAPBOX_API_ENDPOINT = 'https://api.mapbox.com/';

describe('PreviewTokenStorage', () => {
  // Clean up before each test to ensure isolation
  beforeEach(() => {
    previewTokenStorage.clearAll();
  });

  it('stores and retrieves tokens by username', () => {
    previewTokenStorage.set('test-user', 'pk.test-token-123');
    expect(previewTokenStorage.get('test-user')).toBe('pk.test-token-123');
  });

  it('returns undefined for non-existent username', () => {
    expect(previewTokenStorage.get('non-existent-user')).toBeUndefined();
  });

  it('overwrites existing token for same username', () => {
    previewTokenStorage.set('test-user', 'pk.old-token');
    previewTokenStorage.set('test-user', 'pk.new-token');
    expect(previewTokenStorage.get('test-user')).toBe('pk.new-token');
  });

  it('stores tokens for multiple users independently', () => {
    previewTokenStorage.set('user1', 'pk.token1');
    previewTokenStorage.set('user2', 'pk.token2');
    previewTokenStorage.set('user3', 'pk.token3');

    expect(previewTokenStorage.get('user1')).toBe('pk.token1');
    expect(previewTokenStorage.get('user2')).toBe('pk.token2');
    expect(previewTokenStorage.get('user3')).toBe('pk.token3');
  });

  it('clears specific username token', () => {
    previewTokenStorage.set('user1', 'pk.token1');
    previewTokenStorage.set('user2', 'pk.token2');

    previewTokenStorage.clear('user1');

    expect(previewTokenStorage.get('user1')).toBeUndefined();
    expect(previewTokenStorage.get('user2')).toBe('pk.token2'); // Other token unaffected
  });

  it('clearing non-existent username does not throw', () => {
    expect(() => {
      previewTokenStorage.clear('non-existent-user');
    }).not.toThrow();
  });

  it('clears all tokens', () => {
    previewTokenStorage.set('user1', 'pk.token1');
    previewTokenStorage.set('user2', 'pk.token2');
    previewTokenStorage.set('user3', 'pk.token3');

    previewTokenStorage.clearAll();

    expect(previewTokenStorage.get('user1')).toBeUndefined();
    expect(previewTokenStorage.get('user2')).toBeUndefined();
    expect(previewTokenStorage.get('user3')).toBeUndefined();
  });

  it('works correctly after clearAll and new sets', () => {
    previewTokenStorage.set('user1', 'pk.old-token');
    previewTokenStorage.clearAll();
    previewTokenStorage.set('user2', 'pk.new-token');

    expect(previewTokenStorage.get('user1')).toBeUndefined();
    expect(previewTokenStorage.get('user2')).toBe('pk.new-token');
  });

  it('handles empty string username', () => {
    previewTokenStorage.set('', 'pk.empty-user-token');
    expect(previewTokenStorage.get('')).toBe('pk.empty-user-token');
  });

  it('handles special characters in username', () => {
    const specialUsername = 'user@example.com';
    previewTokenStorage.set(specialUsername, 'pk.special-token');
    expect(previewTokenStorage.get(specialUsername)).toBe('pk.special-token');
  });

  it('evicts the least-recently-used entry once at capacity, bounding memory regardless of how many distinct keys are presented', () => {
    const MAX_CACHED_TOKENS = 1000; // matches the private constant in tokenElicitation.ts

    for (let i = 0; i < MAX_CACHED_TOKENS; i++) {
      previewTokenStorage.set(`key-${i}`, `pk.token-${i}`);
    }

    // One more insert should evict the oldest (key-0), not grow unbounded. Checking
    // key-0 here (rather than before this point) matters: `get()` itself counts as a
    // "use" and would otherwise protect key-0 from being the next eviction target.
    previewTokenStorage.set('key-overflow', 'pk.token-overflow');

    expect(previewTokenStorage.get('key-0')).toBeUndefined();
    expect(previewTokenStorage.get('key-overflow')).toBe('pk.token-overflow');
    // The rest of the original entries are still present.
    expect(previewTokenStorage.get('key-1')).toBe('pk.token-1');
  });

  it('reading an entry protects it from eviction, even if it was inserted first', () => {
    const MAX_CACHED_TOKENS = 1000;

    previewTokenStorage.set('key-0', 'pk.token-0');
    for (let i = 1; i < MAX_CACHED_TOKENS; i++) {
      previewTokenStorage.set(`key-${i}`, `pk.token-${i}`);
    }

    // Touch key-0 so it's no longer the least-recently-used entry.
    previewTokenStorage.get('key-0');

    // This overflow should now evict key-1 (the new least-recently-used), not key-0.
    previewTokenStorage.set('key-overflow', 'pk.token-overflow');

    expect(previewTokenStorage.get('key-0')).toBe('pk.token-0');
    expect(previewTokenStorage.get('key-1')).toBeUndefined();
  });
});

describe('isTemporaryServerToken', () => {
  it('identifies tk.* tokens as temporary', () => {
    expect(isTemporaryServerToken('tk.eyJ1IjoidGVzdCJ9.sig')).toBe(true);
  });

  it('does not treat pk.* tokens as temporary', () => {
    expect(isTemporaryServerToken('pk.eyJ1IjoidGVzdCJ9.sig')).toBe(false);
  });

  it('does not treat sk.* tokens as temporary', () => {
    expect(isTemporaryServerToken('sk.eyJ1IjoidGVzdCJ9.sig')).toBe(false);
  });
});

describe('cacheKeyFor', () => {
  it('is deterministic for the same token', () => {
    const token = 'sk.eyJ1IjoidGVzdC11c2VyIn0.sig';
    expect(cacheKeyFor(token)).toBe(cacheKeyFor(token));
  });

  it('returns a sha256 hex digest', () => {
    expect(cacheKeyFor('sk.eyJ1IjoidGVzdC11c2VyIn0.sig')).toMatch(
      /^[0-9a-f]{64}$/
    );
  });

  it('differs for two distinct tokens that decode to the same username', () => {
    // Same `u` claim ('test-user'), different signatures — a naive username-keyed
    // cache would conflate these two distinct, unverified bearers into one slot.
    const tokenA = 'sk.eyJ1IjoidGVzdC11c2VyIn0.signature-a';
    const tokenB = 'sk.eyJ1IjoidGVzdC11c2VyIn0.signature-b';
    expect(cacheKeyFor(tokenA)).not.toBe(cacheKeyFor(tokenB));
  });
});

describe('createPreviewToken', () => {
  it('rejects tk.* server tokens without making a network call', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest();

    const result = await createPreviewToken(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      'tk.eyJ1IjoidGVzdCJ9.sig',
      'test-user'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('temporary session token');
    expect(mockHttpRequest).not.toHaveBeenCalled();
  });

  it('creates a public token using only public scopes', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      json: async () => ({ token: 'pk.new-token' })
    });

    const result = await createPreviewToken(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      'sk.eyJ1IjoidGVzdCJ9.sig',
      'test-user',
      'My Token',
      ['https://example.com/*']
    );

    expect(result.success).toBe(true);
    expect(result.token).toBe('pk.new-token');

    const [url, init] = mockHttpRequest.mock.calls[0];
    expect(String(url)).toContain('tokens/v2/test-user');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.scopes).toEqual(['styles:read', 'styles:tiles', 'fonts:read']);
    expect(body.scopes).not.toContain('styles:download');
    expect(body.allowedUrls).toEqual(['https://example.com/*']);
  });

  it('rejects a non-public token returned by the API', async () => {
    const { httpRequest } = setupHttpRequest({
      json: async () => ({ token: 'sk.unexpected-secret' })
    });

    const result = await createPreviewToken(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      'sk.eyJ1IjoidGVzdCJ9.sig',
      'test-user'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('non-public token');
  });

  it('surfaces API errors with a scope hint on 403', async () => {
    const { httpRequest } = setupHttpRequest({
      ok: false,
      status: 403,
      text: async () => 'insufficient scopes'
    });

    const result = await createPreviewToken(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      'sk.eyJ1IjoidGVzdCJ9.sig',
      'test-user'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('insufficient scopes');
    expect(result.error).toContain('tokens:write');
  });

  it('does not add a scope hint for unrelated server errors', async () => {
    const { httpRequest } = setupHttpRequest({
      ok: false,
      status: 500,
      text: async () => 'internal server error'
    });

    const result = await createPreviewToken(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      'sk.eyJ1IjoidGVzdCJ9.sig',
      'test-user'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('internal server error');
    expect(result.error).not.toContain('tokens:write');
  });

  it('rejects an API response that omits the token field instead of throwing a raw TypeError', async () => {
    const { httpRequest } = setupHttpRequest({
      json: async () => ({})
    });

    const result = await createPreviewToken(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      'sk.eyJ1IjoidGVzdCJ9.sig',
      'test-user'
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/did not include a token/);
  });

  it('redacts the caller access token out of a network-error message before returning it', async () => {
    const secretToken = 'sk.eyJ1IjoidGVzdC11c2VyIn0.super-secret-signature';
    const httpRequest = vi
      .fn()
      .mockRejectedValue(
        new Error(
          `fetch failed: connect ECONNREFUSED, request to https://api.mapbox.com/tokens/v2/test-user?access_token=${secretToken}`
        )
      );

    const result = await createPreviewToken(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      secretToken,
      'test-user'
    );

    expect(result.success).toBe(false);
    expect(result.error).not.toContain(secretToken);
    expect(result.error).toContain('redacted');
  });

  it('redacts a token echoed back in a non-ok response body before returning it', async () => {
    const secretToken = 'sk.eyJ1IjoidGVzdC11c2VyIn0.super-secret-signature';
    const { httpRequest } = setupHttpRequest({
      ok: false,
      status: 400,
      text: async () =>
        `Bad request for access_token=${secretToken}: malformed body`
    });

    const result = await createPreviewToken(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      secretToken,
      'test-user'
    );

    expect(result.success).toBe(false);
    expect(result.error).not.toContain(secretToken);
  });
});

describe('listPublicPreviewTokens', () => {
  it('filters to public tokens with styles:read scope', async () => {
    const { httpRequest } = setupHttpRequest({
      json: async () => [
        { id: '1', note: 'public', scopes: ['styles:read'], token: 'pk.abc' },
        { id: '2', note: 'secret', scopes: ['styles:read'], token: 'sk.abc' },
        { id: '3', note: 'no-read', scopes: ['styles:tiles'], token: 'pk.abc' }
      ]
    });

    const tokens = await listPublicPreviewTokens(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      'sk.eyJ1IjoidGVzdCJ9.sig',
      'test-user'
    );

    expect(tokens).toEqual([
      { id: '1', note: 'public', scopes: ['styles:read'] }
    ]);
  });

  it('returns an empty list on API failure instead of throwing', async () => {
    const { httpRequest } = setupHttpRequest({ ok: false, status: 500 });

    const tokens = await listPublicPreviewTokens(
      httpRequest,
      MAPBOX_API_ENDPOINT,
      'sk.eyJ1IjoidGVzdCJ9.sig',
      'test-user'
    );

    expect(tokens).toEqual([]);
  });
});

describe('elicitPreviewToken', () => {
  function fakeSendRequest(choice: string) {
    return vi.fn().mockResolvedValue({
      action: 'accept',
      content: { choice }
    });
  }

  it('offers all three choices when the server token can create tokens', async () => {
    const sendRequest = fakeSendRequest('provide');
    await elicitPreviewToken(sendRequest, [], true);

    const request = sendRequest.mock.calls[0][0];
    expect(request.params.requestedSchema.properties.choice.enum).toEqual([
      'provide',
      'create',
      'auto'
    ]);
  });

  it('omits create/auto choices when the server token cannot create tokens', async () => {
    const sendRequest = fakeSendRequest('provide');
    await elicitPreviewToken(sendRequest, [], false);

    const request = sendRequest.mock.calls[0][0];
    expect(request.params.requestedSchema.properties.choice.enum).toEqual([
      'provide'
    ]);
    expect(request.params.message).toContain('temporary session token');
  });

  it('throws when the user declines elicitation', async () => {
    const sendRequest = vi.fn().mockResolvedValue({ action: 'decline' });

    await expect(elicitPreviewToken(sendRequest, [], true)).rejects.toThrow(
      'Token elicitation was cancelled or declined by user'
    );
  });

  it('wraps a failed sendRequest (e.g. the client has no elicitation support) in ElicitationUnavailableError', async () => {
    const sendRequest = vi
      .fn()
      .mockRejectedValue(new Error('Method not found'));

    await expect(elicitPreviewToken(sendRequest, [], true)).rejects.toThrow(
      ElicitationUnavailableError
    );
  });

  it('passes an explicit timeout to sendRequest rather than relying on the SDK default', async () => {
    const sendRequest = fakeSendRequest('provide');
    await elicitPreviewToken(sendRequest, [], true);

    const options = sendRequest.mock.calls[0][2];
    expect(options).toMatchObject({ timeout: expect.any(Number) });
    expect(options.timeout).toBeGreaterThan(0);
  });

  it('rejects a client-returned tokenNote that exceeds the max length', async () => {
    const sendRequest = vi.fn().mockResolvedValue({
      action: 'accept',
      content: {
        choice: 'create',
        tokenNote: 'a'.repeat(300)
      }
    });

    await expect(elicitPreviewToken(sendRequest, [], true)).rejects.toThrow(
      /Token name.*exceeds/
    );
  });

  it('rejects a client-returned urlRestrictions list that exceeds the max count', async () => {
    const tooManyUrls = Array.from(
      { length: 101 },
      (_, i) => `https://example${i}.com/*`
    ).join(',');
    const sendRequest = vi.fn().mockResolvedValue({
      action: 'accept',
      content: { choice: 'create', urlRestrictions: tooManyUrls }
    });

    await expect(elicitPreviewToken(sendRequest, [], true)).rejects.toThrow(
      /URL restrictions.*exceeds/
    );
  });

  it('rejects a client-returned urlRestrictions raw string that exceeds the max length, even as a single unsplit value', async () => {
    const sendRequest = vi.fn().mockResolvedValue({
      action: 'accept',
      content: {
        choice: 'create',
        // One URL far longer than the array-count cap alone would ever stop.
        urlRestrictions: 'https://example.com/' + 'a'.repeat(5000)
      }
    });

    await expect(elicitPreviewToken(sendRequest, [], true)).rejects.toThrow(
      /urlRestrictions value is .* characters/
    );
  });

  it('rejects an unrecognized choice value instead of silently treating it as auto-create', async () => {
    const sendRequest = vi.fn().mockResolvedValue({
      action: 'accept',
      content: { choice: 'delete-everything' }
    });

    await expect(elicitPreviewToken(sendRequest, [], true)).rejects.toThrow(
      /unrecognized token choice/
    );
  });

  it('rejects a choice offered only when canCreateTokens is true if the server token cannot create tokens', async () => {
    const sendRequest = vi.fn().mockResolvedValue({
      action: 'accept',
      content: { choice: 'auto' }
    });

    // canCreateTokens=false means only 'provide' was ever offered; a client
    // returning 'auto' anyway must not be honored.
    await expect(elicitPreviewToken(sendRequest, [], false)).rejects.toThrow(
      /unrecognized token choice/
    );
  });

  it('rejects a non-string urlRestrictions instead of crashing on .split()', async () => {
    const sendRequest = vi.fn().mockResolvedValue({
      action: 'accept',
      content: {
        choice: 'create',
        urlRestrictions: ['https://example.com/*']
      }
    });

    await expect(elicitPreviewToken(sendRequest, [], true)).rejects.toThrow(
      /non-string value for the urlRestrictions field/
    );
  });

  it('rejects a non-string tokenNote', async () => {
    const sendRequest = vi.fn().mockResolvedValue({
      action: 'accept',
      content: { choice: 'create', tokenNote: 42 }
    });

    await expect(elicitPreviewToken(sendRequest, [], true)).rejects.toThrow(
      /non-string value for the tokenNote field/
    );
  });

  it('propagates a request-timeout error instead of treating it as "client does not support elicitation"', async () => {
    const sendRequest = vi
      .fn()
      .mockRejectedValue(
        new McpError(ErrorCode.RequestTimeout, 'Request timed out')
      );

    const promise = elicitPreviewToken(sendRequest, [], true);
    await expect(promise).rejects.not.toBeInstanceOf(
      ElicitationUnavailableError
    );
    await expect(promise).rejects.toThrow('Request timed out');
  });

  it('propagates a cancellation error instead of treating it as "client does not support elicitation"', async () => {
    const sendRequest = vi
      .fn()
      .mockRejectedValue(
        new McpError(ErrorCode.InvalidRequest, 'Request cancelled')
      );

    const promise = elicitPreviewToken(sendRequest, [], true);
    await expect(promise).rejects.not.toBeInstanceOf(
      ElicitationUnavailableError
    );
    await expect(promise).rejects.toThrow('Request cancelled');
  });

  it('still wraps a genuine "client does not support elicitation" failure', async () => {
    const sendRequest = vi
      .fn()
      .mockRejectedValue(
        new McpError(ErrorCode.MethodNotFound, 'Method not found')
      );

    await expect(elicitPreviewToken(sendRequest, [], true)).rejects.toThrow(
      ElicitationUnavailableError
    );
  });
});

describe('validatePublicPreviewToken', () => {
  it('returns a valid pk.* token unchanged', () => {
    expect(validatePublicPreviewToken('pk.valid-token')).toBe('pk.valid-token');
  });

  it('rejects an empty string', () => {
    expect(() => validatePublicPreviewToken('')).toThrow(/No token provided/);
  });

  it('rejects a token exceeding the max length', () => {
    expect(() => validatePublicPreviewToken('pk.' + 'a'.repeat(3000))).toThrow(
      /exceeds the .* maximum/
    );
  });

  it('rejects a secret token, the same way the accessToken parameter is rejected', () => {
    expect(() =>
      validatePublicPreviewToken('sk.eyJ1IjoidGVzdC11c2VyIn0.secret-signature')
    ).toThrow(/Only public tokens \(starting with pk\.\*\) are allowed/);
  });
});

describe('collectProvidedToken', () => {
  const ORIGINAL_ENV = process.env.ENABLE_LOCAL_URL_ELICITATION;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.ENABLE_LOCAL_URL_ELICITATION;
    } else {
      process.env.ENABLE_LOCAL_URL_ELICITATION = ORIGINAL_ENV;
    }
  });

  /** A fake TokenCollectionHandler whose `result` settles with `outcome` (a token
   * string on success, an Error to reject with). Rejections get a no-op `.catch`
   * attached separately so they don't trigger an unhandled-rejection warning before
   * the code under test awaits the original `result` promise. */
  function fakeTokenCollectionHandler(outcome: string | Error): {
    handler: TokenCollectionHandler;
    cancel: ReturnType<typeof vi.fn>;
  } {
    const cancel = vi.fn();
    const result =
      outcome instanceof Error
        ? Promise.reject(outcome)
        : Promise.resolve(outcome);
    result.catch(() => {});
    return {
      handler: {
        collect: vi.fn().mockResolvedValue({
          url: 'http://127.0.0.1:9999/fake-path',
          result,
          cancel
        })
      },
      cancel
    };
  }

  function fakeSendRequest(action: 'accept' | 'decline' | 'cancel' = 'accept') {
    return vi.fn().mockResolvedValue({ action });
  }

  function fakeSendNotification() {
    return vi.fn().mockResolvedValue(undefined);
  }

  it('sends a URL-mode (not form-mode) elicitation request', async () => {
    const sendRequest = fakeSendRequest();
    const { handler } = fakeTokenCollectionHandler('pk.good-token');

    await collectProvidedToken(sendRequest, fakeSendNotification(), handler);

    const request = sendRequest.mock.calls[0][0];
    expect(request.params.mode).toBe('url');
    expect(request.params.url).toBe('http://127.0.0.1:9999/fake-path');
    expect(request.params.elicitationId).toEqual(expect.any(String));
  });

  it('returns the validated token once the client accepts and the out-of-band submission resolves', async () => {
    const { handler } = fakeTokenCollectionHandler('pk.good-token');

    const token = await collectProvidedToken(
      fakeSendRequest(),
      fakeSendNotification(),
      handler
    );

    expect(token).toBe('pk.good-token');
  });

  it('rejects a secret token submitted through URL-mode collection', async () => {
    const { handler } = fakeTokenCollectionHandler(
      'sk.eyJ1IjoidGVzdC11c2VyIn0.secret-signature'
    );

    await expect(
      collectProvidedToken(fakeSendRequest(), fakeSendNotification(), handler)
    ).rejects.toThrow(
      /Only public tokens \(starting with pk\.\*\) are allowed/
    );
  });

  it('cancels collection and wraps a failed sendRequest in ElicitationUnavailableError', async () => {
    const sendRequest = vi
      .fn()
      .mockRejectedValue(new Error('Method not found'));
    const { handler, cancel } = fakeTokenCollectionHandler('pk.good-token');

    await expect(
      collectProvidedToken(sendRequest, fakeSendNotification(), handler)
    ).rejects.toThrow(ElicitationUnavailableError);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('cancels collection and throws (not ElicitationUnavailableError) when the user declines the URL-mode consent', async () => {
    const { handler, cancel } = fakeTokenCollectionHandler('pk.good-token');

    const promise = collectProvidedToken(
      fakeSendRequest('decline'),
      fakeSendNotification(),
      handler
    );
    await expect(promise).rejects.not.toBeInstanceOf(
      ElicitationUnavailableError
    );
    await expect(promise).rejects.toThrow(/cancelled or declined/);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('propagates a timeout from the out-of-band submission itself', async () => {
    const { handler } = fakeTokenCollectionHandler(
      new Error(
        'Timed out after 300000ms waiting for the token to be submitted.'
      )
    );

    await expect(
      collectProvidedToken(fakeSendRequest(), fakeSendNotification(), handler)
    ).rejects.toThrow(/Timed out/);
  });

  it('sends notifications/elicitation/complete after a successful collection', async () => {
    const sendRequest = fakeSendRequest();
    const sendNotification = fakeSendNotification();
    const { handler } = fakeTokenCollectionHandler('pk.good-token');

    await collectProvidedToken(sendRequest, sendNotification, handler);

    const elicitationId = sendRequest.mock.calls[0][0].params.elicitationId;
    expect(sendNotification).toHaveBeenCalledWith({
      method: 'notifications/elicitation/complete',
      params: { elicitationId }
    });
  });

  it('does not fail overall if sendNotification itself rejects', async () => {
    const sendNotification = vi
      .fn()
      .mockRejectedValue(
        new Error('client does not support this notification')
      );
    const { handler } = fakeTokenCollectionHandler('pk.good-token');

    await expect(
      collectProvidedToken(fakeSendRequest(), sendNotification, handler)
    ).resolves.toBe('pk.good-token');
  });

  it('short-circuits to ElicitationUnavailableError without starting collection when disabled via env var', async () => {
    process.env.ENABLE_LOCAL_URL_ELICITATION = 'false';
    const { handler } = fakeTokenCollectionHandler('pk.good-token');

    await expect(
      collectProvidedToken(fakeSendRequest(), fakeSendNotification(), handler)
    ).rejects.toThrow(ElicitationUnavailableError);
    expect(handler.collect).not.toHaveBeenCalled();
  });
});
