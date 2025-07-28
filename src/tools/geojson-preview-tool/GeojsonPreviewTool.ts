import { GeoJSON } from 'geojson';
import { BaseTool } from '../BaseTool.js';
import {
  GeojsonPreviewSchema,
  GeojsonPreviewInput
} from './GeojsonPreviewTool.schema.js';

export class GeojsonPreviewTool extends BaseTool<typeof GeojsonPreviewSchema> {
  name = 'geojson_preview_tool';
  description =
    'Generate a geojson.io URL to visualize GeoJSON data. Returns only the URL link.';

  constructor() {
    super({ inputSchema: GeojsonPreviewSchema });
  }

  private isValidGeoJSON(data: unknown): data is GeoJSON {
    if (
      !data ||
      typeof data !== 'object' ||
      !(data as Record<string, unknown>).type
    )
      return false;

    const validTypes = [
      'Point',
      'LineString',
      'Polygon',
      'MultiPoint',
      'MultiLineString',
      'MultiPolygon',
      'GeometryCollection',
      'Feature',
      'FeatureCollection'
    ];
    return validTypes.includes(
      (data as Record<string, unknown>).type as string
    );
  }

  protected async execute(
    input: GeojsonPreviewInput
  ): Promise<{ type: 'text'; text: string }> {
    try {
      // Parse and validate JSON format
      const geojsonData = JSON.parse(input.geojson);

      // Validate GeoJSON structure
      if (!this.isValidGeoJSON(geojsonData)) {
        throw new Error('Invalid GeoJSON structure');
      }

      // Generate geojson.io URL
      const geojsonString = JSON.stringify(geojsonData);
      const encodedGeoJSON = encodeURIComponent(geojsonString);
      const geojsonIOUrl = `https://geojson.io/#data=data:application/json,${encodedGeoJSON}`;

      return {
        type: 'text',
        text: geojsonIOUrl
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`GeoJSON processing failed: ${errorMessage}`);
    }
  }
}
