// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const BoundingBoxOutputSchema = z.object({
  bbox: z
    .tuple([
      z.number().describe('minX (west longitude)'),
      z.number().describe('minY (south latitude)'),
      z.number().describe('maxX (east longitude)'),
      z.number().describe('maxY (north latitude)')
    ])
    .describe('Bounding box as [minX, minY, maxX, maxY]'),
  message: z.string().optional().describe('Status or error message')
});

export type BoundingBoxOutput = z.infer<typeof BoundingBoxOutputSchema>;
