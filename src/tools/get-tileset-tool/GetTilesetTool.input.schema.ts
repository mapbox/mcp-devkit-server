// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const GetTilesetSchema = z.object({
  tileset_id: z
    .string()
    .min(1)
    .describe(
      'Tileset id in `username.id` form (e.g. "examples.ckk4xyzc1014t17pmweqib5kf").'
    )
});

export type GetTilesetInput = z.infer<typeof GetTilesetSchema>;
