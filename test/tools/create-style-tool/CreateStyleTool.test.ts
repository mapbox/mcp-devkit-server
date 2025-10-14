// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import {
  setupHttpRequest,
  assertHeadersSent
} from '../../utils/httpPipelineUtils.js';
import { CreateStyleTool } from '../../../src/tools/create-style-tool/CreateStyleTool.js';

const mockToken =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

beforeAll(() => {
  process.env.MAPBOX_ACCESS_TOKEN = mockToken;
});

describe('CreateStyleTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const { httpRequest } = setupHttpRequest();
      const tool = new CreateStyleTool({ httpRequest });
      expect(tool.name).toBe('create_style_tool');
      expect(tool.description).toBe('Create a new Mapbox style');
    });

    it('should have correct input schema', async () => {
      const { MapboxStyleInputSchema } = await import(
        '../../../src/tools/create-style-tool/CreateStyleTool.input.schema.js'
      );
      expect(MapboxStyleInputSchema).toBeDefined();
    });
  });

  it('sends custom header', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      json: async () => ({ id: 'new-style-id', name: 'Test Style' })
    });

    await new CreateStyleTool({ httpRequest }).run({
      name: 'Test Style',
      style: { version: 8, sources: {}, layers: [] }
    });
    assertHeadersSent(mockHttpRequest);
  });

  it('handles fetch errors gracefully', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    });

    const result = await new CreateStyleTool({ httpRequest }).run({
      name: 'Test Style',
      style: { version: 8, sources: {}, layers: [] }
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: 'Failed to create style: 400 Bad Request'
    });
    assertHeadersSent(mockHttpRequest);
  });
});
