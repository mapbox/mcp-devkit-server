// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// INPUT Schema - Accepts a complete Mapbox Style Specification as a generic object
// This avoids complex schemas with .passthrough() that break some MCP clients (Cursor + OpenAI)
export const UpdateStyleInputSchema = z.object({
  styleId: z.string().describe('Style ID to update'),
  name: z.string().optional().describe('New name for the style'),
  style: z
    .record(z.any())
    .optional()
    .describe(
      'Complete Mapbox Style Specification object to update. Must include: version (8), sources, layers. Optional: sprite, glyphs, center, zoom, bearing, pitch, metadata, etc. See https://docs.mapbox.com/mapbox-gl-js/style-spec/'
    )
});

export type UpdateStyleInput = z.infer<typeof UpdateStyleInputSchema>;
