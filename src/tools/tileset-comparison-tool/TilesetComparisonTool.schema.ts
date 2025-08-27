import { z } from 'zod';

export const TilesetComparisonSchema = z.object({
  before: z
    .string()
    .describe(
      'Mapbox style for the "before" side. Accepts: full style URL (mapbox://styles/username/styleId), username/styleId format, or just styleId if using your own styles'
    ),
  after: z
    .string()
    .describe(
      'Mapbox style for the "after" side. Accepts: full style URL (mapbox://styles/username/styleId), username/styleId format, or just styleId if using your own styles'
    ),
  accessToken: z
    .string()
    .optional()
    .describe(
      'Mapbox public access token (must start with pk.*). Secret tokens (sk.*) cannot be used in browser-based HTML. If not provided, will attempt to find an existing public token from your account'
    ),
  title: z.string().optional().describe('Title for the comparison view'),
  center: z
    .array(z.number())
    .length(2)
    .optional()
    .describe('Initial map center as [longitude, latitude]'),
  zoom: z.number().optional().describe('Initial zoom level'),
  bearing: z
    .number()
    .optional()
    .describe('Initial bearing (rotation) of the map in degrees'),
  pitch: z
    .number()
    .optional()
    .describe('Initial pitch (tilt) of the map in degrees')
});

export type TilesetComparisonInput = z.infer<typeof TilesetComparisonSchema>;
