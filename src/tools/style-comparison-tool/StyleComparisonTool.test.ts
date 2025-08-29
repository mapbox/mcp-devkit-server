import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { ListTokensTool } from '../list-tokens-tool/ListTokensTool.js';
import { StyleComparisonTool } from './StyleComparisonTool.js';

describe('StyleComparisonTool', () => {
  let tool: StyleComparisonTool;
  let mockListTokensTool: jest.SpyInstance;

  beforeEach(() => {
    tool = new StyleComparisonTool();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('run', () => {
    it('should generate comparison URL with provided access token', async () => {
      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('https://agent.mapbox.com/tools/style-compare');
      expect(url).toContain('access_token=pk.test.token');
      expect(url).toContain('before=mapbox%2Fstreets-v11');
      expect(url).toContain('after=mapbox%2Foutdoors-v12');
    });

    it('should attempt to fetch public token when no token provided', async () => {
      mockListTokensTool = jest
        .spyOn(ListTokensTool.prototype, 'run')
        .mockResolvedValue({
          isError: false,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tokens: [
                  {
                    token: 'pk.fetched.token',
                    name: 'Public Token'
                  }
                ]
              })
            }
          ]
        });

      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/satellite-v9'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      expect(mockListTokensTool).toHaveBeenCalledWith({ usage: 'pk' });
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('access_token=pk.fetched.token');
    });

    it('should handle full style URLs', async () => {
      const input = {
        before: 'mapbox://styles/mapbox/streets-v11',
        after: 'mapbox://styles/mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('before=mapbox%2Fstreets-v11');
      expect(url).toContain('after=mapbox%2Foutdoors-v12');
    });

    it('should handle just style IDs with valid public token', async () => {
      // Mock MapboxApiBasedTool.getUserNameFromToken to return a username
      jest
        .spyOn(MapboxApiBasedTool, 'getUserNameFromToken')
        .mockReturnValue('testuser');

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

    it('should reject secret tokens and try to fetch public token', async () => {
      mockListTokensTool = jest
        .spyOn(ListTokensTool.prototype, 'run')
        .mockResolvedValue({
          isError: false,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tokens: [
                  {
                    token: 'pk.fetched.public.token',
                    name: 'Public Token'
                  }
                ]
              })
            }
          ]
        });

      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'sk.secret.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      expect(mockListTokensTool).toHaveBeenCalledWith({ usage: 'pk' });
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('access_token=pk.fetched.public.token');
      expect(url).not.toContain('sk.secret.token');
    });

    it('should error when secret token provided and no public token available', async () => {
      mockListTokensTool = jest
        .spyOn(ListTokensTool.prototype, 'run')
        .mockResolvedValue({
          isError: false,
          content: [
            {
              type: 'text',
              text: JSON.stringify({ tokens: [] })
            }
          ]
        });

      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'sk.secret.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Secret tokens (sk.*) cannot be used for style comparison');
    });

    it('should return error when no token available', async () => {
      mockListTokensTool = jest
        .spyOn(ListTokensTool.prototype, 'run')
        .mockResolvedValue({
          isError: false,
          content: [
            {
              type: 'text',
              text: JSON.stringify({ tokens: [] })
            }
          ]
        });

      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('No access token provided');
    });

    it('should return error for style ID without valid username in token', async () => {
      // Mock getUserNameFromToken to throw an error
      jest
        .spyOn(MapboxApiBasedTool, 'getUserNameFromToken')
        .mockImplementation(() => {
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
      ).toContain('Could not determine username');
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
