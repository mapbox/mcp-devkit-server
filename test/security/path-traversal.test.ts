// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeAll } from 'vitest';
import { RetrieveStyleSchema } from '../../src/tools/retrieve-style-tool/RetrieveStyleTool.input.schema.js';
import { DeleteStyleSchema } from '../../src/tools/delete-style-tool/DeleteStyleTool.input.schema.js';
import { UpdateStyleInputSchema } from '../../src/tools/update-style-tool/UpdateStyleTool.input.schema.js';
import { PreviewStyleSchema } from '../../src/tools/preview-style-tool/PreviewStyleTool.input.schema.js';
import { TilequerySchema } from '../../src/tools/tilequery-tool/TilequeryTool.input.schema.js';
import { RetrieveStyleTool } from '../../src/tools/retrieve-style-tool/RetrieveStyleTool.js';
import { UpdateStyleTool } from '../../src/tools/update-style-tool/UpdateStyleTool.js';
import { TilequeryTool } from '../../src/tools/tilequery-tool/TilequeryTool.js';
import { DeleteStyleTool } from '../../src/tools/delete-style-tool/DeleteStyleTool.js';
import { PreviewStyleTool } from '../../src/tools/preview-style-tool/PreviewStyleTool.js';
import { setupHttpRequest } from '../utils/httpPipelineUtils.js';

// 25-char alphanumeric — a real Mapbox style ID format
const VALID_STYLE_ID = 'cmojrmkc9002t01ry96yi6h48';
const VALID_TILESET_ID = 'mapbox.mapbox-streets-v8';
const MOCK_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';
const PUBLIC_MOCK_TOKEN =
  'pk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

function makeToken(username: string): string {
  const header = 'eyJhbGciOiJIUzI1NiJ9';
  const payload = Buffer.from(
    JSON.stringify({ u: username, a: 'test-api' })
  ).toString('base64');
  return `${header}.${payload}.sig`;
}

function makePublicToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: username, a: 'test-api' })
  ).toString('base64');
  return `pk.${payload}.sig`;
}

const MOCK_STYLE_RESPONSE = {
  id: VALID_STYLE_ID,
  name: 'Test Style',
  owner: 'test-user',
  version: 8,
  created: '2020-01-01T00:00:00.000Z',
  modified: '2020-01-01T00:00:00.000Z',
  visibility: 'private',
  sources: {},
  layers: []
};

beforeAll(() => {
  process.env.MAPBOX_ACCESS_TOKEN = MOCK_TOKEN;
});

describe('path traversal security', () => {
  const STYLE_TRAVERSAL_PAYLOADS = [
    '../../../tokens/v2/testuser',
    '../testuser',
    `../testuser/${VALID_STYLE_ID}`,
    'prefix/../../../escape',
    '..%2F..%2Ftokens',
    '%2E%2E%2F%2E%2E',
    'valid\x00inject'
  ];

  const TILESET_TRAVERSAL_PAYLOADS = [
    '../../tokens/v2/testuser',
    '../mapbox/tileset',
    'mapbox/../attacker',
    '/absolute/path',
    'nodothere'
  ];

  describe('styleId schema validation rejects traversal payloads', () => {
    it.each(STYLE_TRAVERSAL_PAYLOADS)(
      'RetrieveStyleSchema rejects "%s"',
      (styleId) => {
        expect(RetrieveStyleSchema.safeParse({ styleId }).success).toBe(false);
      }
    );

    it.each(STYLE_TRAVERSAL_PAYLOADS)(
      'DeleteStyleSchema rejects "%s"',
      (styleId) => {
        expect(DeleteStyleSchema.safeParse({ styleId }).success).toBe(false);
      }
    );

    it.each(STYLE_TRAVERSAL_PAYLOADS)(
      'UpdateStyleInputSchema rejects "%s"',
      (styleId) => {
        expect(UpdateStyleInputSchema.safeParse({ styleId }).success).toBe(
          false
        );
      }
    );

    it.each(STYLE_TRAVERSAL_PAYLOADS)(
      'PreviewStyleSchema rejects "%s"',
      (styleId) => {
        expect(
          PreviewStyleSchema.safeParse({
            styleId,
            accessToken: PUBLIC_MOCK_TOKEN
          }).success
        ).toBe(false);
      }
    );
  });

  describe('tilesetId schema validation rejects traversal payloads', () => {
    it.each(TILESET_TRAVERSAL_PAYLOADS)(
      'TilequerySchema rejects "%s"',
      (tilesetId) => {
        expect(
          TilequerySchema.safeParse({ tilesetId, longitude: 0, latitude: 0 })
            .success
        ).toBe(false);
      }
    );
  });

  describe('schema validation accepts valid IDs', () => {
    it('RetrieveStyleSchema accepts valid alphanumeric styleId', () => {
      expect(
        RetrieveStyleSchema.safeParse({ styleId: VALID_STYLE_ID }).success
      ).toBe(true);
    });

    it('DeleteStyleSchema accepts valid alphanumeric styleId', () => {
      expect(
        DeleteStyleSchema.safeParse({ styleId: VALID_STYLE_ID }).success
      ).toBe(true);
    });

    it('UpdateStyleInputSchema accepts valid alphanumeric styleId', () => {
      expect(
        UpdateStyleInputSchema.safeParse({ styleId: VALID_STYLE_ID }).success
      ).toBe(true);
    });

    it('PreviewStyleSchema accepts valid alphanumeric styleId', () => {
      expect(
        PreviewStyleSchema.safeParse({
          styleId: VALID_STYLE_ID,
          accessToken: PUBLIC_MOCK_TOKEN
        }).success
      ).toBe(true);
    });

    it.each([
      'standard',
      'standard-satellite',
      'streets-v12',
      'navigation-day-v1',
      'dark-v11'
    ])('RetrieveStyleSchema accepts built-in style name "%s"', (styleId) => {
      expect(RetrieveStyleSchema.safeParse({ styleId }).success).toBe(true);
    });

    it('TilequerySchema accepts valid owner.tileset-name format', () => {
      expect(
        TilequerySchema.safeParse({
          tilesetId: VALID_TILESET_ID,
          longitude: 0,
          latitude: 0
        }).success
      ).toBe(true);
    });

    it('TilequerySchema uses safe default when tilesetId is omitted', () => {
      const result = TilequerySchema.safeParse({ longitude: 0, latitude: 0 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tilesetId).toBe('mapbox.mapbox-streets-v8');
      }
    });
  });

  describe('URL path segments are encoded (defense-in-depth for username)', () => {
    it('DeleteStyleTool encodes username containing "/" from JWT payload', async () => {
      const maliciousToken = makeToken('user/attacker');
      const { httpRequest, mockHttpRequest } = setupHttpRequest({
        ok: true,
        status: 204
      });

      await new DeleteStyleTool({ httpRequest }).run(
        { styleId: VALID_STYLE_ID },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { authInfo: { token: maliciousToken } } as any
      );

      const calledUrl: string = mockHttpRequest.mock.calls[0][0];
      expect(calledUrl).toContain('user%2Fattacker');
      expect(calledUrl).not.toMatch(/\/styles\/v1\/user\/attacker\//);
    });

    it('PreviewStyleTool encodes username containing "/" in preview URL and resource URI', async () => {
      const maliciousPublicToken = makePublicToken('user/attacker');

      const result = await new PreviewStyleTool().run({
        styleId: VALID_STYLE_ID,
        accessToken: maliciousPublicToken
      });

      const url = result.content[0].text as string;
      expect(url).toContain('user%2Fattacker');
      expect(url).not.toMatch(/\/styles\/v1\/user\/attacker\//);
    });

    it('RetrieveStyleTool encodes username containing "/" from JWT payload', async () => {
      const maliciousToken = makeToken('user/attacker');
      const { httpRequest, mockHttpRequest } = setupHttpRequest({
        ok: true,
        json: async () => MOCK_STYLE_RESPONSE
      });

      await new RetrieveStyleTool({ httpRequest }).run(
        { styleId: VALID_STYLE_ID },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { authInfo: { token: maliciousToken } } as any
      );

      const calledUrl: string = mockHttpRequest.mock.calls[0][0];
      expect(calledUrl).toContain('user%2Fattacker');
      expect(calledUrl).not.toMatch(/\/styles\/v1\/user\/attacker\//);
    });

    it('UpdateStyleTool encodes username containing "/" from JWT payload', async () => {
      const maliciousToken = makeToken('user/attacker');
      const { httpRequest, mockHttpRequest } = setupHttpRequest({
        ok: true,
        json: async () => MOCK_STYLE_RESPONSE
      });

      await new UpdateStyleTool({ httpRequest }).run(
        { styleId: VALID_STYLE_ID },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { authInfo: { token: maliciousToken } } as any
      );

      const calledUrl: string = mockHttpRequest.mock.calls[0][0];
      expect(calledUrl).toContain('user%2Fattacker');
      expect(calledUrl).not.toMatch(/\/styles\/v1\/user\/attacker\//);
    });
  });

  describe('response schema mismatch returns error instead of silently passing through', () => {
    it('RetrieveStyleTool returns isError:true when API returns style array (traversal hit list endpoint)', async () => {
      const { httpRequest } = setupHttpRequest({
        ok: true,
        json: async () => [MOCK_STYLE_RESPONSE, MOCK_STYLE_RESPONSE]
      });

      const result = await new RetrieveStyleTool({ httpRequest }).run({
        styleId: VALID_STYLE_ID
      });

      expect(result.isError).toBe(true);
    });

    it('RetrieveStyleTool returns isError:true when API returns token list (traversal hit tokens endpoint)', async () => {
      const { httpRequest } = setupHttpRequest({
        ok: true,
        json: async () => ({ tokens: ['tk.abc123', 'tk.def456'], count: 2 })
      });

      const result = await new RetrieveStyleTool({ httpRequest }).run({
        styleId: VALID_STYLE_ID
      });

      expect(result.isError).toBe(true);
    });

    it('UpdateStyleTool returns isError:true when API returns wrong format', async () => {
      const { httpRequest } = setupHttpRequest({
        ok: true,
        json: async () => ({ tokens: ['tk.abc123'], count: 1 })
      });

      const result = await new UpdateStyleTool({ httpRequest }).run({
        styleId: VALID_STYLE_ID
      });

      expect(result.isError).toBe(true);
    });

    it('TilequeryTool returns isError:true when API returns non-FeatureCollection response', async () => {
      const { httpRequest } = setupHttpRequest({
        ok: true,
        json: async () => ({ type: 'TokenList', tokens: ['tk.abc'] })
      });

      const result = await new TilequeryTool({ httpRequest }).run({
        tilesetId: VALID_TILESET_ID,
        longitude: 0,
        latitude: 0
      });

      expect(result.isError).toBe(true);
    });
  });
});
