// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { previewTokenStorage } from '../../src/utils/tokenElicitation.js';

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
