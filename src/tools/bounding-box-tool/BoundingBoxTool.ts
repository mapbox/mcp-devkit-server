import type {
  GeoJSON,
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  Position
} from 'geojson';
import { BaseTool } from '../BaseTool.js';
import {
  BoundingBoxSchema,
  BoundingBoxInput
} from './BoundingBoxTool.schema.js';

export class BoundingBoxTool extends BaseTool<typeof BoundingBoxSchema> {
  readonly name = 'bounding_box_tool';
  readonly description =
    'Calculates bounding box of given GeoJSON content, returns as [minX, minY, maxX, maxY]';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: 'Calculate GeoJSON Bounding Box Tool'
  };

  constructor() {
    super({ inputSchema: BoundingBoxSchema });
  }

  protected async execute(
    input: BoundingBoxInput
  ): Promise<{ type: 'text'; text: string }> {
    const { geojson } = input;

    // Parse GeoJSON if it's a string
    const geojsonObject =
      typeof geojson === 'string'
        ? (JSON.parse(geojson) as GeoJSON)
        : (geojson as GeoJSON);

    // Calculate bounding box
    const bbox = this.calculateBoundingBox(geojsonObject);

    return {
      type: 'text',
      text: JSON.stringify(bbox, null, 2)
    };
  }

  private calculateBoundingBox(
    geojson: GeoJSON
  ): [number, number, number, number] {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const processPosition = (position: Position): void => {
      const [lon, lat] = position;
      minX = Math.min(minX, lon);
      minY = Math.min(minY, lat);
      maxX = Math.max(maxX, lon);
      maxY = Math.max(maxY, lat);
    };

    const processGeometry = (geometry: Geometry): void => {
      switch (geometry.type) {
        case 'Point':
          processPosition(geometry.coordinates);
          break;
        case 'LineString':
        case 'MultiPoint':
          geometry.coordinates.forEach(processPosition);
          break;
        case 'Polygon':
        case 'MultiLineString':
          geometry.coordinates.forEach((ring) => ring.forEach(processPosition));
          break;
        case 'MultiPolygon':
          geometry.coordinates.forEach((polygon) =>
            polygon.forEach((ring) => ring.forEach(processPosition))
          );
          break;
        case 'GeometryCollection':
          geometry.geometries.forEach(processGeometry);
          break;
      }
    };

    const processFeature = (feature: Feature): void => {
      if (feature.geometry) {
        processGeometry(feature.geometry);
      }
    };

    // Handle different GeoJSON types
    switch (geojson.type) {
      case 'FeatureCollection':
        (geojson as FeatureCollection).features.forEach(processFeature);
        break;
      case 'Feature':
        processFeature(geojson as Feature);
        break;
      case 'GeometryCollection':
        (geojson as GeometryCollection).geometries.forEach(processGeometry);
        break;
      case 'Point':
      case 'LineString':
      case 'Polygon':
      case 'MultiPoint':
      case 'MultiLineString':
      case 'MultiPolygon':
        processGeometry(geojson as Geometry);
        break;
      default:
        throw new Error(
          `Unsupported GeoJSON type: ${(geojson as GeoJSON).type}`
        );
    }

    // Handle edge cases
    if (
      !isFinite(minX) ||
      !isFinite(minY) ||
      !isFinite(maxX) ||
      !isFinite(maxY)
    ) {
      throw new Error('No valid coordinates found in the GeoJSON file');
    }

    return [minX, minY, maxX, maxY];
  }

  private isPosition(coords: unknown): coords is Position {
    return (
      Array.isArray(coords) &&
      coords.length >= 2 &&
      typeof coords[0] === 'number' &&
      typeof coords[1] === 'number'
    );
  }
}
