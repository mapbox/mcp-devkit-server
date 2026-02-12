// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi } from 'vitest';
import { MapboxApiReferenceResource } from '../../../src/resources/mapbox-api-reference-resource/MapboxApiReferenceResource.js';

describe('MapboxApiReferenceResource', () => {
  const MOCK_DOCS = `# Mapbox Documentation

> Introduction text

## Maps client libraries & SDKs

- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [iOS SDK](https://docs.mapbox.com/ios/)

## Geocoding API

- [API Docs](https://docs.mapbox.com/api/search/geocoding/)
- [API Playground](https://docs.mapbox.com/playground/geocoding/)

## Map Design

- [Studio Manual](https://docs.mapbox.com/studio-manual/)

## API Playgrounds

- [Static Images Playground](https://docs.mapbox.com/playground/static/)

## Mapbox Tilesets

- [Tileset Reference](https://docs.mapbox.com/data/tilesets/reference/)
`;

  it('should have correct metadata', () => {
    const mockHttpRequest = vi.fn();
    const resource = new MapboxApiReferenceResource({
      httpRequest: mockHttpRequest
    });

    expect(resource.name).toBe('Mapbox API Reference');
    expect(resource.uri).toBe('resource://mapbox-api-reference');
    expect(resource.description).toContain('REST API reference');
    expect(resource.mimeType).toBe('text/markdown');
  });

  it('should fetch and filter API documentation', async () => {
    const mockHttpRequest = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_DOCS
    });

    const resource = new MapboxApiReferenceResource({
      httpRequest: mockHttpRequest
    });

    const result = await resource.readCallback(
      new URL('resource://mapbox-api-reference'),
      {} as any
    );

    expect(mockHttpRequest).toHaveBeenCalledWith(
      'https://docs.mapbox.com/llms.txt',
      {
        headers: {
          Accept: 'text/markdown, text/plain;q=0.9, */*;q=0.8'
        }
      }
    );

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe('resource://mapbox-api-reference');
    expect(result.contents[0].mimeType).toBe('text/markdown');
    expect(result.contents[0].text).toContain('# Mapbox API Reference');
    expect(result.contents[0].text).toContain('## Geocoding API');
    expect(result.contents[0].text).not.toContain(
      '## Maps client libraries & SDKs'
    );
    expect(result.contents[0].text).not.toContain('## Map Design');
    expect(result.contents[0].text).not.toContain('## API Playgrounds');
  });

  it('should handle HTTP errors', async () => {
    const mockHttpRequest = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found'
    });

    const resource = new MapboxApiReferenceResource({
      httpRequest: mockHttpRequest
    });

    await expect(
      resource.readCallback(
        new URL('resource://mapbox-api-reference'),
        {} as any
      )
    ).rejects.toThrow(
      'Failed to fetch Mapbox API reference: Failed to fetch Mapbox documentation: Not Found'
    );
  });

  it('should handle network errors', async () => {
    const mockHttpRequest = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));

    const resource = new MapboxApiReferenceResource({
      httpRequest: mockHttpRequest
    });

    await expect(
      resource.readCallback(
        new URL('resource://mapbox-api-reference'),
        {} as any
      )
    ).rejects.toThrow('Failed to fetch Mapbox API reference: Network error');
  });

  it('should only include API sections, not playgrounds', async () => {
    const mockHttpRequest = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => MOCK_DOCS
    });

    const resource = new MapboxApiReferenceResource({
      httpRequest: mockHttpRequest
    });

    const result = await resource.readCallback(
      new URL('resource://mapbox-api-reference'),
      {} as any
    );

    const content = result.contents[0].text;

    // Should include API sections
    expect(content).toContain('## Geocoding API');

    // Should NOT include playgrounds (those go in examples)
    expect(content).not.toContain('## API Playgrounds');
    expect(content).not.toContain('Static Images Playground');
  });
});
