// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// Simplified GeoJSON schema for maximum MCP client compatibility
// Only accepts string input to avoid any potential issues with complex object types
export const GeojsonPreviewSchema = z.object({
  geojson: z
    .string()
    .describe(
      'GeoJSON data as a JSON string (e.g., {"type": "Point", "coordinates": [-122.4194, 37.7749]})'
    )
});

export type GeojsonPreviewInput = z.infer<typeof GeojsonPreviewSchema>;
