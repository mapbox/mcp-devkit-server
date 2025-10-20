// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import {
  setupHttpRequest,
  assertHeadersSent
} from '../../utils/httpPipelineUtils.js';
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
      const { httpRequest } = setupHttpRequest();
      const tool = new RetrieveStyleTool({ httpRequest });
      expect(tool.name).toBe('retrieve_style_tool');
      expect(tool.description).toBe('Retrieve a specific Mapbox style by ID');
    });

    it('should have correct input schema', async () => {
      const { RetrieveStyleSchema } = await import(
        '../../../src/tools/retrieve-style-tool/RetrieveStyleTool.input.schema.js'
      );
      expect(RetrieveStyleSchema).toBeDefined();
    });
  });

  it('returns style data for successful fetch', async () => {
    const styleData = { id: 'style-123', name: 'Test Style' };
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      status: 200,
      json: async () => styleData
    });

    const result = await new RetrieveStyleTool({ httpRequest }).run({
      styleId: 'style-123'
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: JSON.stringify({ data: styleData }, null, 2)
    });
    assertHeadersSent(mockHttpRequest);
  });

  it('handles fetch errors gracefully', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    let result;
    try {
      result = await new RetrieveStyleTool({ httpRequest }).run({
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
    assertHeadersSent(mockHttpRequest);
  });

  it('handles styles with null terrain and other nullable fields', async () => {
    // Real-world API response with null values for optional fields
    const styleData = {
      id: 'cjxyz123',
      name: 'Production Style',
      owner: 'test-user',
      version: 8,
      created: '2020-01-01T00:00:00.000Z',
      modified: '2020-01-02T00:00:00.000Z',
      visibility: 'private' as const,
      sources: {
        composite: {
          type: 'vector' as const,
          url: 'mapbox://mapbox.mapbox-streets-v8'
        }
      },
      layers: [
        {
          id: 'background',
          type: 'background' as const,
          paint: { 'background-color': '#000000' }
        }
      ],
      terrain: null, // API returns null instead of omitting the field
      fog: null,
      lights: null
    };

    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      status: 200,
      json: async () => styleData
    });

    const result = await new RetrieveStyleTool({ httpRequest }).run({
      styleId: 'cjxyz123'
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].type).toBe('text');

    const content = result.content[0];
    if (content.type === 'text') {
      const parsedResponse = JSON.parse(content.text).data;
      expect(parsedResponse.terrain).toBeNull();
      expect(parsedResponse.fog).toBeNull();
      expect(parsedResponse.lights).toBeNull();
      expect(parsedResponse.id).toBe('cjxyz123');
    }

    assertHeadersSent(mockHttpRequest);
  });
});
