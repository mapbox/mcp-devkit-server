// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StyleComparisonTool } from '../../../src/tools/style-comparison-tool/StyleComparisonTool.js';
import * as jwtUtils from '../../../src/utils/jwtUtils.js';

describe('StyleComparisonTool', () => {
  let tool: StyleComparisonTool;

  beforeEach(() => {
    // Unused by tests below that supply their own accessToken; the tool
    // takes httpRequest as a constructor dependency regardless, matching
    // every other network-calling tool in this repo — see toolRegistry.ts.
    tool = new StyleComparisonTool({ httpRequest: vi.fn() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('run', () => {
    it('should generate comparison URL and MCP-UI resource with provided access token (default)', async () => {
      const input = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('https://agent.mapbox.com/tools/style-compare');
      expect(url).toContain('access_token=pk.test.token');
      expect(url).toContain('before=mapbox%2Fstreets-v12');
      expect(url).toContain('after=mapbox%2Foutdoors-v12');

      // Verify MCP-UI resource is included by default
      expect(result.content[1]).toMatchObject({
        type: 'resource',
        resource: {
          uri: expect.stringMatching(
            /^ui:\/\/mapbox\/style-comparison\/mapbox\/streets-v12\/mapbox\/outdoors-v12$/
          ),
          mimeType: 'text/html;profile=mcp-app',
          text: expect.stringContaining(
            'https://agent.mapbox.com/tools/style-compare'
          )
        }
      });
    });

    it('requires an access token when share is true', async () => {
      const input = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/satellite-v9',
        share: true
        // Missing accessToken
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('share: true` requires');
    });

    it('should handle full style URLs', async () => {
      const input = {
        before: 'mapbox://styles/mapbox/streets-v12',
        after: 'mapbox://styles/mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('before=mapbox%2Fstreets-v12');
      expect(url).toContain('after=mapbox%2Foutdoors-v12');
    });

    it('should handle just style IDs with valid public token', async () => {
      vi.spyOn(jwtUtils, 'getUserNameFromToken').mockReturnValue('testuser');

      const input = {
        before: 'style-id-1',
        after: 'style-id-2',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('before=testuser%2Fstyle-id-1');
      expect(url).toContain('after=testuser%2Fstyle-id-2');
    });

    it('should reject secret tokens', async () => {
      const input = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'sk.secret.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Invalid token type');
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Secret tokens (sk.*) cannot be exposed');
    });

    it('should reject invalid token formats', async () => {
      const input = {
        before: 'streets-v12',
        after: 'outdoors-v12',
        accessToken: 'invalid.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Invalid token type');
    });

    it('should reject style IDs with invalid characters', async () => {
      const input = {
        before: 'mapbox/streets-v12',
        after: 'bad</code><img onerror=alert(1)>',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Invalid style format');
    });

    it('should reject style URLs with invalid characters after stripping scheme', async () => {
      const input = {
        before: 'mapbox://styles/mapbox/streets-v12',
        after: 'mapbox://styles/bad<user>/evil"style',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Invalid style format');
    });

    it('should return error for style ID without valid username in token', async () => {
      // Mock getUserNameFromToken to throw an error
      vi.spyOn(jwtUtils, 'getUserNameFromToken').mockImplementation(() => {
        throw new Error(
          'MAPBOX_ACCESS_TOKEN does not contain username in payload'
        );
      });

      const input = {
        before: 'style-id-only',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Could not determine username for style ID');
    });

    it('should properly encode URL parameters', async () => {
      const input = {
        before: 'user-name/style-id-1',
        after: 'user-name/style-id-2',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      // Check that forward slashes are URL encoded
      expect(url).toContain('before=user-name%2Fstyle-id-1');
      expect(url).toContain('after=user-name%2Fstyle-id-2');
    });

    it('should include hash fragment with map position when coordinates are provided', async () => {
      const input = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token',
        zoom: 5.72,
        latitude: 9.503,
        longitude: -67.473
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('#5.72/9.503/-67.473');
    });

    it('should not include hash fragment when coordinates are incomplete', async () => {
      // Only zoom provided
      const input1 = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token',
        zoom: 10
      };

      const result1 = await tool.run(input1);
      expect(result1.isError).toBe(false);
      const url1 = (result1.content[0] as { type: 'text'; text: string }).text;
      expect(url1).not.toContain('#');

      // Only latitude and longitude, no zoom
      const input2 = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token',
        latitude: 40.7128,
        longitude: -74.006
      };

      const result2 = await tool.run(input2);
      expect(result2.isError).toBe(false);
      const url2 = (result2.content[0] as { type: 'text'; text: string }).text;
      expect(url2).not.toContain('#');
    });

    it('should return URL and MCP-UI resource for backward compatibility', async () => {
      const input = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      // Now returns both URL (for text) and MCP-UI resource (for backward compat)
      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe('text');
      // Second item is MCP-UI resource
      expect(result.content[1].type).toBe('resource');
    });
  });

  describe('auto-minted inline comparison (no accessToken, no share)', () => {
    const SERVER_TOKEN = 'sk.eyJ1IjoidGVzdC11c2VyIn0.signature';

    function stubMintingFetch() {
      return vi.fn(
        async (_input: string | URL | Request, _init?: RequestInit) =>
          new Response(
            JSON.stringify({ token: 'pk.eyJ1IjoidGVzdC11c2VyIn0.minted' }),
            { status: 200 }
          )
      );
    }

    it('auto-generates a token from the server access token and needs no accessToken input', async () => {
      const saved = process.env.MAPBOX_ACCESS_TOKEN;
      process.env.MAPBOX_ACCESS_TOKEN = SERVER_TOKEN;
      try {
        const httpRequest = stubMintingFetch();
        const result = await new StyleComparisonTool({ httpRequest }).run({
          before: 'mapbox/streets-v12',
          after: 'mapbox/outdoors-v12'
        });

        expect(result.isError).toBe(false);
        expect(httpRequest).toHaveBeenCalledTimes(1);
        const [url] = httpRequest.mock.calls[0];
        expect(String(url)).toContain('tokens/v2/test-user');
        const resultUrl = (result.content[0] as { type: 'text'; text: string })
          .text;
        expect(resultUrl).toContain(
          'access_token=pk.eyJ1IjoidGVzdC11c2VyIn0.minted'
        );
      } finally {
        if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
        else delete process.env.MAPBOX_ACCESS_TOKEN;
      }
    });

    it('mints a non-expiring token, not the short-lived tk.* the other preview tools use — agent.mapbox.com/tools/style-compare rejects tk.* outright (confirmed live)', async () => {
      const saved = process.env.MAPBOX_ACCESS_TOKEN;
      process.env.MAPBOX_ACCESS_TOKEN = SERVER_TOKEN;
      try {
        const httpRequest = stubMintingFetch();
        await new StyleComparisonTool({ httpRequest }).run({
          before: 'mapbox/streets-v12',
          after: 'mapbox/outdoors-v12'
        });

        const [, init] = httpRequest.mock.calls[0];
        const body = JSON.parse((init as RequestInit).body as string);
        expect(body).not.toHaveProperty('expires');
      } finally {
        if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
        else delete process.env.MAPBOX_ACCESS_TOKEN;
      }
    });

    it('an explicit accessToken is honored even when share is true', async () => {
      const httpRequest = stubMintingFetch();
      const result = await new StyleComparisonTool({ httpRequest }).run({
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        share: true,
        accessToken: 'pk.test.token'
      });

      expect(result.isError).toBe(false);
      expect(httpRequest).not.toHaveBeenCalled();
      const resultUrl = (result.content[0] as { type: 'text'; text: string })
        .text;
      expect(resultUrl).toContain('access_token=pk.test.token');
    });

    it('errors when no server access token is available to mint from', async () => {
      const saved = process.env.MAPBOX_ACCESS_TOKEN;
      delete process.env.MAPBOX_ACCESS_TOKEN;
      try {
        const httpRequest = stubMintingFetch();
        const result = await new StyleComparisonTool({ httpRequest }).run({
          before: 'mapbox/streets-v12',
          after: 'mapbox/outdoors-v12'
        });

        expect(result.isError).toBe(true);
        expect(httpRequest).not.toHaveBeenCalled();
      } finally {
        if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
      }
    });

    it('surfaces a hosted-endpoint-aware error, not a raw jwtUtils message, when the server token is not a Mapbox token at all', async () => {
      const saved = process.env.MAPBOX_ACCESS_TOKEN;
      process.env.MAPBOX_ACCESS_TOKEN = 'not-a-mapbox-token';
      try {
        const httpRequest = stubMintingFetch();
        const result = await new StyleComparisonTool({ httpRequest }).run({
          before: 'mapbox/streets-v12',
          after: 'mapbox/outdoors-v12'
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

    it('surfaces an actionable error, not the raw Token API status, when minting fails (e.g. missing tokens:write)', async () => {
      const saved = process.env.MAPBOX_ACCESS_TOKEN;
      process.env.MAPBOX_ACCESS_TOKEN = SERVER_TOKEN;
      try {
        const httpRequest = vi.fn(
          async () => new Response('forbidden', { status: 403 })
        );
        const result = await new StyleComparisonTool({ httpRequest }).run({
          before: 'mapbox/streets-v12',
          after: 'mapbox/outdoors-v12'
        });

        expect(result.isError).toBe(true);
        const text = (result.content[0] as { type: 'text'; text: string }).text;
        expect(text).toContain('tokens:write');
        expect(text).toContain('list_tokens_tool');
      } finally {
        if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
        else delete process.env.MAPBOX_ACCESS_TOKEN;
      }
    });
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('style_comparison_tool');
      expect(tool.description).toContain(
        'auto-generates a scoped preview token'
      );
    });
  });
});
