import { z } from 'zod';
import { stringSchema, mapboxStyleSchema } from '../../schemas/common.js';

export const UpdateStyleSchema = z.object({
  styleId: stringSchema('Style ID to update'),
  name: stringSchema('New name for the style', true),
  style: mapboxStyleSchema('Updated Mapbox style specification object', true)
});

export type UpdateStyleInput = z.infer<typeof UpdateStyleSchema>;
