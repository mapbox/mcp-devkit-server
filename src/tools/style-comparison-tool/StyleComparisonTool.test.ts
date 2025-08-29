import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { StyleComparisonTool } from './StyleComparisonTool.js';

describe('StyleComparisonTool', () => {
  let tool: StyleComparisonTool;

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

    it('should require access token', async () => {
      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/satellite-v9'
        // Missing accessToken
      };

      const result = await tool.run(input as any);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Required');
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

    it('should reject secret tokens', async () => {
      const input = {
        before: 'mapbox/streets-v11',
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
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'invalid.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(true);
      expect(
        (result.content[0] as { type: 'text'; text: string }).text
      ).toContain('Invalid token type');
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

    it('should include nocache parameter when noCache is true', async () => {
      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token',
        noCache: true
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('nocache=true');
    });

    it('should not include nocache parameter when noCache is false or undefined', async () => {
      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token',
        noCache: false
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).not.toContain('nocache');

      // Test with undefined (default)
      const inputWithoutNoCache = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result2 = await tool.run(inputWithoutNoCache);
      expect(result2.isError).toBe(false);
      const url2 = (result2.content[0] as { type: 'text'; text: string }).text;
      expect(url2).not.toContain('nocache');
    });

    it('should include hash fragment with map position when coordinates are provided', async () => {
      const input = {
        before: 'mapbox/streets-v11',
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
        before: 'mapbox/streets-v11',
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
        before: 'mapbox/streets-v11',
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

    it('should handle both nocache and map position together', async () => {
      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token',
        noCache: true,
        zoom: 12,
        latitude: 37.7749,
        longitude: -122.4194
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const url = (result.content[0] as { type: 'text'; text: string }).text;
      expect(url).toContain('nocache=true');
      expect(url).toContain('#12/37.7749/-122.4194');
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
