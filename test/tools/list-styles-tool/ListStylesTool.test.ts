// Use a token with valid JWT format for tests
process.env.MAPBOX_ACCESS_TOKEN =
  'sk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  setupFetch,
  assertHeadersSent
} from '../../utils/fetchRequestUtils.js';
import { ListStylesTool } from '../../../src/tools/list-styles-tool/ListStylesTool.js';

describe('ListStylesTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const tool = new ListStylesTool();
      expect(tool.name).toBe('list_styles_tool');
      expect(tool.description).toBe(
        'List styles for a Mapbox account. Use limit parameter to avoid large responses (recommended: limit=5-10). Use start parameter for pagination.'
      );
    });

    it('should have correct input schema', async () => {
      const { ListStylesSchema } = await import(
        '../../../src/tools/list-styles-tool/ListStylesTool.schema.js'
      );
      expect(ListStylesSchema).toBeDefined();
    });
  });

  it('sends custom header', async () => {
    const { fetch, mockFetch } = setupFetch({
      ok: true,
      json: async () => [
        { id: 'style1', name: 'Test Style 1' },
        { id: 'style2', name: 'Test Style 2' }
      ]
    });

    await new ListStylesTool(fetch).run({});
    assertHeadersSent(mockFetch);
  });

  it('handles fetch errors gracefully', async () => {
    const { fetch, mockFetch } = setupFetch({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const result = await new ListStylesTool(fetch).run({});

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: 'Failed to list styles: 404 Not Found'
    });
    assertHeadersSent(mockFetch);
  });

  it('extracts username from token for API call', async () => {
    const { fetch, mockFetch } = setupFetch({
      ok: true,
      json: async () => []
    });

    await new ListStylesTool(fetch).run({});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/styles/v1/test-user?access_token='),
      expect.any(Object)
    );
    assertHeadersSent(mockFetch);
  });

  it('includes limit parameter when provided', async () => {
    const { fetch, mockFetch } = setupFetch({
      ok: true,
      json: async () => []
    });

    await new ListStylesTool(fetch).run({ limit: 10 });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/styles\/v1\/test-user\?.*limit=10/),
      expect.any(Object)
    );
    assertHeadersSent(mockFetch);
  });

  it('includes start parameter when provided', async () => {
    const { fetch, mockFetch } = setupFetch({
      ok: true,
      json: async () => []
    });

    await new ListStylesTool(fetch).run({ start: 'abc123' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/styles\/v1\/test-user\?.*start=abc123/),
      expect.any(Object)
    );
    assertHeadersSent(mockFetch);
  });

  it('includes both limit and start parameters when provided', async () => {
    const { fetch, mockFetch } = setupFetch({
      ok: true,
      json: async () => []
    });

    await new ListStylesTool(fetch).run({ limit: 5, start: 'xyz789' });

    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/\/styles\/v1\/test-user\?/);
    expect(calledUrl).toMatch(/limit=5/);
    expect(calledUrl).toMatch(/start=xyz789/);
    expect(calledUrl).toMatch(/access_token=/);
    assertHeadersSent(mockFetch);
  });

  it('returns style list on success', async () => {
    const mockStyles = [
      { id: 'style1', name: 'Test Style 1', owner: 'testuser' },
      { id: 'style2', name: 'Test Style 2', owner: 'testuser' }
    ];

    const { fetch, mockFetch } = setupFetch({
      ok: true,
      json: async () => mockStyles
    });

    const result = await new ListStylesTool(fetch).run({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const content = result.content[0];
    if (content.type === 'text') {
      const parsedResponse = JSON.parse(content.text);
      expect(parsedResponse).toEqual(mockStyles);
    }

    assertHeadersSent(mockFetch);
  });
});
