import { z } from 'zod';

export const TilequerySchema = z.object({
  tilesetId: z
    .string()
    .optional()
    .default('mapbox.mapbox-streets-v8')
    .describe('Tileset ID to query (default: mapbox.mapbox-streets-v8)'),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .describe('Longitude coordinate to query'),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .describe('Latitude coordinate to query'),
  radius: z
    .number()
    .min(0)
    .optional()
    .default(0)
    .describe('Radius in meters to search for features (default: 0)'),
  limit: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(5)
    .describe('Number of features to return (1-50, default: 5)'),
  dedupe: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to deduplicate identical features (default: true)'),
  geometry: z
    .enum(['polygon', 'linestring', 'point'])
    .optional()
    .describe('Filter results by geometry type'),
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
