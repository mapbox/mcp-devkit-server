// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const CoordinateConversionOutputSchema = z.object({
  input: z.array(z.number()).length(2).describe('Input coordinates'),
  output: z.array(z.number()).length(2).describe('Converted coordinates'),
  from: z.enum(['wgs84', 'epsg3857']).describe('Source coordinate system'),
  to: z.enum(['wgs84', 'epsg3857']).describe('Target coordinate system'),
  message: z.string().optional().describe('Conversion status message')
});

export type CoordinateConversionOutput = z.infer<
  typeof CoordinateConversionOutputSchema
>;
