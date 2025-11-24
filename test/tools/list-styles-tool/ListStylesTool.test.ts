// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import {
  setupHttpRequest,
  assertHeadersSent
} from '../../utils/httpPipelineUtils.js';
import { ListStylesTool } from '../../../src/tools/list-styles-tool/ListStylesTool.js';

const mockToken = 'sk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

beforeAll(() => {
  process.env.MAPBOX_ACCESS_TOKEN = mockToken;
});

describe('ListStylesTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const { httpRequest } = setupHttpRequest();
      const tool = new ListStylesTool({ httpRequest });
      expect(tool.name).toBe('list_styles_tool');
      expect(tool.description).toBe(
        'List styles for a Mapbox account. Use limit parameter to avoid large responses (recommended: limit=5-10). Use start parameter for pagination.'
      );
    });

    it('should have correct input schema', async () => {
      const { ListStylesSchema } = await import(
        '../../../src/tools/list-styles-tool/ListStylesTool.input.schema.js'
      );
      expect(ListStylesSchema).toBeDefined();
    });
  });

  it('sends custom header', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => [
        { id: 'style1', name: 'Test Style 1' },
        { id: 'style2', name: 'Test Style 2' }
      ]
    });

    await new ListStylesTool({ httpRequest }).run({});
    assertHeadersSent(mockHttpRequest);
  });

  it('handles fetch errors gracefully', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const result = await new ListStylesTool({ httpRequest }).run({});

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: 'Failed to list styles: 404 Not Found'
    });
    assertHeadersSent(mockHttpRequest);
  });

  it('handles scope/permission errors with helpful message', async () => {
    const mockHeaders = new Map([['content-type', 'application/json']]);
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: {
        get: (name: string) => mockHeaders.get(name.toLowerCase())
      } as Headers,
      json: async () => ({
        message: 'This API requires a token with styles:list scope.'
      })
    });

    const result = await new ListStylesTool({ httpRequest }).run({});

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');
    const errorText = (result.content[0] as { type: 'text'; text: string })
      .text;
    expect(errorText).toContain(
      'This API requires a token with styles:list scope'
    );
    expect(errorText).toContain('appropriate scopes');
    expect(errorText).toContain('MAPBOX_ACCESS_TOKEN');
    assertHeadersSent(mockHttpRequest);
  });

  it('extracts username from token for API call', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => []
    });

    await new ListStylesTool({ httpRequest }).run({});

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.stringContaining('/styles/v1/test-user?access_token='),
      expect.any(Object)
    );
    assertHeadersSent(mockHttpRequest);
  });

  it('includes limit parameter when provided', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => []
    });

    await new ListStylesTool({ httpRequest }).run({ limit: 10 });

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.stringMatching(/\/styles\/v1\/test-user\?.*limit=10/),
      expect.any(Object)
    );
    assertHeadersSent(mockHttpRequest);
  });

  it('includes start parameter when provided', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => []
    });

    await new ListStylesTool({ httpRequest }).run({ start: 'abc123' });

    expect(mockHttpRequest).toHaveBeenCalledWith(
      expect.stringMatching(/\/styles\/v1\/test-user\?.*start=abc123/),
      expect.any(Object)
    );
    assertHeadersSent(mockHttpRequest);
  });

  it('includes both limit and start parameters when provided', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => []
    });

    await new ListStylesTool({ httpRequest }).run({
      limit: 5,
      start: 'xyz789'
    });

    const calledUrl = mockHttpRequest.mock.calls[0][0];
    expect(calledUrl).toMatch(/\/styles\/v1\/test-user\?/);
    expect(calledUrl).toMatch(/limit=5/);
    expect(calledUrl).toMatch(/start=xyz789/);
    expect(calledUrl).toMatch(/access_token=/);
    assertHeadersSent(mockHttpRequest);
  });

  it('returns style list on success', async () => {
    const mockStyles = [
      {
        id: 'style1',
        name: 'Test Style 1',
        owner: 'testuser',
        created: '2020-05-05T08:27:39.280Z',
        modified: '2020-05-05T08:27:41.353Z',
        visibility: 'private' as const,
        version: 8,
        sources: {},
        layers: []
      },
      {
        id: 'style2',
        name: 'Test Style 2',
        owner: 'testuser',
        created: '2020-05-06T08:27:39.280Z',
        modified: '2020-05-06T08:27:41.353Z',
        visibility: 'public' as const,
        version: 8,
        sources: {},
        layers: []
      }
    ];

    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => mockStyles
    });

    const result = await new ListStylesTool({ httpRequest }).run({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const content = result.content[0];
    if (content.type === 'text') {
      const parsedResponse = JSON.parse(content.text);
      expect(parsedResponse).toHaveProperty('styles');
      expect(parsedResponse.styles).toEqual(mockStyles);
    }

    // Verify structuredContent has the expected shape
    if (result.structuredContent) {
      expect(result.structuredContent).toHaveProperty('styles');
      expect(
        (result.structuredContent as { styles: unknown[] }).styles
      ).toEqual(mockStyles);
    }

    assertHeadersSent(mockHttpRequest);
  });

  it('handles styles without layers field (real API response)', async () => {
    // This matches the actual production API response format
    const mockStyles = [
      {
        center: [139.7667, 35.681249],
        created: '2020-05-05T08:27:39.280Z',
        id: 'ck9tnguii0ipm1ipf54wqhhwm',
        modified: '2020-05-05T08:27:41.353Z',
        name: 'Yahoo! Japan Streets',
        owner: 'svc-okta-mapbox-staff-access',
        sources: {
          composite: {
            url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.road-detail-v1-33,mapbox.transit-v2',
            type: 'vector'
          }
        },
        version: 8,
        visibility: 'private' as const,
        zoom: 16,
        protected: false
      }
    ];

    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => mockStyles
    });

    const result = await new ListStylesTool({ httpRequest }).run({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const content = result.content[0];
    if (content.type === 'text') {
      const parsedResponse = JSON.parse(content.text);
      expect(parsedResponse).toHaveProperty('styles');
      expect(parsedResponse.styles).toHaveLength(1);
      expect(parsedResponse.styles[0]).toMatchObject({
        id: 'ck9tnguii0ipm1ipf54wqhhwm',
        name: 'Yahoo! Japan Streets',
        owner: 'svc-okta-mapbox-staff-access',
        visibility: 'private',
        version: 8,
        protected: false
      });
      // Verify layers field is not required
      expect(parsedResponse.styles[0].layers).toBeUndefined();
    }

    assertHeadersSent(mockHttpRequest);
  });

  it('handles schema validation failures gracefully and logs warning', async () => {
    // API response that doesn't match schema (missing required fields)
    const invalidMockStyles = [
      {
        id: 'style1',
        name: 'Test Style',
        // Missing required fields like 'owner', 'created', 'modified', etc.
        customField: 'unexpected data'
      }
    ];

    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => invalidMockStyles
    });

    const tool = new ListStylesTool({ httpRequest });
    const logSpy = vi.spyOn(tool as any, 'log');

    const result = await tool.run({});

    // Should not error - graceful fallback to raw data
    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    // Should log a warning about validation failure
    expect(logSpy).toHaveBeenCalledWith(
      'warning',
      expect.stringContaining('ListStylesTool: Output schema validation failed')
    );

    // Should return the raw data despite validation failure
    const content = result.content[0];
    if (content.type === 'text') {
      const parsedResponse = JSON.parse(content.text);
      expect(parsedResponse).toHaveProperty('styles');
      expect(parsedResponse.styles).toEqual(invalidMockStyles);
      expect(parsedResponse.styles[0]).toHaveProperty('customField');
    }

    assertHeadersSent(mockHttpRequest);
  });
});
