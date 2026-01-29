// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, expect, it } from 'vitest';
import { MapboxDocumentationResource } from '../../../src/resources/mapbox-documentation-resource/MapboxDocumentationResource.js';
import { setupHttpRequest } from '../../utils/httpPipelineUtils.js';

describe('MapboxDocumentationResource', () => {
  it('should have correct metadata', () => {
    const { httpRequest } = setupHttpRequest();
    const resource = new MapboxDocumentationResource({ httpRequest });

    expect(resource.name).toBe('Mapbox Documentation');
    expect(resource.uri).toBe('resource://mapbox-documentation');
    expect(resource.mimeType).toBe('text/markdown');
    expect(resource.description).toContain(
      'Latest official Mapbox documentation'
    );
  });

  it('should successfully fetch documentation content with proper MIME type', async () => {
    const mockContent = `# Mapbox Documentation

This is the Mapbox developer documentation for LLMs.

## Web SDKs
- Mapbox GL JS for interactive maps
- Mobile SDKs for iOS and Android

## APIs
- Geocoding API for address search
- Directions API for routing`;

    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockContent)
    });

    const resource = new MapboxDocumentationResource({ httpRequest });
    const uri = new URL('resource://mapbox-documentation');
    const result = await resource.readCallback(uri, {} as any);

    expect(mockHttpRequest).toHaveBeenCalledWith(
      'https://docs.mapbox.com/llms.txt',
      {
        headers: {
          Accept: 'text/markdown, text/plain;q=0.9, */*;q=0.8',
          'User-Agent': 'TestServer/1.0.0 (default, no-tag, abcdef)'
        }
      }
    );

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]).toMatchObject({
      uri: 'resource://mapbox-documentation',
      mimeType: 'text/markdown',
      text: mockContent
    });
  });

  it('should handle HTTP errors', async () => {
    const { httpRequest } = setupHttpRequest({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const resource = new MapboxDocumentationResource({ httpRequest });
    const uri = new URL('resource://mapbox-documentation');

    await expect(resource.readCallback(uri, {} as any)).rejects.toThrow(
      'Failed to fetch Mapbox documentation: Not Found'
    );
  });

  it('should handle network errors', async () => {
    const { httpRequest } = setupHttpRequest({
      text: () => Promise.reject(new Error('Network error'))
    });

    const resource = new MapboxDocumentationResource({ httpRequest });
    const uri = new URL('resource://mapbox-documentation');

    await expect(resource.readCallback(uri, {} as any)).rejects.toThrow(
      'Failed to fetch Mapbox documentation: Network error'
    );
  });

  it('should handle unknown errors', async () => {
    const { httpRequest } = setupHttpRequest({
      text: () => Promise.reject('String error')
    });

    const resource = new MapboxDocumentationResource({ httpRequest });
    const uri = new URL('resource://mapbox-documentation');

    await expect(resource.readCallback(uri, {} as any)).rejects.toThrow(
      'Failed to fetch Mapbox documentation: Unknown error occurred'
    );
  });
});
