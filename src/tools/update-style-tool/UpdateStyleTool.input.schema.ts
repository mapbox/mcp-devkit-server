// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// Simplified Mapbox Style Input Schema for updates
// Only defines essential fields. Additional properties are accepted via .passthrough()
export const MapboxStyleInputSchema = z
  .object({
    name: z.string().optional().describe('Human-readable name for the style'),
    version: z.literal(8).optional().describe('Style specification version'),
    sources: z
      .record(z.any())
      .optional()
      .describe('Data source specifications'),
    layers: z.array(z.any()).optional().describe('Layers in draw order')
  })
  .passthrough()
  .describe(
    'Mapbox style properties to update. Accepts standard Mapbox Style Specification properties.'
  );

export const UpdateStyleInputSchema = z.object({
  styleId: z.string().describe('Style ID to update'),
  name: z.string().optional().describe('New name for the style'),
  style: MapboxStyleInputSchema.optional().describe(
    'Updated Mapbox style specification object'
  )
});

export type UpdateStyleInput = z.infer<typeof UpdateStyleInputSchema>;
