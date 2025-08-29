import { TilequeryTool } from './TilequeryTool.js';
import { TilequeryInput } from './TilequeryTool.schema.js';

describe('TilequeryTool', () => {
  let tool: TilequeryTool;

  beforeEach(() => {
    tool = new TilequeryTool();
  });

  describe('constructor', () => {
    it('should initialize with correct name and description', () => {
      expect(tool.name).toBe('tilequery_tool');
      expect(tool.description).toBe(
        'Query vector and raster data from Mapbox tilesets at geographic coordinates'
      );
    });
  });

  describe('schema validation', () => {
    it('should validate minimal valid input', () => {
      const input = {
        longitude: -122.4194,
        latitude: 37.7749
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tilesetId).toBe('mapbox.mapbox-streets-v8');
        expect(result.data.radius).toBe(0);
        expect(result.data.limit).toBe(5);
        expect(result.data.dedupe).toBe(true);
      }
    });

    it('should validate complete input with all optional parameters', () => {
      const input: TilequeryInput = {
        tilesetId: 'custom.tileset',
        longitude: -122.4194,
        latitude: 37.7749,
        radius: 100,
        limit: 10,
        dedupe: false,
        geometry: 'polygon',
        layers: ['buildings', 'roads'],
        bands: ['band1', 'band2']
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid longitude', () => {
      const input = {
        longitude: 181, // Invalid: > 180
        latitude: 37.7749
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid latitude', () => {
      const input = {
        longitude: -122.4194,
        latitude: 91 // Invalid: > 90
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject limit outside valid range', () => {
      const input = {
        longitude: -122.4194,
        latitude: 37.7749,
        limit: 51 // Invalid: > 50
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid geometry type', () => {
      const input = {
        longitude: -122.4194,
        latitude: 37.7749,
        geometry: 'invalid' as 'polygon'
      };

      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
