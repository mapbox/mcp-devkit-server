import { z } from 'zod';
import {
  latitudeSchema,
  longitudeSchema,
  limitSchema,
  stringSchema,
  numberSchema,
  booleanSchema,
  enumSchema
} from '../../schemas/common.js';

export const TilequerySchema = z.object({
  tilesetId: stringSchema(
    'Tileset ID to query (default: mapbox.mapbox-streets-v8)',
    true
  ).default('mapbox.mapbox-streets-v8'),
  longitude: longitudeSchema('Longitude coordinate to query'),
  latitude: latitudeSchema('Latitude coordinate to query'),
  radius: numberSchema(
    0,
    undefined,
    'Radius in meters to search for features (default: 0)',
    true
  ).default(0),
  limit: limitSchema(
    1,
    50,
    'Number of features to return (1-50, default: 5)'
  ).default(5),
  dedupe: booleanSchema(
    'Whether to deduplicate identical features (default: true)',
    true,
    true
  ),
  geometry: enumSchema(
    ['polygon', 'linestring', 'point'],
    'Filter results by geometry type',
    true
  ),
  layers: z
    .array(z.string())
    .optional()
    .describe('Specific layer names to query from the tileset'),
  bands: z
    .array(z.string())
    .optional()
    .describe('Specific band names to query (for rasterarray tilesets)')
});

export type TilequeryInput = z.infer<typeof TilequerySchema>;
