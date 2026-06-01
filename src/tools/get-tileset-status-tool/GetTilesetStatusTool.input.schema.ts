// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const GetTilesetStatusSchema = z.object({
  tileset_id: z.string().min(1).describe('Tileset id in `username.id` form.'),
  job_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Specific publish job id to fetch. If omitted, returns the tileset's most recent job status summary."
    )
});

export type GetTilesetStatusInput = z.infer<typeof GetTilesetStatusSchema>;
