// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  createPreviewToken,
  elicitPreviewToken,
  isTemporaryServerToken,
  listPublicPreviewTokens,
  previewTokenStorage
} from '../../src/utils/tokenElicitation.js';
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

  it('surfaces API errors', async () => {
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
  function fakeServer(choice: string) {
    const elicitInput = vi.fn().mockResolvedValue({
      action: 'accept',
      content: { choice, token: 'pk.provided-token' }
    });
    return { elicitInput } as unknown as Server;
  }

  it('offers all three choices when the server token can create tokens', async () => {
    const server = fakeServer('provide');
    await elicitPreviewToken(server, [], true);

    const request = (server.elicitInput as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(request.requestedSchema.properties.choice.enum).toEqual([
      'provide',
      'create',
      'auto'
    ]);
  });

  it('omits create/auto choices when the server token cannot create tokens', async () => {
    const server = fakeServer('provide');
    await elicitPreviewToken(server, [], false);

    const request = (server.elicitInput as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(request.requestedSchema.properties.choice.enum).toEqual(['provide']);
    expect(request.message).toContain('temporary session token');
  });

  it('throws when the user declines elicitation', async () => {
    const elicitInput = vi.fn().mockResolvedValue({ action: 'decline' });
    const server = { elicitInput } as unknown as Server;

    await expect(elicitPreviewToken(server, [], true)).rejects.toThrow(
      'Token elicitation was cancelled or declined by user'
    );
  });
});
