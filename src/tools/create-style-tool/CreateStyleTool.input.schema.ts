// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// INPUT Schema - Accepts a complete Mapbox Style Specification
// Uses .passthrough() to allow additional properties while documenting key fields
// Full spec: https://docs.mapbox.com/mapbox-gl-js/style-spec/
export const CreateStyleInputSchema = z.object({
  name: z.string().describe('Human-readable name for the style'),
  style: z
    .object({
      version: z.literal(8).describe('Style specification version (must be 8)'),
      name: z.string().optional().describe('Style name'),
      sources: z
        .object({})
        .passthrough()
        .describe(
          'Data sources (e.g., vector tiles, raster tiles, GeoJSON). Object with source names as keys.'
        ),
      layers: z
        .array(z.object({}).passthrough())
        .describe(
          'Rendering layers that use the sources. Array of layer objects.'
        ),
      sprite: z.string().optional().describe('Sprite sheet URL'),
      glyphs: z.string().optional().describe('Font glyphs URL template'),
      metadata: z
        .object({})
        .passthrough()
        .optional()
        .describe('Arbitrary metadata'),
      center: z
        .array(z.number())
        .optional()
        .describe('Default map center [lng, lat]'),
      zoom: z.number().optional().describe('Default zoom level'),
      bearing: z.number().optional().describe('Default bearing (rotation)'),
      pitch: z.number().optional().describe('Default pitch (tilt)')
    })
    .passthrough()
    .describe('Complete Mapbox Style Specification object')
});

// Type exports
export type CreateStyleInput = z.infer<typeof CreateStyleInputSchema>;
