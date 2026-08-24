// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const StyleComparisonSchema = z.object({
  before: z
    .string()
    .regex(
      /^(?:mapbox:\/\/styles\/)?[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?$/,
      'Invalid style format. Use mapbox://styles/username/styleId, username/styleId, or a styleId containing only letters, numbers, hyphens, and underscores.'
    )
    .describe(
      'Mapbox style for the "before" side. Accepts: full style URL (mapbox://styles/username/styleId), username/styleId format, or just styleId if using your own styles'
    ),
  after: z
    .string()
    .regex(
      /^(?:mapbox:\/\/styles\/)?[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)?$/,
      'Invalid style format. Use mapbox://styles/username/styleId, username/styleId, or a styleId containing only letters, numbers, hyphens, and underscores.'
    )
    .describe(
      'Mapbox style for the "after" side. Accepts: full style URL (mapbox://styles/username/styleId), username/styleId format, or just styleId if using your own styles'
    ),
  accessToken: z
    .string()
    .startsWith(
      'pk.',
      'Invalid token type. Style comparison requires a public token (pk.*) that can be used in browser URLs. Secret tokens (sk.*) cannot be exposed in client-side applications. Please provide a public token with styles:read permission.'
    )
    .optional()
    .describe(
      'Existing Mapbox public token (must start with pk.* and have styles:read permission). Required when share is true, to build the comparison link with a token you control. Optional otherwise — if omitted, a scoped preview token is generated automatically, so no existing token is needed for a quick inline comparison.'
    ),
  share: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Set to true to build the comparison link with an existing public token you provide via accessToken (required together with share) — use this for a link you intend to keep or share with someone else. Defaults to false: generates a scoped preview token automatically, tied to this comparison only and not tracked or named by you, so no existing token is needed for a quick look right now.'
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
