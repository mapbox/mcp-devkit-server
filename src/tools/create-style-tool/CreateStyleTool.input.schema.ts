// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// INPUT Schema - Accepts a complete Mapbox Style Specification as a generic object
// This avoids complex schemas with .passthrough() that break some MCP clients (Cursor + OpenAI)
// Full spec: https://docs.mapbox.com/mapbox-gl-js/style-spec/
export const CreateStyleInputSchema = z.object({
  name: z.string().describe('Human-readable name for the style'),
  style: z
    .record(z.string(), z.any())
    .describe(
      'Complete Mapbox Style Specification object. Must include: version (8), sources, layers. ' +
        'For a Mapbox Standard style — the default choice for new styles — also include imports: ' +
        '[{ id: "basemap", url: "mapbox://styles/mapbox/standard", config: { ... } }], with sources ' +
        'and layers holding only your own data. The basemap arrives through the import, so do not ' +
        'hand-author a background layer or copy basemap layers in. Omitting imports is what makes a ' +
        'Classic style, which has no config surface and no slots. Prefer generating this object with ' +
        'style_builder_tool, which handles imports, slots and emissive strength for you. ' +
        'Optional: sprite, glyphs, center, zoom, bearing, pitch, metadata, etc. ' +
        'See https://docs.mapbox.com/mapbox-gl-js/style-spec/'
    )
});

// Type exports
export type CreateStyleInput = z.infer<typeof CreateStyleInputSchema>;
