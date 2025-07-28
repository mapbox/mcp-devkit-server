import { z } from 'zod';

export const CoordinateConversionSchema = z.object({
  coordinates: z
    .array(z.number())
    .length(2)
    .describe('Array of two numbers representing coordinates'),
  from: z
    .enum(['wgs84', 'epsg3857'])
    .describe(
      'Source coordinate system: wgs84 (longitude/latitude) or epsg3857 (Web Mercator)'
    ),
  to: z
    .enum(['wgs84', 'epsg3857'])
    .describe(
      'Target coordinate system: wgs84 (longitude/latitude) or epsg3857 (Web Mercator)'
    )
});

export type CoordinateConversionInput = z.infer<
  typeof CoordinateConversionSchema
>;
