// Set environment variables before any imports
// Create a token with username in the payload
const payload = Buffer.from(JSON.stringify({ u: 'testuser' })).toString(
  'base64'
);
process.env.MAPBOX_ACCESS_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

import {
  setupFetch,
  assertHeadersSent
} from '../../utils/requestUtils.test-helpers.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { CreateTokenTool } from './CreateTokenTool.js';

type TextContent = { type: 'text'; text: string };

describe('CreateTokenTool', () => {
  let tool: CreateTokenTool;

  beforeEach(() => {
    tool = new CreateTokenTool();
    tool['log'] = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('create_token_tool');
      expect(tool.description).toBe(
        'Create a new Mapbox access token with specified scopes and optional URL restrictions. Token type (public/secret) is automatically determined by scopes: PUBLIC scopes (styles:tiles, styles:read, fonts:read, datasets:read, vision:read) create public tokens; SECRET scopes create secret tokens that are only visible once upon creation.'
      );
    });

    it('should have correct input schema', () => {
      const { CreateTokenSchema } = require('./CreateTokenTool.schema.js');
      expect(CreateTokenSchema).toBeDefined();
    });
  });

  describe('validation', () => {
    it('validates required input fields', async () => {
      const result = await tool.run({});

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Required');
    });

    it('validates allowedUrls array length', async () => {
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
      const originalToken = MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN;

      try {
        // Set a token without username in payload
        const invalidPayload = Buffer.from(
          JSON.stringify({ sub: 'test' })
        ).toString('base64');
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: `eyJhbGciOiJIUzI1NiJ9.${invalidPayload}.signature`,
          writable: true,
          configurable: true
        });

        const toolWithInvalidToken = new CreateTokenTool();
        toolWithInvalidToken['log'] = jest.fn();

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
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: originalToken,
          writable: true,
          configurable: true
        });
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
        modified: '2024-01-01T00:00:00.000Z'
      };

      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

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
      expect(fetchMock).toHaveBeenCalledWith(
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
      assertHeadersSent(fetchMock);
    });

    it('creates a token with allowed URLs', async () => {
      const mockResponse = {
        token: 'pk.eyJ1IjoidGVzdHVzZXIiLCJhIjoiY2xwMTIzNDU2In0.test',
        note: 'Restricted token',
        id: 'cktest456',
        scopes: ['styles:read'],
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
        allowedUrls: ['https://example.com', 'https://app.example.com']
      };

      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await tool.run({
        note: 'Restricted token',
        scopes: ['styles:read'],
        allowedUrls: ['https://example.com', 'https://app.example.com']
      });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.allowedUrls).toEqual(mockResponse.allowedUrls);

      // Verify the request body included allowedUrls
      const lastCall = fetchMock.mock.calls[0];
      const requestBody = JSON.parse(lastCall[1].body as string);
      expect(requestBody.allowedUrls).toEqual([
        'https://example.com',
        'https://app.example.com'
      ]);
    });

    it('creates a temporary token with expiration', async () => {
      const expiresAt = '2024-12-31T23:59:59.000Z';
      const mockResponse = {
        token: 'tk.eyJ1IjoidGVzdHVzZXIiLCJhIjoiY2xwMTIzNDU2In0.test',
        note: 'Temporary token',
        id: 'cktest789',
        scopes: ['styles:read'],
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z',
        expires: expiresAt
      };

      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await tool.run({
        note: 'Temporary token',
        scopes: ['styles:read'],
        expires: expiresAt
      });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.expires).toEqual(expiresAt);

      // Verify the request body included expires
      const lastCall = fetchMock.mock.calls[0];
      const requestBody = JSON.parse(lastCall[1].body as string);
      expect(requestBody.expires).toEqual(expiresAt);
    });

    it('logs warning when creating token with secret scopes', async () => {
      const mockResponse = {
        token: 'sk.eyJ1IjoidGVzdHVzZXIiLCJhIjoiY2xwMTIzNDU2In0.secret',
        note: 'Secret token',
        id: 'cksecret123',
        scopes: ['tokens:write', 'styles:write'],
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-01T00:00:00.000Z'
      };

      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await tool.run({
        note: 'Secret token',
        scopes: ['tokens:write', 'styles:write']
      });

      expect(result.isError).toBe(false);

      // Verify the warning was logged
      expect(tool['log']).toHaveBeenCalledWith(
        'info',
        'CreateTokenTool: Creating a SECRET token due to secret scopes. This token will only be visible once upon creation.'
      );
    });

    it('handles API errors gracefully', async () => {
      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          '{"message": "Token does not have required scopes", "code": "TokenScopesInvalid"}'
      } as Response);

      const result = await tool.run({
        note: 'Test token',
        scopes: ['tokens:write']
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Failed to create token: 401');
    });

    it('handles network errors', async () => {
      const fetchMock = setupFetch();
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await tool.run({
        note: 'Test token',
        scopes: ['styles:read']
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Network error');
    });

    it('uses custom API endpoint when provided', async () => {
      const originalEndpoint = MapboxApiBasedTool.MAPBOX_API_ENDPOINT;

      try {
        // Temporarily modify the static property
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_API_ENDPOINT', {
          value: 'https://api.staging.mapbox.com/',
          writable: true,
          configurable: true
        });

        const toolWithCustomEndpoint = new CreateTokenTool();
        toolWithCustomEndpoint['log'] = jest.fn();

        const mockResponse = {
          token: 'pk.test',
          note: 'Test token',
          id: 'cktest',
          scopes: ['styles:read'],
          created: '2024-01-01T00:00:00.000Z',
          modified: '2024-01-01T00:00:00.000Z'
        };

        const fetchMock = setupFetch();
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        } as Response);

        await toolWithCustomEndpoint.run({
          note: 'Test token',
          scopes: ['styles:read']
        });

        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('https://api.staging.mapbox.com/tokens/v2/'),
          expect.any(Object)
        );
      } finally {
        // Restore
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_API_ENDPOINT', {
          value: originalEndpoint,
          writable: true,
          configurable: true
        });
      }
    });
  });
});
