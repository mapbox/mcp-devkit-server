// Use a token with valid JWT format for tests
process.env.MAPBOX_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

import {
  setupFetch,
  assertHeadersSent
} from '../../utils/requestUtils.test-helpers.js';
import { CreateStyleTool } from './CreateStyleTool.js';

describe('CreateStyleTool', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const tool = new CreateStyleTool();
      expect(tool.name).toBe('create_style_tool');
      expect(tool.description).toBe('Create a new Mapbox style');
    });

    it('should have correct input schema', () => {
      const { CreateStyleSchema } = require('./CreateStyleTool.schema.ts');
      expect(CreateStyleSchema).toBeDefined();
    });
  });

  it('sends custom header', async () => {
    const mockFetch = setupFetch({
      ok: true,
      json: async () => ({ id: 'new-style-id', name: 'Test Style' })
    });

    await new CreateStyleTool().run({
      name: 'Test Style',
      style: { version: 8, sources: {}, layers: [] }
    });
    assertHeadersSent(mockFetch);
  });

  it('handles fetch errors gracefully', async () => {
    const mockFetch = setupFetch({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    });

    const result = await new CreateStyleTool().run({
      name: 'Test Style',
      style: { version: 8, sources: {}, layers: [] }
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: 'Failed to create style: 400 Bad Request'
    });
    assertHeadersSent(mockFetch);
  });
});
