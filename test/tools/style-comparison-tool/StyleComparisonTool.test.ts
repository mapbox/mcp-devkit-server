// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StyleComparisonTool } from '../../../src/tools/style-comparison-tool/StyleComparisonTool.js';
import * as jwtUtils from '../../../src/utils/jwtUtils.js';
import {
  cacheKeyFor,
  previewTokenStorage
} from '../../../src/utils/tokenElicitation.js';
import { setupHttpRequest } from '../../utils/httpPipelineUtils.js';

function styleComparisonTool() {
  const { httpRequest } = setupHttpRequest();
  return new StyleComparisonTool({ httpRequest });
}

describe('StyleComparisonTool', () => {
  let tool: StyleComparisonTool;

  beforeEach(() => {
    tool = styleComparisonTool();
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

    it('should work with provided access token (backward compatibility)', async () => {
      const input = {
        before: 'mapbox/streets-v12',
        after: 'mapbox/satellite-v9',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('access_token=pk.test.token');
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

  describe('elicitation behavior', () => {
    beforeEach(() => {
      previewTokenStorage.clearAll();
    });

    it('returns error when no accessToken and no valid server token', async () => {
      const tool = styleComparisonTool();

      // Remove env var temporarily to test error path
      const oldToken = process.env.MAPBOX_ACCESS_TOKEN;
      delete process.env.MAPBOX_ACCESS_TOKEN;

      const result = await tool.run({
        before: 'mapbox/streets-v12',
        after: 'mapbox/satellite-v9'
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
      const tool = styleComparisonTool();
      // Even without server initialization, providing accessToken directly should work

      const result = await tool.run({
        before: 'mapbox/streets-v12',
        after: 'mapbox/satellite-v9',
        accessToken: 'pk.test.token'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('access_token=pk.test.token')
      });
    });

    it('omits create/auto options and skips token creation calls when the server token is temporary (tk.*)', async () => {
      const { httpRequest, mockHttpRequest } = setupHttpRequest();
      const tool = new StyleComparisonTool({ httpRequest });

      // The per-call sendRequest a real MCP session would pass via `extra` —
      // not a stashed `this.server`, which a singleton tool instance can't
      // safely rely on across sessions (see tokenElicitation.ts).
      const sendRequest = vi.fn().mockResolvedValue({
        action: 'accept',
        content: { choice: 'provide', token: 'pk.test.token' }
      });

      const tkToken =
        'tk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

      const result = await tool.run(
        { before: 'mapbox/streets-v12', after: 'mapbox/satellite-v9' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { authInfo: { token: tkToken }, sendRequest } as any
      );

      expect(result.isError).toBe(false);
      expect(sendRequest).toHaveBeenCalledTimes(1);
      const requestedSchema =
        sendRequest.mock.calls[0][0].params.requestedSchema;
      expect(requestedSchema.properties.choice.enum).toEqual(['provide']);

      // A tk.* server token can never create tokens (tokens:write), but listing only
      // needs tokens:read — a separate scope — so it's still attempted (and fails
      // safe to an empty list if the token can't do that either). Only creation
      // (a POST) must never be attempted.
      expect(mockHttpRequest).toHaveBeenCalledTimes(1);
      expect(mockHttpRequest.mock.calls[0][1]?.method).not.toBe('POST');
    });

    it('reuses a cached token instead of erroring when useCustomToken is set but the client cannot act on it', async () => {
      const serverToken =
        'sk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';
      previewTokenStorage.set(cacheKeyFor(serverToken), 'pk.test.token');

      // No `this.server` is attached in these tests (installTo() was never
      // called), so this exercises exactly the "client can't support the
      // selection dialog" case a reviewer asked about on PR #57.
      const result = await styleComparisonTool().run(
        {
          before: 'mapbox/streets-v12',
          after: 'mapbox/satellite-v9',
          useCustomToken: true
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { authInfo: { token: serverToken } } as any
      );

      expect(result.isError).toBe(false);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('access_token=pk.test.token')
      });
    });
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('style_comparison_tool');
      expect(tool.description).toBe(
        'Generate a comparison URL for comparing two Mapbox styles side-by-side'
      );
    });
  });
});
