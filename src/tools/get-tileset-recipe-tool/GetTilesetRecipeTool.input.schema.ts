// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const GetTilesetRecipeSchema = z.object({
  tileset_id: z.string().min(1).describe('Tileset id in `username.id` form.')
});

export type GetTilesetRecipeInput = z.infer<typeof GetTilesetRecipeSchema>;
