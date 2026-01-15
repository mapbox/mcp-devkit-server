// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

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
    .startsWith(
      'pk.',
      'Invalid token type. Style comparison requires a public token (pk.*) that can be used in browser URLs. Secret tokens (sk.*) cannot be exposed in client-side applications. Please provide a public token with styles:read permission.'
    )
    .optional()
    .describe(
      'Mapbox public access token (optional). If not provided, you will be prompted to provide, create, or auto-create a preview token via MCP elicitation (supported in MCP Inspector, Cursor, VS Code). For clients without elicitation support (Claude Desktop, Claude Code), provide this parameter directly. Must start with pk.* and have styles:read permission. Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs.'
    ),
  useCustomToken: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Force token selection dialog even if a preview token is already stored for this session. Useful when you want to use a different token.'
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
