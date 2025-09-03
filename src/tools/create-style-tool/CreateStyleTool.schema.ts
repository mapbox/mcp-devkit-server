import { z } from 'zod';
import { stringSchema, mapboxStyleSchema } from '../../schemas/common.js';

export const CreateStyleSchema = z.object({
  name: stringSchema('New name for the style'),
  style: mapboxStyleSchema()
});

export type CreateStyleInput = z.infer<typeof CreateStyleSchema>;
