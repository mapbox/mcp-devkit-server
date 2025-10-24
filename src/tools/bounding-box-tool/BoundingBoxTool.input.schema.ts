// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// Define a loose GeoJSON schema that accepts any valid GeoJSON structure
const GeoJSONSchema = z
  .object({
    type: z.string(),
    coordinates: z.any().optional(),
    geometry: z.any().optional(),
    properties: z.any().optional(),
    features: z.any().optional(),
    geometries: z.any().optional()
  })
  .passthrough();

export const BoundingBoxSchema = z.object({
  geojson: z
    .union([
      z.string().describe('GeoJSON content as a string'),
      GeoJSONSchema.describe('GeoJSON content as an object')
    ])
    .describe('GeoJSON content to calculate bounding box for')
});

export type BoundingBoxInput = z.infer<typeof BoundingBoxSchema>;
