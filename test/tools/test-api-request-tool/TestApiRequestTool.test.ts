// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

process.env.MAPBOX_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature';

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { TestApiRequestTool } from '../../../src/tools/test-api-request-tool/TestApiRequestTool.js';
import type { HttpRequest } from '../../../src/utils/types.js';

// Sample geocoding API response
const sampleGeocodingResponse = {
  type: 'FeatureCollection',
  query: ['san', 'francisco'],
  features: [
    {
      id: 'place.12345',
      type: 'Feature',
      place_type: ['place'],
      relevance: 1,
      properties: {},
      text: 'San Francisco',
      place_name: 'San Francisco, California, United States',
      center: [-122.4194, 37.7749],
      geometry: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749]
      }
    }
  ],
  attribution: 'NOTICE: Test data'
};

describe('TestApiRequestTool', () => {
  let mockHttpRequest: ReturnType<typeof vi.fn>;
  let tool: TestApiRequestTool;

  beforeEach(() => {
    // Mock httpRequest function
    mockHttpRequest = vi.fn();
    tool = new TestApiRequestTool({
      httpRequest: mockHttpRequest as HttpRequest
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct tool metadata', () => {
    expect(tool.name).toBe('test_api_request_tool');
    expect(tool.description).toBeTruthy();
    expect(tool.annotations).toBeDefined();
    expect(tool.annotations.title).toBe('Test API Request');
  });

  it('should execute valid API request and return response', async () => {
    // Mock successful API response
    mockHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleGeocodingResponse,
      headers: new Headers({
        'content-type': 'application/json',
        'x-rate-limit-interval': '60',
        'x-rate-limit-limit': '600'
      })
    });

    const testInput = {
      api: 'geocoding',
      operation: 'forward-geocode',
      parameters: {
        path: {
          mode: 'mapbox.places',
          query: 'San Francisco'
        },
        query: {
          limit: 1
        }
      }
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(false);
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('✓ Success');
    expect(result.content[0].text).toContain('200');

    // Verify structured content
    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent.success).toBe(true);
    expect(result.structuredContent.statusCode).toBe(200);
    expect(result.structuredContent.response.data).toEqual(
      sampleGeocodingResponse
    );
    expect(result.structuredContent.executionTime).toBeGreaterThanOrEqual(0);

    // Verify HTTP request was made with correct URL
    expect(mockHttpRequest).toHaveBeenCalled();
    const callUrl = mockHttpRequest.mock.calls[0][0];
    expect(callUrl).toContain(
      '/geocoding/v5/mapbox.places/San%20Francisco.json'
    );
    expect(callUrl).toContain('access_token=');
    expect(callUrl).toContain('limit=1');
  });

  it('should generate code snippets when requested', async () => {
    mockHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleGeocodingResponse,
      headers: new Headers({ 'content-type': 'application/json' })
    });

    const testInput = {
      api: 'geocoding',
      operation: 'forward-geocode',
      parameters: {
        path: {
          mode: 'mapbox.places',
          query: 'Paris'
        }
      },
      generateCode: true,
      codeLanguages: ['curl', 'javascript', 'python']
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(false);
    expect(result.structuredContent.codeSnippets).toBeDefined();
    expect(result.structuredContent.codeSnippets).toHaveLength(3);

    // Check curl snippet
    const curlSnippet = result.structuredContent.codeSnippets.find(
      (s) => s.language === 'curl'
    );
    expect(curlSnippet).toBeDefined();
    expect(curlSnippet.code).toContain('curl');
    expect(curlSnippet.code).toContain('geocoding');

    // Check JavaScript snippet
    const jsSnippet = result.structuredContent.codeSnippets.find(
      (s) => s.language === 'javascript'
    );
    expect(jsSnippet).toBeDefined();
    expect(jsSnippet.code).toContain('fetch');
    expect(jsSnippet.code).toContain('YOUR_ACCESS_TOKEN');

    // Check Python snippet
    const pySnippet = result.structuredContent.codeSnippets.find(
      (s) => s.language === 'python'
    );
    expect(pySnippet).toBeDefined();
    expect(pySnippet.code).toContain('import requests');
    expect(pySnippet.code).toContain('YOUR_ACCESS_TOKEN');

    // Verify text output includes code examples
    expect(result.content[0].text).toContain('## Code Examples');
    expect(result.content[0].text).toContain('### CURL');
    expect(result.content[0].text).toContain('### JAVASCRIPT');
    expect(result.content[0].text).toContain('### PYTHON');
  });

  it('should skip code generation when generateCode is false', async () => {
    mockHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleGeocodingResponse,
      headers: new Headers({ 'content-type': 'application/json' })
    });

    const testInput = {
      api: 'geocoding',
      operation: 'forward-geocode',
      parameters: {
        path: {
          mode: 'mapbox.places',
          query: 'London'
        }
      },
      generateCode: false
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(false);
    expect(result.structuredContent.codeSnippets).toBeUndefined();
    expect(result.content[0].text).not.toContain('## Code Examples');
  });

  it('should return error for invalid API name', async () => {
    const testInput = {
      api: 'invalid-api',
      operation: 'some-operation',
      parameters: {}
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('API "invalid-api" not found');
    expect(result.content[0].text).toContain('Available APIs:');
  });

  it('should return error for invalid operation', async () => {
    const testInput = {
      api: 'geocoding',
      operation: 'invalid-operation',
      parameters: {}
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      'Operation "invalid-operation" not found'
    );
    expect(result.content[0].text).toContain('Available operations:');
  });

  it('should handle API errors gracefully', async () => {
    // Mock failed API response
    mockHttpRequest.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Invalid token' }),
      headers: new Headers({ 'content-type': 'application/json' })
    });

    const testInput = {
      api: 'geocoding',
      operation: 'forward-geocode',
      parameters: {
        path: {
          mode: 'mapbox.places',
          query: 'Berlin'
        }
      }
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(true);
    expect(result.structuredContent.success).toBe(false);
    expect(result.structuredContent.statusCode).toBe(401);
    expect(result.structuredContent.response.error).toContain('401');
    expect(result.content[0].text).toContain('✗ Failed');
    expect(result.content[0].text).toContain('401');
  });

  it('should handle network errors gracefully', async () => {
    // Mock network error
    mockHttpRequest.mockRejectedValue(new TypeError('Failed to fetch'));

    const testInput = {
      api: 'geocoding',
      operation: 'forward-geocode',
      parameters: {
        path: {
          mode: 'mapbox.places',
          query: 'Tokyo'
        }
      }
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(true);
    expect(result.structuredContent.success).toBe(false);
    expect(result.structuredContent.response.error).toContain(
      'Failed to fetch'
    );
    expect(result.content[0].text).toContain('Error executing API request');
  });

  it('should handle POST requests with body parameters', async () => {
    mockHttpRequest.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 'style-123', name: 'Test Style' }),
      headers: new Headers({ 'content-type': 'application/json' })
    });

    const testInput = {
      api: 'styles',
      operation: 'create-style',
      parameters: {
        path: {
          username: 'testuser'
        },
        body: {
          name: 'Test Style',
          version: 8,
          sources: {},
          layers: []
        }
      },
      generateCode: false
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(false);
    expect(mockHttpRequest).toHaveBeenCalled();

    // Verify request options included body
    const requestOptions = mockHttpRequest.mock.calls[0][1];
    expect(requestOptions.method).toBe('POST');
    expect(requestOptions.body).toBeDefined();
    expect(JSON.parse(requestOptions.body)).toEqual(testInput.parameters.body);
  });

  it('should include response headers in output', async () => {
    mockHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleGeocodingResponse,
      headers: new Headers({
        'content-type': 'application/json',
        'x-rate-limit-interval': '60',
        'x-rate-limit-limit': '600',
        'x-rate-limit-reset': '1234567890',
        'cache-control': 'public, max-age=300'
      })
    });

    const testInput = {
      api: 'geocoding',
      operation: 'forward-geocode',
      parameters: {
        path: {
          mode: 'mapbox.places',
          query: 'Rome'
        }
      }
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(false);
    expect(result.structuredContent.response.headers).toBeDefined();
    expect(
      result.structuredContent.response.headers['x-rate-limit-limit']
    ).toBe('600');
    expect(result.structuredContent.response.headers['cache-control']).toBe(
      'public, max-age=300'
    );
    expect(result.content[0].text).toContain('## Response Headers');
  });

  it('should generate only requested code languages', async () => {
    mockHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleGeocodingResponse,
      headers: new Headers({ 'content-type': 'application/json' })
    });

    const testInput = {
      api: 'geocoding',
      operation: 'forward-geocode',
      parameters: {
        path: {
          mode: 'mapbox.places',
          query: 'Madrid'
        }
      },
      generateCode: true,
      codeLanguages: ['curl']
    };

    const result = await tool.run(testInput);

    expect(result.isError).toBe(false);
    expect(result.structuredContent.codeSnippets).toHaveLength(1);
    expect(result.structuredContent.codeSnippets[0].language).toBe('curl');
  });
});
