// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { MapboxTokenScopesResource } from '../../src/resources/mapbox-token-scopes-resource/MapboxTokenScopesResource.js';

describe('MapboxTokenScopesResource', () => {
  let resource: MapboxTokenScopesResource;

  beforeEach(() => {
    resource = new MapboxTokenScopesResource();
  });

  describe('basic properties', () => {
    it('should have correct name and URI', () => {
      expect(resource.name).toBe('Mapbox Token Scopes Reference');
      expect(resource.uri).toBe('resource://mapbox-token-scopes');
      expect(resource.mimeType).toBe('text/markdown');
    });

    it('should have a description', () => {
      expect(resource.description).toContain('token scopes');
      expect(resource.description).toContain('permissions');
    });
  });

  describe('readCallback', () => {
    it('should return markdown content', async () => {
      const uri = new URL('resource://mapbox-token-scopes');
      const result = await resource['readCallback'](uri, {});

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe(uri.href);
      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toBeTruthy();
    });

    it('should document public token scopes', async () => {
      const uri = new URL('resource://mapbox-token-scopes');
      const result = await resource['readCallback'](uri, {});
      const markdown = result.contents[0].text;

      // Verify public scopes are documented
      expect(markdown).toContain('styles:tiles');
      expect(markdown).toContain('styles:read');
      expect(markdown).toContain('fonts:read');
      expect(markdown).toContain('datasets:read');
      expect(markdown).toContain('vision:read');
    });

    it('should document secret token scopes', async () => {
      const uri = new URL('resource://mapbox-token-scopes');
      const result = await resource['readCallback'](uri, {});
      const markdown = result.contents[0].text;

      // Verify secret scopes are documented
      expect(markdown).toContain('styles:write');
      expect(markdown).toContain('styles:list');
      expect(markdown).toContain('tokens:read');
      expect(markdown).toContain('tokens:write');
    });

    it('should include scope descriptions and use cases', async () => {
      const uri = new URL('resource://mapbox-token-scopes');
      const result = await resource['readCallback'](uri, {});
      const markdown = result.contents[0].text;

      // Verify scope descriptions are included
      expect(markdown).toContain('Purpose');
      expect(markdown).toContain('Required for');
      expect(markdown).toContain('Use case');
    });

    it('should include common scope combinations', async () => {
      const uri = new URL('resource://mapbox-token-scopes');
      const result = await resource['readCallback'](uri, {});
      const markdown = result.contents[0].text;

      expect(markdown).toContain('Common Scope Combinations');
      expect(markdown).toContain('For Map Display');
    });

    it('should include best practices', async () => {
      const uri = new URL('resource://mapbox-token-scopes');
      const result = await resource['readCallback'](uri, {});
      const markdown = result.contents[0].text;

      expect(markdown).toContain('Best Practices');
      expect(markdown).toContain('Public Tokens in Client Applications');
    });
  });
});
