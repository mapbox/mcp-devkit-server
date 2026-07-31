// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

process.env.MAPBOX_ACCESS_TOKEN =
  'sk.eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

import { describe, it, expect, vi } from 'vitest';
import { PreviewStyleTool } from '../../../src/tools/preview-style-tool/PreviewStyleTool.js';
import { setupHttpRequest } from '../../utils/httpPipelineUtils.js';

describe('PreviewStyleTool', () => {
  const TEST_ACCESS_TOKEN =
    'pk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

  function previewStyleTool() {
    const { httpRequest } = setupHttpRequest();
    return new PreviewStyleTool({ httpRequest });
  }

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const tool = previewStyleTool();
      expect(tool.name).toBe('preview_style_tool');
      expect(tool.description).toBe(
        'Generate preview URL for a Mapbox style using an existing public token'
      );
    });

    it('should have correct input schema', async () => {
      const { PreviewStyleSchema } =
        await import('../../../src/tools/preview-style-tool/PreviewStyleTool.input.schema.js');
      expect(PreviewStyleSchema).toBeDefined();
    });
  });

  it('uses user-provided public token and returns preview URL', async () => {
    const result = await previewStyleTool().run({
      styleId: 'cmojrmkc9002t01ry96yi6h48',
      accessToken: TEST_ACCESS_TOKEN,
      title: false,
      zoomwheel: false
    });

    expect(result.isError).toBe(false);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        '/styles/v1/test-user/cmojrmkc9002t01ry96yi6h48.html?access_token=pk.'
      )
    });
  });

  it('includes styleId in URL', async () => {
    const result = await previewStyleTool().run({
      styleId: 'cmojrmkc9002t01ry96yi6h49',
      accessToken: TEST_ACCESS_TOKEN,
      title: false,
      zoomwheel: false
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        '/styles/v1/test-user/cmojrmkc9002t01ry96yi6h49.html'
      )
    });
  });

  it('includes title parameter when provided', async () => {
    const result = await previewStyleTool().run({
      styleId: 'cmojrmkc9002t01ry96yi6h48',
      accessToken: TEST_ACCESS_TOKEN,
      title: true,
      zoomwheel: false
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/title=true/)
    });
  });

  it('includes zoomwheel parameter when provided', async () => {
    const result = await previewStyleTool().run({
      styleId: 'cmojrmkc9002t01ry96yi6h48',
      accessToken: TEST_ACCESS_TOKEN,
      zoomwheel: false,
      title: false
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/zoomwheel=false/)
    });
  });

  it('includes fresh parameter for secure access', async () => {
    const result = await previewStyleTool().run({
      styleId: 'cmojrmkc9002t01ry96yi6h48',
      accessToken: TEST_ACCESS_TOKEN,
      title: false,
      zoomwheel: false
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/fresh=true/)
    });
  });

  it('rejects secret tokens', async () => {
    const result = await previewStyleTool().run({
      styleId: 'cmojrmkc9002t01ry96yi6h48',
      accessToken:
        'sk.eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIn0.secret_token',
      title: false,
      zoomwheel: false
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
    const result = await previewStyleTool().run({
      styleId: 'cmojrmkc9002t01ry96yi6h48',
      accessToken: 'tk.eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIn0.temp_token',
      title: false,
      zoomwheel: false
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        'Invalid access token. Only public tokens (starting with pk.*) are allowed'
      )
    });
  });

  it('returns URL and MCP-UI resource on success (default)', async () => {
    const result = await previewStyleTool().run({
      styleId: 'cmojrmkc9002t01ry96yi6h48',
      accessToken: TEST_ACCESS_TOKEN,
      title: false,
      zoomwheel: false
    });

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(2);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        'https://api.mapbox.com/styles/v1/test-user/cmojrmkc9002t01ry96yi6h48.html?access_token=pk.'
      )
    });

    // Verify fresh parameter is included
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('fresh=true')
    });

    // Verify MCP-UI resource is included by default
    expect(result.content[1]).toMatchObject({
      type: 'resource',
      resource: {
        uri: expect.stringMatching(/^ui:\/\/mapbox\/preview-style\//),
        mimeType: 'text/html;profile=mcp-app',
        text: expect.stringContaining(
          'https://api.mapbox.com/styles/v1/test-user/cmojrmkc9002t01ry96yi6h48.html?access_token=pk.'
        )
      }
    });
  });

  it('returns URL and MCP-UI resource for backward compatibility', async () => {
    const result = await previewStyleTool().run({
      styleId: 'cmojrmkc9002t01ry96yi6h48',
      accessToken: TEST_ACCESS_TOKEN,
      title: false,
      zoomwheel: false
    });

    expect(result.isError).toBe(false);
    // Now returns both URL (for text) and MCP-UI resource (for backward compat)
    expect(result.content).toHaveLength(2);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        'https://api.mapbox.com/styles/v1/test-user/cmojrmkc9002t01ry96yi6h48.html?access_token=pk.'
      )
    });
    // Second item is MCP-UI resource
    expect(result.content[1]).toMatchObject({
      type: 'resource'
    });
  });

  describe('elicitation behavior', () => {
    it('returns error when no accessToken and no valid server token', async () => {
      const tool = previewStyleTool();

      // Remove env var temporarily to test error path
      const oldToken = process.env.MAPBOX_ACCESS_TOKEN;
      delete process.env.MAPBOX_ACCESS_TOKEN;

      const result = await tool.run({
        styleId: 'test-style'
        // No accessToken, no authInfo.token either
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining(
          'Server access token is required when no preview token is provided'
        )
      });

      // Restore env var
      process.env.MAPBOX_ACCESS_TOKEN = oldToken;
    });

    it('works with backward compatibility when accessToken is provided', async () => {
      const tool = previewStyleTool();
      // Even without server initialization, providing accessToken directly should work

      const result = await tool.run({
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

    it('omits create/auto options and skips token creation calls when the server token is temporary (tk.*)', async () => {
      const { httpRequest, mockHttpRequest } = setupHttpRequest();
      const tool = new PreviewStyleTool({ httpRequest });

      const elicitInput = vi.fn().mockResolvedValue({
        action: 'accept',
        content: { choice: 'provide', token: TEST_ACCESS_TOKEN }
      });
      // Simulate what BaseTool#installTo does, without a full MCP server.
      tool['server'] = {
        server: {
          getClientCapabilities: () => ({ elicitation: {} }),
          elicitInput
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const tkToken =
        'tk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

      const result = await tool.run(
        { styleId: 'test-style' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { authInfo: { token: tkToken } } as any
      );

      expect(result.isError).toBe(false);
      expect(elicitInput).toHaveBeenCalledTimes(1);
      const requestedSchema = elicitInput.mock.calls[0][0].requestedSchema;
      expect(requestedSchema.properties.choice.enum).toEqual(['provide']);

      // A tk.* server token can never create tokens, so listing/creating
      // tokens against the Mapbox API should never even be attempted.
      expect(mockHttpRequest).not.toHaveBeenCalled();
    });
  });
});
