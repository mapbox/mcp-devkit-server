import { z } from 'zod';

export const StyleComparisonSchema = z.object({
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
    .describe(
      'Mapbox public access token (required, must start with pk.* and have styles:read permission). Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs. Please use a public token or create one with styles:read permission.'
    ),
  noCache: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Set to true if either style has been recently updated to bypass caching and see the latest changes immediately. Set to false (default) to use cached versions for better performance. Only use true during development when you need to see style updates.'
    ),
  zoom: z
    .number()
    .optional()
    .describe(
      'Initial zoom level for the map view (0-22). If provided along with latitude and longitude, sets the initial map position.'
    ),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe(
      'Latitude coordinate for the initial map center (-90 to 90). Must be provided together with longitude and zoom.'
    ),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe(
      'Longitude coordinate for the initial map center (-180 to 180). Must be provided together with latitude and zoom.'
    )
});

export type StyleComparisonInput = z.infer<typeof StyleComparisonSchema>;
