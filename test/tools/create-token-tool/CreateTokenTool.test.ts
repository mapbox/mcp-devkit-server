// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import {
  setupHttpRequest,
  assertHeadersSent
} from '../../utils/httpPipelineUtils.js';
import { MapboxApiBasedTool } from '../../../src/tools/MapboxApiBasedTool.js';
import { CreateTokenTool } from '../../../src/tools/create-token-tool/CreateTokenTool.js';
import { HttpRequest } from 'src/utils/types.js';

// Create a token with username in the payload
const payload = Buffer.from(JSON.stringify({ u: 'testuser' })).toString(
  'base64'
);
const mockToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

beforeAll(() => {
  process.env.MAPBOX_ACCESS_TOKEN = mockToken;
});

type TextContent = { type: 'text'; text: string };

describe('CreateTokenTool', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function createTokenTool(httpRequest: HttpRequest) {
    const instance = new CreateTokenTool({ httpRequest });
    instance['log'] = vi.fn();
    return instance;
  }

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const { httpRequest } = setupHttpRequest();
      const tool = createTokenTool(httpRequest);
      expect(tool.name).toBe('create_token_tool');
      expect(tool.description).toBe(
        'Create a new Mapbox public access token with specified scopes and optional URL restrictions.'
      );
    });

    it('should have correct input schema', async () => {
      const { CreateTokenSchema } = await import(
        '../../../src/tools/create-token-tool/CreateTokenTool.input.schema.js'
      );
      expect(CreateTokenSchema).toBeDefined();
    });
  });

  describe('validation', () => {
    it('validates required input fields', async () => {
      const { httpRequest } = setupHttpRequest();
      const tool = createTokenTool(httpRequest);
      const result = await tool.run({});

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Required');
    });

    it('validates allowedUrls array length', async () => {
      const { httpRequest } = setupHttpRequest();
      const tool = createTokenTool(httpRequest);

      const urls = new Array(101).fill('https://example.com');

      const result = await tool.run({
        note: 'Test token',
        scopes: ['styles:read'],
        allowedUrls: urls
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Maximum 100 allowed URLs');
    });

    it('validates invalid scopes', async () => {
      const { httpRequest } = setupHttpRequest();
      const tool = createTokenTool(httpRequest);

      const result = await tool.run({
        note: 'Test token',
        scopes: ['invalid:scope' as unknown as string]
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Invalid enum value');
    });

    it('throws error when unable to extract username from token', async () => {
      const originalEnvToken = process.env.MAPBOX_ACCESS_TOKEN;

      try {
        // Set a token without username in payload
        const invalidPayload = Buffer.from(
          JSON.stringify({ sub: 'test' })
        ).toString('base64');
        const invalidToken = `eyJhbGciOiJIUzI1NiJ9.${invalidPayload}.signature`;

        vi.stubEnv('MAPBOX_ACCESS_TOKEN', invalidToken);

        // Setup fetch mock to prevent actual API calls
        const { httpRequest } = setupHttpRequest({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({ token: 'test-token' })
        } as Response);

        const toolWithInvalidToken = new CreateTokenTool({ httpRequest });
        toolWithInvalidToken['log'] = vi.fn();

        const result = await toolWithInvalidToken.run({
          note: 'Test token',
          scopes: ['styles:read']
        });

        expect(result.isError).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');
        const errorText = (result.content[0] as TextContent).text;
        expect(errorText).toContain(
          'MAPBOX_ACCESS_TOKEN does not contain username in payload'
        );
      } finally {
        // Restore
        vi.unstubAllEnvs();
        if (originalEnvToken) {
          vi.stubEnv('MAPBOX_ACCESS_TOKEN', originalEnvToken);
        }
      }
    });
  });

  describe('execute', () => {
    it('creates a token with basic parameters', async () => {
      const mockResponse = {
        token: 'pk.eyJ1IjoidGVzdHVzZXIiLCJhIjoiY2xwMTIzNDU2In0.test',
        note: 'Test token',
        id: 'cktest123',
        scopes: ['styles:read', 'fonts:read'],
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
        usage: 'pk',
        default: false
      };

      const { httpRequest, mockHttpRequest } = setupHttpRequest({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const tool = createTokenTool(httpRequest);

      const result = await tool.run({
        note: 'Test token',
        scopes: ['styles:read', 'fonts:read']
      });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toMatchObject({
        token: mockResponse.token,
        note: mockResponse.note,
        id: mockResponse.id,
        scopes: mockResponse.scopes
      });

      // Verify the request
      expect(mockHttpRequest).toHaveBeenCalledWith(
        `https://api.mapbox.com/tokens/v2/testuser?access_token=eyJhbGciOiJIUzI1NiJ9.${payload}.signature`,
        {
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            note: 'Test token',
            scopes: ['styles:read', 'fonts:read']
          })
        }
      );

      // Verify User-Agent header was sent
      assertHeadersSent(mockHttpRequest);
    });

    it('creates a token with allowed URLs', async () => {
      const mockResponse = {
        token: 'pk.eyJ1IjoidGVzdHVzZXIiLCJhIjoiY2xwMTIzNDU2In0.test',
        note: 'Restricted token',
        id: 'cktest456',
        scopes: ['styles:read'],
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
        allowedUrls: ['https://example.com', 'https://app.example.com'],
        usage: 'pk',
        default: false
      };

      const { httpRequest, mockHttpRequest } = setupHttpRequest({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const tool = createTokenTool(httpRequest);

      const result = await tool.run({
        note: 'Restricted token',
        scopes: ['styles:read'],
        allowedUrls: ['https://example.com', 'https://app.example.com']
      });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.allowedUrls).toEqual(mockResponse.allowedUrls);

      // Verify the request body included allowedUrls
      const lastCall = mockHttpRequest.mock.calls[0];
      const requestBody = JSON.parse(lastCall[1].body as string);
      expect(requestBody.allowedUrls).toEqual([
        'https://example.com',
        'https://app.example.com'
      ]);
    });

    it('creates a token with expiration', async () => {
      const expiresAt = '2024-12-31T23:59:59.000Z';
      const mockResponse = {
        token: 'pk.eyJ1IjoidGVzdHVzZXIiLCJhIjoiY2xwMTIzNDU2In0.test',
        note: 'Token with expiration',
        id: 'cktest789',
        scopes: ['styles:read'],
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
        expires: expiresAt,
        usage: 'pk',
        default: false
      };

      const { mockHttpRequest, httpRequest } = setupHttpRequest({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const tool = createTokenTool(httpRequest);

      const result = await tool.run({
        note: 'Token with expiration',
        scopes: ['styles:read'],
        expires: expiresAt
      });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.expires).toEqual(expiresAt);

      // Verify the request body included expires
      const lastCall = mockHttpRequest.mock.calls[0];
      const requestBody = JSON.parse(lastCall[1].body as string);
      expect(requestBody.expires).toEqual(expiresAt);
    });

    it('handles API errors gracefully', async () => {
      const { httpRequest } = setupHttpRequest({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          '{"message": "Token does not have required scopes", "code": "TokenScopesInvalid"}'
      } as Response);

      const tool = createTokenTool(httpRequest);

      const result = await tool.run({
        note: 'Test token',
        scopes: ['styles:read']
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Failed to create token: 401');
    });

    it('handles network errors', async () => {
      const { httpRequest } = setupHttpRequest({
        ok: false,
        status: 0,
        statusText: 'Network Error',
        text: async () => 'Network error'
      });

      const tool = createTokenTool(httpRequest);

      const result = await tool.run({
        note: 'Test token',
        scopes: ['styles:read']
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Network Error');
    });

    it('uses custom API endpoint when provided', async () => {
      const originalEndpoint = MapboxApiBasedTool.mapboxApiEndpoint;

      try {
        // Temporarily modify the static property
        vi.stubEnv('MAPBOX_API_ENDPOINT', 'https://api.staging.mapbox.com/');

        const mockResponse = {
          token: 'pk.test',
          note: 'Test token',
          id: 'cktest',
          scopes: ['styles:read'],
          created: '2024-01-01T00:00:00.000Z',
          modified: '2024-01-01T00:00:00.000Z'
        };

        const { mockHttpRequest, httpRequest } = setupHttpRequest({
          ok: true,
          json: async () => mockResponse
        } as Response);

        const toolWithCustomEndpoint = new CreateTokenTool({ httpRequest });
        toolWithCustomEndpoint['log'] = vi.fn();

        await toolWithCustomEndpoint.run({
          note: 'Test token',
          scopes: ['styles:read']
        });

        expect(mockHttpRequest).toHaveBeenCalledWith(
          expect.stringContaining('https://api.staging.mapbox.com/tokens/v2/'),
          expect.any(Object)
        );
      } finally {
        // Restore
        vi.unstubAllEnvs();
        if (originalEndpoint) {
          vi.stubEnv('MAPBOX_API_ENDPOINT', originalEndpoint);
        }
      }
    });
  });
});
