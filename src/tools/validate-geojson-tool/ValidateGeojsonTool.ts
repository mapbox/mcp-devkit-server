// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ValidateGeojsonInputSchema } from './ValidateGeojsonTool.input.schema.js';
import {
  ValidateGeojsonOutputSchema,
  type ValidateGeojsonOutput,
  type GeojsonIssue
} from './ValidateGeojsonTool.output.schema.js';

/**
 * ValidateGeojsonTool - Validates GeoJSON structure and geometry
 *
 * Performs comprehensive validation of GeoJSON objects including type validation,
 * coordinate validation, and geometry structure checks.
 */
export class ValidateGeojsonTool extends BaseTool<
  typeof ValidateGeojsonInputSchema,
  typeof ValidateGeojsonOutputSchema
> {
  readonly name = 'validate_geojson_tool';
  readonly description =
    'Validates GeoJSON objects for correctness, checking structure, coordinates, and geometry types';
  readonly annotations = {
    title: 'Validate GeoJSON Tool',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };

  private static readonly VALID_GEOJSON_TYPES = [
    'Feature',
    'FeatureCollection',
    'Point',
    'MultiPoint',
    'LineString',
    'MultiLineString',
    'Polygon',
    'MultiPolygon',
    'GeometryCollection'
  ];

  private static readonly GEOMETRY_TYPES = [
    'Point',
    'MultiPoint',
    'LineString',
    'MultiLineString',
    'Polygon',
    'MultiPolygon',
    'GeometryCollection'
  ];

  constructor() {
    super({
      inputSchema: ValidateGeojsonInputSchema,
      outputSchema: ValidateGeojsonOutputSchema
    });
  }

  protected async execute(
    input: z.infer<typeof ValidateGeojsonInputSchema>
  ): Promise<CallToolResult> {
    try {
      let geojson: any;
      if (typeof input.geojson === 'string') {
        try {
          geojson = JSON.parse(input.geojson);
        } catch (parseError) {
          return {
            content: [
              {
                type: 'text',
                text: `Error parsing GeoJSON: ${(parseError as Error).message}`
              }
            ],
            isError: true
          };
        }
      } else {
        geojson = input.geojson;
      }

      const errors: GeojsonIssue[] = [];
      const warnings: GeojsonIssue[] = [];
      const info: GeojsonIssue[] = [];

      // Validate structure
      this.validateStructure(geojson, errors, warnings, info);

      // Calculate statistics
      const statistics = this.calculateStatistics(geojson);

      const result: ValidateGeojsonOutput = {
        valid: errors.length === 0,
        errors,
        warnings,
        info,
        statistics
      };

      const validatedResult = ValidateGeojsonOutputSchema.parse(result);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validatedResult, null, 2)
          }
        ],
        structuredContent: validatedResult,
        isError: false
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log('error', `${this.name}: ${errorMessage}`);

      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true
      };
    }
  }

  private validateStructure(
    geojson: any,
    errors: GeojsonIssue[],
    warnings: GeojsonIssue[],
    info: GeojsonIssue[]
  ): void {
    // Check type
    if (!geojson.type) {
      errors.push({
        severity: 'error',
        message: 'Missing required "type" property',
        path: 'type',
        suggestion: 'Add a "type" property with a valid GeoJSON type'
      });
      return;
    }

    if (!ValidateGeojsonTool.VALID_GEOJSON_TYPES.includes(geojson.type)) {
      errors.push({
        severity: 'error',
        message: `Invalid GeoJSON type: "${geojson.type}"`,
        path: 'type',
        suggestion: `Valid types are: ${ValidateGeojsonTool.VALID_GEOJSON_TYPES.join(', ')}`
      });
      return;
    }

    // Type-specific validation
    switch (geojson.type) {
      case 'Feature':
        this.validateFeature(geojson, errors, warnings, info);
        break;
      case 'FeatureCollection':
        this.validateFeatureCollection(geojson, errors, warnings, info);
        break;
      case 'GeometryCollection':
        this.validateGeometryCollection(geojson, errors, warnings, info);
        break;
      default:
        // Geometry types
        this.validateGeometry(geojson, errors, warnings, info);
        break;
    }
  }

  private validateFeature(
    feature: any,
    errors: GeojsonIssue[],
    warnings: GeojsonIssue[],
    _info: GeojsonIssue[]
  ): void {
    if (!feature.geometry && feature.geometry !== null) {
      errors.push({
        severity: 'error',
        message: 'Feature missing "geometry" property',
        path: 'geometry',
        suggestion: 'Add a "geometry" object or set to null'
      });
    } else if (feature.geometry !== null) {
      this.validateGeometry(
        feature.geometry,
        errors,
        warnings,
        _info,
        'geometry'
      );
    }

    if (!feature.properties && feature.properties !== null) {
      warnings.push({
        severity: 'warning',
        message: 'Feature missing "properties" property',
        path: 'properties',
        suggestion: 'Add a "properties" object (can be empty) or set to null'
      });
    }
  }

  private validateFeatureCollection(
    fc: any,
    errors: GeojsonIssue[],
    warnings: GeojsonIssue[],
    info: GeojsonIssue[]
  ): void {
    if (!fc.features) {
      errors.push({
        severity: 'error',
        message: 'FeatureCollection missing "features" array',
        path: 'features',
        suggestion: 'Add a "features" array'
      });
      return;
    }

    if (!Array.isArray(fc.features)) {
      errors.push({
        severity: 'error',
        message: '"features" must be an array',
        path: 'features'
      });
      return;
    }

    if (fc.features.length === 0) {
      warnings.push({
        severity: 'warning',
        message: 'FeatureCollection has no features',
        path: 'features',
        suggestion: 'Add at least one feature'
      });
    }

    fc.features.forEach((feature: any, index: number) => {
      if (feature.type !== 'Feature') {
        errors.push({
          severity: 'error',
          message: `Feature at index ${index} has invalid type "${feature.type}"`,
          path: `features[${index}].type`,
          suggestion: 'Each item in features array must have type "Feature"'
        });
      } else {
        this.validateFeature(feature, errors, warnings, info);
      }
    });
  }

  private validateGeometry(
    geometry: any,
    errors: GeojsonIssue[],
    warnings: GeojsonIssue[],
    _info: GeojsonIssue[],
    path: string = ''
  ): void {
    if (!geometry.type) {
      errors.push({
        severity: 'error',
        message: 'Geometry missing "type" property',
        path: path ? `${path}.type` : 'type',
        suggestion: 'Add a geometry "type" property'
      });
      return;
    }

    if (!ValidateGeojsonTool.GEOMETRY_TYPES.includes(geometry.type)) {
      errors.push({
        severity: 'error',
        message: `Invalid geometry type: "${geometry.type}"`,
        path: path ? `${path}.type` : 'type',
        suggestion: `Valid geometry types are: ${ValidateGeojsonTool.GEOMETRY_TYPES.join(', ')}`
      });
      return;
    }

    if (!geometry.coordinates && geometry.type !== 'GeometryCollection') {
      errors.push({
        severity: 'error',
        message: `Geometry of type "${geometry.type}" missing "coordinates" property`,
        path: path ? `${path}.coordinates` : 'coordinates',
        suggestion: 'Add a "coordinates" array'
      });
      return;
    }

    // Validate coordinates
    if (geometry.type !== 'GeometryCollection') {
      this.validateCoordinates(
        geometry.type,
        geometry.coordinates,
        errors,
        warnings,
        path
      );
    }
  }

  private validateGeometryCollection(
    gc: any,
    errors: GeojsonIssue[],
    warnings: GeojsonIssue[],
    info: GeojsonIssue[]
  ): void {
    if (!gc.geometries) {
      errors.push({
        severity: 'error',
        message: 'GeometryCollection missing "geometries" array',
        path: 'geometries',
        suggestion: 'Add a "geometries" array'
      });
      return;
    }

    if (!Array.isArray(gc.geometries)) {
      errors.push({
        severity: 'error',
        message: '"geometries" must be an array',
        path: 'geometries'
      });
      return;
    }

    gc.geometries.forEach((geometry: any, index: number) => {
      this.validateGeometry(
        geometry,
        errors,
        warnings,
        info,
        `geometries[${index}]`
      );
    });
  }

  private validateCoordinates(
    type: string,
    coordinates: any,
    errors: GeojsonIssue[],
    warnings: GeojsonIssue[],
    path: string
  ): void {
    const coordPath = path ? `${path}.coordinates` : 'coordinates';

    if (!Array.isArray(coordinates)) {
      errors.push({
        severity: 'error',
        message: 'Coordinates must be an array',
        path: coordPath
      });
      return;
    }

    switch (type) {
      case 'Point':
        this.validatePosition(coordinates, errors, warnings, coordPath);
        break;
      case 'MultiPoint':
      case 'LineString':
        if (coordinates.length === 0) {
          errors.push({
            severity: 'error',
            message: `${type} coordinates array is empty`,
            path: coordPath
          });
        } else {
          coordinates.forEach((pos: any, i: number) => {
            this.validatePosition(pos, errors, warnings, `${coordPath}[${i}]`);
          });
        }
        if (type === 'LineString' && coordinates.length < 2) {
          errors.push({
            severity: 'error',
            message: 'LineString must have at least 2 positions',
            path: coordPath,
            suggestion: 'Add more coordinate positions'
          });
        }
        break;
      case 'Polygon':
      case 'MultiLineString':
        if (coordinates.length === 0) {
          errors.push({
            severity: 'error',
            message: `${type} coordinates array is empty`,
            path: coordPath
          });
        } else {
          coordinates.forEach((ring: any, i: number) => {
            if (
              !Array.isArray(ring) ||
              ring.length < (type === 'Polygon' ? 4 : 2)
            ) {
              errors.push({
                severity: 'error',
                message:
                  type === 'Polygon'
                    ? 'Polygon ring must have at least 4 positions'
                    : 'LineString must have at least 2 positions',
                path: `${coordPath}[${i}]`
              });
            } else {
              ring.forEach((pos: any, j: number) => {
                this.validatePosition(
                  pos,
                  errors,
                  warnings,
                  `${coordPath}[${i}][${j}]`
                );
              });
              // Check ring closure for Polygon
              if (type === 'Polygon') {
                const first = ring[0];
                const last = ring[ring.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) {
                  warnings.push({
                    severity: 'warning',
                    message: 'Polygon ring is not closed',
                    path: `${coordPath}[${i}]`,
                    suggestion: 'First and last positions should be identical'
                  });
                }
              }
            }
          });
        }
        break;
      case 'MultiPolygon':
        coordinates.forEach((polygon: any, i: number) => {
          if (!Array.isArray(polygon)) {
            errors.push({
              severity: 'error',
              message: 'MultiPolygon coordinate must be an array of rings',
              path: `${coordPath}[${i}]`
            });
          }
        });
        break;
    }
  }

  private validatePosition(
    position: any,
    errors: GeojsonIssue[],
    warnings: GeojsonIssue[],
    path: string
  ): void {
    if (!Array.isArray(position)) {
      errors.push({
        severity: 'error',
        message: 'Position must be an array',
        path
      });
      return;
    }

    if (position.length < 2) {
      errors.push({
        severity: 'error',
        message: 'Position must have at least 2 elements [longitude, latitude]',
        path,
        suggestion: 'Add longitude and latitude values'
      });
      return;
    }

    const [lon, lat] = position;

    if (typeof lon !== 'number' || typeof lat !== 'number') {
      errors.push({
        severity: 'error',
        message: 'Position coordinates must be numbers',
        path
      });
      return;
    }

    if (lon < -180 || lon > 180) {
      warnings.push({
        severity: 'warning',
        message: `Longitude ${lon} is outside valid range [-180, 180]`,
        path,
        suggestion: 'Ensure longitude is between -180 and 180'
      });
    }

    if (lat < -90 || lat > 90) {
      warnings.push({
        severity: 'warning',
        message: `Latitude ${lat} is outside valid range [-90, 90]`,
        path,
        suggestion: 'Ensure latitude is between -90 and 90'
      });
    }
  }

  private calculateStatistics(geojson: any): {
    type: string;
    featureCount?: number;
    geometryTypes: string[];
    bbox?: number[];
  } {
    const geometryTypes = new Set<string>();
    let featureCount: number | undefined;
    let minLon = Infinity,
      minLat = Infinity,
      maxLon = -Infinity,
      maxLat = -Infinity;
    let hasCoords = false;

    const collectGeometryType = (geometry: any) => {
      if (geometry && geometry.type) {
        geometryTypes.add(geometry.type);
      }
    };

    const updateBbox = (coords: any) => {
      if (Array.isArray(coords) && coords.length >= 2) {
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          // Position
          const [lon, lat] = coords;
          minLon = Math.min(minLon, lon);
          maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          hasCoords = true;
        } else {
          // Array of positions or deeper
          coords.forEach(updateBbox);
        }
      }
    };

    if (geojson.type === 'FeatureCollection') {
      featureCount = geojson.features?.length || 0;
      geojson.features?.forEach((feature: any) => {
        if (feature.geometry) {
          collectGeometryType(feature.geometry);
          if (feature.geometry.coordinates) {
            updateBbox(feature.geometry.coordinates);
          }
        }
      });
    } else if (geojson.type === 'Feature') {
      featureCount = 1;
      if (geojson.geometry) {
        collectGeometryType(geojson.geometry);
        if (geojson.geometry.coordinates) {
          updateBbox(geojson.geometry.coordinates);
        }
      }
    } else if (geojson.type === 'GeometryCollection') {
      geojson.geometries?.forEach((geometry: any) => {
        collectGeometryType(geometry);
        if (geometry.coordinates) {
          updateBbox(geometry.coordinates);
        }
      });
    } else {
      // Geometry type
      collectGeometryType(geojson);
      if (geojson.coordinates) {
        updateBbox(geojson.coordinates);
      }
    }

    return {
      type: geojson.type || 'unknown',
      featureCount,
      geometryTypes: Array.from(geometryTypes),
      bbox: hasCoords ? [minLon, minLat, maxLon, maxLat] : undefined
    };
  }
}
