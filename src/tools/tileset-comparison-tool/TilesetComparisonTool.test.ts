import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { ListTokensTool } from '../list-tokens-tool/ListTokensTool.js';
import { TilesetComparisonTool } from './TilesetComparisonTool.js';

describe('TilesetComparisonTool', () => {
  let tool: TilesetComparisonTool;
  let mockListTokensTool: jest.SpyInstance;

  beforeEach(() => {
    tool = new TilesetComparisonTool();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('run', () => {
    it('should generate HTML with provided access token', async () => {
      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token',
        title: 'Street vs Outdoors Comparison',
        center: [-122.4194, 37.7749] as [number, number],
        zoom: 12
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
      const html = (result.content[0] as { type: 'text'; text: string }).text;
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('mapbox-gl-compare');
      expect(html).toContain('pk.test.token');
      expect(html).toContain('mapbox://styles/mapbox/streets-v11');
      expect(html).toContain('mapbox://styles/mapbox/outdoors-v12');
      expect(html).toContain('Street vs Outdoors Comparison');
      expect(html).toContain('center: [-122.4194, 37.7749]');
      expect(html).toContain('zoom: 12');
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
      const html = (result.content[0] as { type: 'text'; text: string }).text;
      expect(html).toContain('pk.fetched.token');
    });

    it('should handle full style URLs', async () => {
      const input = {
        before: 'mapbox://styles/mapbox/streets-v11',
        after: 'mapbox://styles/mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const html = (result.content[0] as { type: 'text'; text: string }).text;
      expect(html).toContain('mapbox://styles/mapbox/streets-v11');
      expect(html).toContain('mapbox://styles/mapbox/outdoors-v12');
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
      const html = (result.content[0] as { type: 'text'; text: string }).text;
      expect(html).toContain('mapbox://styles/testuser/style-id-1');
      expect(html).toContain('mapbox://styles/testuser/style-id-2');
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
      const html = (result.content[0] as { type: 'text'; text: string }).text;
      expect(html).toContain('pk.fetched.public.token');
      expect(html).not.toContain('sk.secret.token');
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
      ).toContain('HTML comparison requires a public token');
    });

    it('should include all map options when provided', async () => {
      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token',
        center: [-74.006, 40.7128] as [number, number],
        zoom: 10,
        bearing: 45,
        pitch: 60
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const html = (result.content[0] as { type: 'text'; text: string }).text;
      expect(html).toContain('center: [-74.006, 40.7128]');
      expect(html).toContain('zoom: 10');
      expect(html).toContain('bearing: 45');
      expect(html).toContain('pitch: 60');
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

    it('should not include overlay when title is not provided', async () => {
      const input = {
        before: 'mapbox/streets-v11',
        after: 'mapbox/outdoors-v12',
        accessToken: 'pk.test.token'
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const html = (result.content[0] as { type: 'text'; text: string }).text;
      expect(html).not.toContain('class="map-overlay"');
    });
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('tileset_comparison_tool');
      expect(tool.description).toBe(
        'Generate an HTML file for comparing two Mapbox styles side-by-side using mapbox-gl-compare'
      );
    });
  });
});
