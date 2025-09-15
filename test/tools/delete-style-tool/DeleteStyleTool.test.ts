import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import {
  setupFetch,
  assertHeadersSent
} from '../../utils/fetchRequestUtils.js';
import { DeleteStyleTool } from '../../../src/tools/delete-style-tool/DeleteStyleTool.js';

const mockToken =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

beforeAll(() => {
  process.env.MAPBOX_ACCESS_TOKEN = mockToken;
});

describe('DeleteStyleTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const tool = new DeleteStyleTool();
      expect(tool.name).toBe('delete_style_tool');
      expect(tool.description).toBe('Delete a Mapbox style by ID');
    });

    it('should have correct input schema', async () => {
      const { DeleteStyleSchema } = await import(
        '../../../src/tools/delete-style-tool/DeleteStyleTool.schema.js'
      );
      expect(DeleteStyleSchema).toBeDefined();
    });
  });

  it('returns success for 204 No Content', async () => {
    const { fetch, mockFetch } = setupFetch({
      ok: true,
      status: 204
    });

    const result = await new DeleteStyleTool(fetch).run({
      styleId: 'style-123'
    });

    expect(result.content[0]).toEqual({
      type: 'text',
      text: '{"success":true,"message":"Style deleted successfully"}'
    });
    assertHeadersSent(mockFetch);
  });

  it('returns response body for non-204 success', async () => {
    const { fetch, mockFetch } = setupFetch({
      ok: true,
      status: 200,
      json: async () => ({ deleted: true })
    });

    const result = await new DeleteStyleTool(fetch).run({
      styleId: 'style-123'
    });

    expect(result.isError).toBe(false);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: `{"deleted":true}`
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
      result = await new DeleteStyleTool(fetch).run({
        styleId: 'style-123'
      });
    } catch (e) {
      if (e instanceof Error) {
        expect(e.message).toContain('Failed to update style: 404 Not Found');
      } else {
        expect.fail('Thrown error is not an instance of Error');
      }
      return;
    }
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: 'Failed to delete style: 404 Not Found'
    });
    assertHeadersSent(mockFetch);
  });
});
