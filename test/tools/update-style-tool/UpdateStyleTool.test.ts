// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import {
  setupHttpRequest,
  assertHeadersSent
} from '../../utils/httpPipelineUtils.js';
import { UpdateStyleTool } from '../../../src/tools/update-style-tool/UpdateStyleTool.js';

const mockToken =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

beforeAll(() => {
  process.env.MAPBOX_ACCESS_TOKEN = mockToken;
});

describe('UpdateStyleTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const { httpRequest } = setupHttpRequest();
      const tool = new UpdateStyleTool({ httpRequest });
      expect(tool.name).toBe('update_style_tool');
      expect(tool.description).toBe('Update an existing Mapbox style');
    });

    it('should have correct input schema', async () => {
      const { MapboxStyleInputSchema } = await import(
        '../../../src/tools/update-style-tool/UpdateStyleTool.input.schema.js'
      );
      expect(MapboxStyleInputSchema).toBeDefined();
    });
  });

  it('sends custom header', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => ({ id: 'updated-style-id', name: 'Updated Style' })
    });

    await new UpdateStyleTool({ httpRequest }).run({
      styleId: 'style-123',
      name: 'Updated Style',
      style: { version: 8, sources: {}, layers: [] }
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
      result = await new UpdateStyleTool({ httpRequest }).run({
        styleId: 'style-123',
        name: 'Updated Style',
        style: { version: 8, sources: {}, layers: [] }
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
      text: 'Failed to update style: 404 Not Found'
    });
    assertHeadersSent(mockHttpRequest);
  });
});
