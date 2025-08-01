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
import { ListTokensTool } from './ListTokensTool.js';

type TextContent = { type: 'text'; text: string };

describe('ListTokensTool', () => {
  let tool: ListTokensTool;

  beforeEach(() => {
    tool = new ListTokensTool();
    tool['log'] = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('list_tokens_tool');
      expect(tool.description).toBe(
        'List Mapbox access tokens for the authenticated user with optional filtering and pagination. When using pagination, the "start" parameter must be obtained from the "next_start" field of the previous response (it is not a token ID)'
      );
    });

    it('should have correct input schema', () => {
      const { ListTokensSchema } = require('./ListTokensTool.schema.ts');
      expect(ListTokensSchema).toBeDefined();
    });
  });

  describe('validation', () => {
    it('validates limit range', async () => {
      const result = await tool.run({ limit: 101 });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Number must be less than or equal to 100');
    });

    it('validates sortby enum values', async () => {
      const result = await tool.run({
        sortby: 'invalid' as unknown as 'created' | 'modified'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('validates usage enum values', async () => {
      const result = await tool.run({
        usage: 'invalid' as unknown as 'pk' | 'sk' | 'tk'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
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

        const toolWithInvalidToken = new ListTokensTool();
        toolWithInvalidToken['log'] = jest.fn();

        const result = await toolWithInvalidToken.run({});

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
    it('lists all tokens without filters', async () => {
      const mockTokens = [
        {
          id: 'cktest123',
          note: 'Default public token',
          usage: 'pk',
          token: 'pk.eyJ1IjoidGVzdHVzZXIifQ.test123',
          scopes: ['styles:read', 'fonts:read'],
          created: '2023-01-01T00:00:00.000Z',
          modified: '2023-01-01T00:00:00.000Z'
        },
        {
          id: 'cktest456',
          note: 'Secret token',
          usage: 'sk',
          token: 'sk.eyJ1IjoidGVzdHVzZXIifQ.test456',
          scopes: ['styles:read', 'fonts:read', 'tokens:read'],
          created: '2023-02-01T00:00:00.000Z',
          modified: '2023-02-01T00:00:00.000Z'
        }
      ];

      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => mockTokens
      } as Response);

      const result = await tool.run({});

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.tokens).toHaveLength(2);
      expect(responseData.count).toBe(2);
      expect(responseData.tokens[0].id).toBe('cktest123');
      expect(responseData.tokens[1].id).toBe('cktest456');

      // Verify the request
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          'https://api.mapbox.com/tokens/v2/testuser?access_token='
        ),
        {
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        }
      );

      // Verify User-Agent header was sent
      assertHeadersSent(fetchMock);
    });

    it('filters by default token', async () => {
      const mockTokens = [
        {
          id: 'ckdefault',
          note: 'Default public token',
          usage: 'pk',
          token: 'pk.eyJ1IjoidGVzdHVzZXIifQ.default',
          default: true,
          scopes: ['styles:read', 'fonts:read'],
          created: '2023-01-01T00:00:00.000Z',
          modified: '2023-01-01T00:00:00.000Z'
        }
      ];

      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => mockTokens
      } as Response);

      const result = await tool.run({ default: true });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.tokens).toHaveLength(1);
      expect(responseData.tokens[0].default).toBe(true);

      // Verify the request included the default parameter
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('default=true'),
        expect.any(Object)
      );
    });

    it('applies pagination parameters', async () => {
      const mockTokens = [
        {
          id: 'cktest789',
          note: 'Token 3',
          usage: 'sk',
          token: 'sk.eyJ1IjoidGVzdHVzZXIifQ.test789',
          scopes: ['styles:read'],
          created: '2023-03-01T00:00:00.000Z',
          modified: '2023-03-01T00:00:00.000Z'
        }
      ];

      const fetchMock = setupFetch();
      const headers = new Headers();
      headers.set(
        'Link',
        '<https://api.mapbox.com/tokens/v2/testuser?limit=10&start=cktest999>; rel="next"'
      );

      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers,
        json: async () => mockTokens
      } as Response);

      const result = await tool.run({
        limit: 10,
        start: 'cktest789',
        sortby: 'created'
      });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.tokens).toHaveLength(1);

      // Verify all parameters were included in the request
      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('start=cktest789');
      expect(callUrl).toContain('sortby=created');
    });

    it('returns next page start token when limit is provided and next page exists', async () => {
      const mockTokens = [
        {
          id: 'cktest789',
          note: 'Token 3',
          usage: 'sk',
          token: 'sk.eyJ1IjoidGVzdHVzZXIifQ.test789',
          scopes: ['styles:read'],
          created: '2023-03-01T00:00:00.000Z',
          modified: '2023-03-01T00:00:00.000Z'
        }
      ];

      const fetchMock = setupFetch();
      const headers = new Headers();
      headers.set(
        'Link',
        '<https://api.mapbox.com/tokens/v2/testuser?limit=10&start=cktest999>; rel="next"'
      );

      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers,
        json: async () => mockTokens
      } as Response);

      const result = await tool.run({ limit: 10 });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.tokens).toHaveLength(1);
      expect(responseData.next_start).toBe('cktest999');
    });

    it('returns next page start token when start is provided and next page exists', async () => {
      const mockTokens = [
        {
          id: 'cktest789',
          note: 'Token 3',
          usage: 'sk',
          token: 'sk.eyJ1IjoidGVzdHVzZXIifQ.test789',
          scopes: ['styles:read'],
          created: '2023-03-01T00:00:00.000Z',
          modified: '2023-03-01T00:00:00.000Z'
        }
      ];

      const fetchMock = setupFetch();
      const headers = new Headers();
      headers.set(
        'Link',
        '<https://api.mapbox.com/tokens/v2/testuser?limit=10&start=cktest999>; rel="next"'
      );

      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers,
        json: async () => mockTokens
      } as Response);

      const result = await tool.run({ start: 'cktest789' });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.tokens).toHaveLength(1);
      expect(responseData.next_start).toBe('cktest999');
    });

    it('does not return next page start token when no pagination parameters are provided', async () => {
      const mockTokens = [
        {
          id: 'cktest789',
          note: 'Token 3',
          usage: 'sk',
          token: 'sk.eyJ1IjoidGVzdHVzZXIifQ.test789',
          scopes: ['styles:read'],
          created: '2023-03-01T00:00:00.000Z',
          modified: '2023-03-01T00:00:00.000Z'
        }
      ];

      const fetchMock = setupFetch();
      // First page with Link header
      const headers1 = new Headers();
      headers1.set(
        'Link',
        '<https://api.mapbox.com/tokens/v2/testuser?limit=10&start=cktest999>; rel="next"'
      );

      // Second page without Link header (end of results)
      const headers2 = new Headers();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: headers1,
        json: async () => mockTokens
      } as Response);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: headers2,
        json: async () => [] // Empty array for second page
      } as Response);

      const result = await tool.run({});

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.tokens).toHaveLength(1);
      expect(responseData.next_start).toBeUndefined();
    });

    it('does not return next page start token when no Link header is present', async () => {
      const mockTokens = [
        {
          id: 'cktest789',
          note: 'Token 3',
          usage: 'sk',
          token: 'sk.eyJ1IjoidGVzdHVzZXIifQ.test789',
          scopes: ['styles:read'],
          created: '2023-03-01T00:00:00.000Z',
          modified: '2023-03-01T00:00:00.000Z'
        }
      ];

      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => mockTokens
      } as Response);

      const result = await tool.run({ limit: 10 });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.tokens).toHaveLength(1);
      expect(responseData.next_start).toBeUndefined();
    });

    it('filters by token usage type', async () => {
      const mockTokens = [
        {
          id: 'tktest123',
          note: 'Temporary token',
          usage: 'tk',
          token: 'tk.eyJ1IjoidGVzdHVzZXIifQ.temp123',
          scopes: ['styles:read'],
          created: '2023-04-01T00:00:00.000Z',
          modified: '2023-04-01T00:00:00.000Z',
          expires: '2023-04-01T01:00:00.000Z'
        }
      ];

      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => mockTokens
      } as Response);

      const result = await tool.run({ usage: 'tk' });

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.tokens).toHaveLength(1);
      expect(responseData.tokens[0].usage).toBe('tk');

      // Verify the usage parameter was included
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('usage=tk'),
        expect.any(Object)
      );
    });

    it('handles API errors gracefully', async () => {
      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          '{"message": "Invalid access token", "code": "TokenInvalid"}'
      } as Response);

      const result = await tool.run({});

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Failed to list tokens: 401');
    });

    it('handles network errors', async () => {
      const fetchMock = setupFetch();
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const result = await tool.run({});

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

        const toolWithCustomEndpoint = new ListTokensTool();
        toolWithCustomEndpoint['log'] = jest.fn();

        const mockTokens: object[] = [];

        const fetchMock = setupFetch();
        fetchMock.mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => mockTokens
        } as Response);

        await toolWithCustomEndpoint.run({});

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

    it('handles response with tokens property', async () => {
      const mockResponse = {
        tokens: [
          {
            id: 'cktest123',
            note: 'Test token',
            usage: 'pk',
            token: 'pk.test',
            scopes: ['styles:read']
          }
        ]
      };

      const fetchMock = setupFetch();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => mockResponse
      } as Response);

      const result = await tool.run({});

      expect(result.isError).toBe(false);
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.tokens).toHaveLength(1);
      expect(responseData.count).toBe(1);
    });
  });
});
