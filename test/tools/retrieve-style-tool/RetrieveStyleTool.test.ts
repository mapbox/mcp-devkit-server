import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import {
  setupFetch,
  assertHeadersSent
} from '../../utils/fetchRequestUtils.js';
import { RetrieveStyleTool } from '../../../src/tools/retrieve-style-tool/RetrieveStyleTool.js';

const mockToken =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

beforeAll(() => {
  process.env.MAPBOX_ACCESS_TOKEN = mockToken;
});

describe('RetrieveStyleTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const tool = new RetrieveStyleTool();
      expect(tool.name).toBe('retrieve_style_tool');
      expect(tool.description).toBe('Retrieve a specific Mapbox style by ID');
    });

    it('should have correct input schema', async () => {
      const { RetrieveStyleSchema } = await import(
        '../../../src/tools/retrieve-style-tool/RetrieveStyleTool.schema.js'
      );
      expect(RetrieveStyleSchema).toBeDefined();
    });
  });

  it('returns style data for successful fetch', async () => {
    const styleData = { id: 'style-123', name: 'Test Style' };
    const { fetch, mockFetch } = setupFetch({
      ok: true,
      status: 200,
      json: async () => styleData
    });

    const result = await new RetrieveStyleTool(fetch).run({
      styleId: 'style-123'
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: JSON.stringify(styleData)
    });
    assertHeadersSent(mockFetch);
  });

  it('handles fetch errors gracefully', async () => {
    const { fetch, mockFetch } = setupFetch({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    let result;
    try {
      result = await new RetrieveStyleTool(fetch).run({
        styleId: 'style-456'
      });
    } catch (e) {
      if (e instanceof Error) {
        expect(e.message).toContain('Failed to retrieve style: 404 Not Found');
      } else {
        expect.fail('Thrown error is not an instance of Error');
      }
      return;
    }

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: 'Failed to retrieve style: 404 Not Found'
    });
    assertHeadersSent(mockFetch);
  });
});
