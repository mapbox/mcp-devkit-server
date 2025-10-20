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
        version: 8,
        id: 'style1',
        name: 'Test Style 1',
        owner: 'testuser',
        sources: {},
        layers: []
      },
      {
        version: 8,
        id: 'style2',
        name: 'Test Style 2',
        owner: 'testuser',
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
      expect(parsedResponse).toEqual(mockStyles);
    }

    assertHeadersSent(mockHttpRequest);
  });
});
