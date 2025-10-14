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
      text: JSON.stringify(styleData)
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
});
