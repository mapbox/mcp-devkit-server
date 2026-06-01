// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const ListTilesetsSchema = z.object({
  type: z
    .enum(['raster', 'vector'])
    .optional()
    .describe('Filter tilesets by type: "raster" or "vector".'),
  visibility: z
    .enum(['public', 'private'])
    .optional()
    .describe('Filter tilesets by visibility.'),
  sortby: z
    .enum(['created', 'modified'])
    .optional()
    .describe('Sort tilesets by created or modified timestamp.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe('Maximum number of tilesets to return (1-500). Default 100.'),
  start: z
    .string()
    .optional()
    .describe(
      "Tileset id to start pagination from (from a prior response's Link header)."
    )
});

export type ListTilesetsInput = z.infer<typeof ListTilesetsSchema>;
