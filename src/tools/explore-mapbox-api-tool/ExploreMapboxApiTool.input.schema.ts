import { z } from 'zod';

export const ExploreMapboxApiInputSchema = z.object({
  api: z
    .string()
    .optional()
    .describe(
      'API name to explore: geocoding, styles, tokens, static-images, directions, tilequery, or feedback. Omit to list all APIs.'
    ),
  operation: z
    .string()
    .optional()
    .describe(
      'Specific operation ID within the API (e.g., "forward-geocode", "create-style"). Requires api parameter.'
    ),
  details: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Include full parameter descriptions and example request/response. Default: false.'
    )
});

export type ExploreMapboxApiInput = z.infer<typeof ExploreMapboxApiInputSchema>;
