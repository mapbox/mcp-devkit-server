// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// Coordinate pair schema
const CoordinatesSchema = z.tuple([z.number(), z.number()]);

// Vector Tileset Feature Schema
const VectorTilequeryFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.union([z.string(), z.number()]),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: CoordinatesSchema
  }),
  properties: z
    .object({
      tilequery: z.object({
        distance: z
          .number()
          .describe(
            'Approximate surface distance from feature to queried point, in meters'
          ),
        geometry: z
          .enum(['point', 'linestring', 'polygon'])
          .describe('Original geometry type of the feature'),
        layer: z
          .string()
          .describe('The vector tile layer of the feature result')
      })
    })
    .passthrough() // Allow additional properties from the original feature
});

// Rasterarray Tileset Feature Schema
const RasterarrayTilequeryFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.null(),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: CoordinatesSchema
  }),
  properties: z.object({
    tilequery: z.object({
      layer: z.string().describe('The layer that the feature belongs to'),
      band: z.string().describe('The band that the feature belongs to'),
      zoom: z
        .number()
        .describe('The maxzoom level at which the point value was extracted'),
      units: z.string().describe('The unit of measurement for the point value')
    }),
    val: z.number().describe('Point value at the requested location')
  })
});

// Union of both feature types
const TilequeryFeatureSchema = z.union([
  VectorTilequeryFeatureSchema,
  RasterarrayTilequeryFeatureSchema
]);

// Main Tilequery Response Schema
export const TilequeryResponseSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(TilequeryFeatureSchema)
});

// Type exports inferred from Zod schemas
export type VectorTilequeryFeature = z.infer<
  typeof VectorTilequeryFeatureSchema
>;
export type RasterarrayTilequeryFeature = z.infer<
  typeof RasterarrayTilequeryFeatureSchema
>;
export type TilequeryFeature = z.infer<typeof TilequeryFeatureSchema>;
export type TilequeryResponse = z.infer<typeof TilequeryResponseSchema>;
