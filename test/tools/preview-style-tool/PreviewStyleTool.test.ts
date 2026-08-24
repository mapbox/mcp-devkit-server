// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

process.env.MAPBOX_ACCESS_TOKEN =
  'sk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

import { describe, it, expect, vi } from 'vitest';
import { PreviewStyleTool } from '../../../src/tools/preview-style-tool/PreviewStyleTool.js';

// None of the existing tests below hit the network (they all supply their
// own accessToken), but the tool now takes httpRequest as a constructor
// dependency regardless, matching every other network-calling tool in this
// repo — see toolRegistry.ts.
function newTool(httpRequest = vi.fn()) {
  return new PreviewStyleTool({ httpRequest });
}

describe('PreviewStyleTool', () => {
  const TEST_ACCESS_TOKEN =
    'pk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const tool = newTool();
      expect(tool.name).toBe('preview_style_tool');
      expect(tool.description).toContain(
        'auto-generates a short-lived preview token'
      );
    });

    it('should have correct input schema', async () => {
      const { PreviewStyleSchema } =
        await import('../../../src/tools/preview-style-tool/PreviewStyleTool.input.schema.js');
      expect(PreviewStyleSchema).toBeDefined();
    });
  });

  it('uses user-provided public token and returns preview URL', async () => {
    const result = await newTool().run({
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
    const result = await newTool().run({
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
    const result = await newTool().run({
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
    const result = await newTool().run({
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
    const result = await newTool().run({
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
    const result = await newTool().run({
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
    const result = await newTool().run({
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
    const result = await newTool().run({
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
    const result = await newTool().run({
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

  describe('auto-minted inline preview (no accessToken, no share)', () => {
    function stubMintingFetch() {
      return vi.fn(
        async (_input: string | URL | Request, _init?: RequestInit) =>
          new Response(
            JSON.stringify({
              token: 'pk.eyJ1IjoidGVzdC11c2VyIn0.minted'
            }),
            { status: 200 }
          )
      );
    }

    it('auto-generates a short-lived token from the server access token and needs no accessToken input', async () => {
      const httpRequest = stubMintingFetch();
      const result = await new PreviewStyleTool({ httpRequest }).run({
        styleId: 'cmojrmkc9002t01ry96yi6h48',
        title: false,
        zoomwheel: false
      });

      expect(result.isError).toBe(false);
      expect(httpRequest).toHaveBeenCalledTimes(1);
      const [url, init] = httpRequest.mock.calls[0];
      expect(String(url)).toContain('tokens/v2/test-user');
      expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
        scopes: ['styles:tiles', 'styles:read', 'fonts:read']
      });
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining(
          '/styles/v1/test-user/cmojrmkc9002t01ry96yi6h48.html?access_token=pk.'
        )
      });
    });

    it('errors clearly when share is true but accessToken is missing', async () => {
      const httpRequest = stubMintingFetch();
      const result = await new PreviewStyleTool({ httpRequest }).run({
        styleId: 'cmojrmkc9002t01ry96yi6h48',
        share: true,
        title: false,
        zoomwheel: false
      });

      expect(result.isError).toBe(true);
      expect(httpRequest).not.toHaveBeenCalled();
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('share: true` requires')
      });
    });

    it('an explicit accessToken is honored even when share is true', async () => {
      const httpRequest = stubMintingFetch();
      const result = await new PreviewStyleTool({ httpRequest }).run({
        styleId: 'cmojrmkc9002t01ry96yi6h48',
        share: true,
        accessToken: TEST_ACCESS_TOKEN,
        title: false,
        zoomwheel: false
      });

      expect(result.isError).toBe(false);
      expect(httpRequest).not.toHaveBeenCalled();
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining(`access_token=${TEST_ACCESS_TOKEN}`)
      });
    });

    it('errors when no server access token is available to mint from', async () => {
      const saved = process.env.MAPBOX_ACCESS_TOKEN;
      delete process.env.MAPBOX_ACCESS_TOKEN;
      try {
        const httpRequest = stubMintingFetch();
        const result = await new PreviewStyleTool({ httpRequest }).run({
          styleId: 'cmojrmkc9002t01ry96yi6h48',
          title: false,
          zoomwheel: false
        });

        expect(result.isError).toBe(true);
        expect(httpRequest).not.toHaveBeenCalled();
      } finally {
        if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
      }
    });

    it('surfaces an actionable error, not the raw Token API status, when minting fails (e.g. missing tokens:write)', async () => {
      const httpRequest = vi.fn(
        async () => new Response('forbidden', { status: 403 })
      );
      const result = await new PreviewStyleTool({ httpRequest }).run({
        styleId: 'cmojrmkc9002t01ry96yi6h48',
        title: false,
        zoomwheel: false
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('tokens:write')
      });
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('list_tokens_tool');
    });

    it('surfaces a hosted-endpoint-aware error, not a raw jwtUtils message, when the server token is not a Mapbox token at all', async () => {
      const saved = process.env.MAPBOX_ACCESS_TOKEN;
      process.env.MAPBOX_ACCESS_TOKEN = 'not-a-mapbox-token';
      try {
        const httpRequest = stubMintingFetch();
        const result = await new PreviewStyleTool({ httpRequest }).run({
          styleId: 'cmojrmkc9002t01ry96yi6h48',
          title: false,
          zoomwheel: false
        });

        expect(result.isError).toBe(true);
        expect(httpRequest).not.toHaveBeenCalled();
        const text = (result.content[0] as { type: 'text'; text: string }).text;
        expect(text).toContain('list_tokens_tool');
        expect(text).not.toContain('MAPBOX_ACCESS_TOKEN');
      } finally {
        if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
        else delete process.env.MAPBOX_ACCESS_TOKEN;
      }
    });
  });
});
