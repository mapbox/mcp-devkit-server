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
    .optional()
    .describe(
      'Mapbox public access token (must start with pk.* and have styles:read permission). If not provided, will attempt to find an existing public token from your account'
    )
});

export type StyleComparisonInput = z.infer<typeof StyleComparisonSchema>;
