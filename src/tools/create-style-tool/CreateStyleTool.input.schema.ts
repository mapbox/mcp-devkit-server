// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// INPUT Schema - Simplified schema for creating styles
// Only defines the essential required fields. Additional Mapbox Style Specification
// properties (sources, layers, sprite, glyphs, etc.) are allowed via .passthrough()
// Full spec: https://docs.mapbox.com/mapbox-gl-js/style-spec/
export const MapboxStyleInputSchema = z
  .object({
    name: z.string().describe('Human-readable name for the style (REQUIRED)'),
    version: z
      .literal(8)
      .describe('Style specification version number. Must be 8'),
    // Note: The Mapbox API requires at minimum 'version', 'name', 'sources', and 'layers'.
    // We only validate 'name' and 'version' here. Other fields like sources, layers, sprite,
    // glyphs, center, zoom, etc. are passed through without explicit validation to avoid
    // overwhelming clients with the full 18+ field schema.
    sources: z
      .record(z.any())
      .optional()
      .describe('Data source specifications'),
    layers: z.array(z.any()).optional().describe('Layers in draw order')
  })
  .passthrough()
  .describe(
    'Mapbox style input. Accepts standard Mapbox Style Specification properties. Only key fields are validated; additional properties (center, zoom, bearing, pitch, sprite, glyphs, metadata, etc.) are accepted but not explicitly defined to keep schema manageable.'
  );

// Type exports
export type MapboxStyleInput = z.infer<typeof MapboxStyleInputSchema>;
