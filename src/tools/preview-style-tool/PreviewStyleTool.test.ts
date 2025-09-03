// Use a token with valid JWT format for tests
process.env.MAPBOX_ACCESS_TOKEN =
  'sk.eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

import { PreviewStyleTool } from './PreviewStyleTool.js';

describe('PreviewStyleTool', () => {
  const TEST_ACCESS_TOKEN =
    'pk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const tool = new PreviewStyleTool();
      expect(tool.name).toBe('preview_style_tool');
      expect(tool.description).toBe(
        'Generate preview URL for a Mapbox style using an existing public token'
      );
    });

    it('should have correct input schema', () => {
      const { PreviewStyleSchema } = require('./PreviewStyleTool.schema.ts');
      expect(PreviewStyleSchema).toBeDefined();
    });
  });

  it('uses user-provided public token and returns preview URL', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style',
      accessToken: TEST_ACCESS_TOKEN
    });

    expect(result.isError).toBe(false);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        '/styles/v1/test-user/test-style.html?access_token=pk.'
      )
    });
  });

  it('includes styleId in URL', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'my-custom-style',
      accessToken: TEST_ACCESS_TOKEN
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('/styles/v1/test-user/my-custom-style.html')
    });
  });

  it('includes title parameter when provided', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style',
      accessToken: TEST_ACCESS_TOKEN,
      title: true
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/title=true/)
    });
  });

  it('includes zoomwheel parameter when provided', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style',
      accessToken: TEST_ACCESS_TOKEN,
      zoomwheel: false
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/zoomwheel=false/)
    });
  });

  it('includes fresh parameter for secure access', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style',
      accessToken: TEST_ACCESS_TOKEN
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/fresh=true/)
    });
  });

  it('rejects secret tokens', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style',
      accessToken:
        'sk.eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIn0.secret_token'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        'Invalid access token. Only public tokens (starting with pk.*) are allowed'
      )
    });
  });

  it('rejects temporary tokens', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style',
      accessToken: 'tk.eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIn0.temp_token'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        'Invalid access token. Only public tokens (starting with pk.*) are allowed'
      )
    });
  });

  it('returns URL on success', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style',
      accessToken: TEST_ACCESS_TOKEN
    });

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        'https://api.mapbox.com/styles/v1/test-user/test-style.html?access_token=pk.'
      )
    });

    // Verify fresh parameter is included
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('fresh=true')
    });
  });
});
