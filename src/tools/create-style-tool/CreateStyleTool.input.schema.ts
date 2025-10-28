// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// INPUT Schema - Accepts a complete Mapbox Style Specification as a generic object
// This avoids complex schemas with .passthrough() that break some MCP clients (Cursor + OpenAI)
// Full spec: https://docs.mapbox.com/mapbox-gl-js/style-spec/
export const CreateStyleInputSchema = z.object({
  name: z.string().describe('Human-readable name for the style'),
  style: z
    .record(z.any())
    .describe(
      'Complete Mapbox Style Specification object. Must include: version (8), sources, layers. Optional: sprite, glyphs, center, zoom, bearing, pitch, metadata, etc. See https://docs.mapbox.com/mapbox-gl-js/style-spec/'
    )
});

// Type exports
export type CreateStyleInput = z.infer<typeof CreateStyleInputSchema>;
