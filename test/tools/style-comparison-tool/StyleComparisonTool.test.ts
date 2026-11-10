// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StyleComparisonTool } from '../../../src/tools/style-comparison-tool/StyleComparisonTool.js';
import * as jwtUtils from '../../../src/utils/jwtUtils.js';
import type { StyleComparisonOutput } from '../../../src/tools/style-comparison-tool/StyleComparisonTool.output.schema.js';

function payloadOf(result: { structuredContent?: unknown }) {
  return result.structuredContent as StyleComparisonOutput;
}

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
    it('returns the resolved styles and token as structured content for the comparison view', async () => {
      const input = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      expect(payloadOf(result)).toEqual({
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: 'text',
        text: 'Comparing mapbox/streets-v12 (before, left) with mapbox/outdoors-v12 (after, right).'
      });
    });

    it('does not link to or embed a hosted comparison page', async () => {
      const result = await tool.run({
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      });

      expect(JSON.stringify(result)).not.toContain('agent.mapbox.com');
      expect(result.content.some((c) => c.type === 'resource')).toBe(false);
    });

    it('no longer accepts a share option', () => {
      expect(Object.keys(tool.inputSchema.shape)).not.toContain('share');
    });

    it('should handle full style URLs', async () => {
      const input = {
        before: 'mapbox://styles/mapbox/streets-v12',
        after: 'mapbox://styles/mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      expect(payloadOf(result).before).toBe('mapbox/streets-v12');
      expect(payloadOf(result).after).toBe('mapbox/outdoors-v12');
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
      expect(payloadOf(result).before).toBe('testuser/style-id-1');
      expect(payloadOf(result).after).toBe('testuser/style-id-2');
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

    it('includes the initial map position when coordinates are provided', async () => {
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
      expect(payloadOf(result).center).toEqual([-67.473, 9.503]);
      expect(payloadOf(result).zoom).toBe(5.72);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('at zoom 5.72, 9.503, -67.473');
    });

    it('omits the initial map position when coordinates are incomplete', async () => {
      // Only zoom provided
      const input1 = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token',
        zoom: 10
      };

      const result1 = await tool.run(input1);
      expect(result1.isError).toBe(false);
      expect(payloadOf(result1).center).toBeUndefined();
      expect(payloadOf(result1).zoom).toBeUndefined();

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
      expect(payloadOf(result2).center).toBeUndefined();
      expect(payloadOf(result2).zoom).toBeUndefined();
    });
  });

  describe('auto-minted inline comparison (no accessToken)', () => {
    const SERVER_TOKEN = 'sk.eyJ1IjoidGVzdC11c2VyIn0.signature';

    function stubMintingFetch() {
      return vi.fn(
        async (_input: string | URL | Request, _init?: RequestInit) =>
          new Response(
            JSON.stringify({ token: 'tk.eyJ1IjoidGVzdC11c2VyIn0.minted' }),
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
        expect(payloadOf(result).accessToken).toBe(
          'tk.eyJ1IjoidGVzdC11c2VyIn0.minted'
        );
      } finally {
        if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
        else delete process.env.MAPBOX_ACCESS_TOKEN;
      }
    });

    it('mints a short-lived token that expires in about an hour, so nothing persists on the account', async () => {
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
        const expiresInMs = Date.parse(body.expires) - Date.now();
        expect(expiresInMs).toBeGreaterThan(55 * 60 * 1000);
        expect(expiresInMs).toBeLessThanOrEqual(60 * 60 * 1000);
        expect(body.scopes).toEqual([
          'styles:tiles',
          'styles:read',
          'fonts:read'
        ]);
      } finally {
        if (saved !== undefined) process.env.MAPBOX_ACCESS_TOKEN = saved;
        else delete process.env.MAPBOX_ACCESS_TOKEN;
      }
    });

    it('uses an explicit accessToken without minting', async () => {
      const httpRequest = stubMintingFetch();
      const result = await new StyleComparisonTool({ httpRequest }).run({
        before: 'mapbox/streets-v12',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      });

      expect(result.isError).toBe(false);
      expect(httpRequest).not.toHaveBeenCalled();
      expect(payloadOf(result).accessToken).toBe('pk.test.token');
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
        'auto-generates a short-lived scoped preview token'
      );
      expect(tool.description).not.toContain('share');
    });
  });
});
