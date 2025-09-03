import { z } from 'zod';
import { stringSchema } from '../../schemas/common.js';

export const DeleteStyleSchema = z.object({
  styleId: stringSchema('Style ID to delete')
});

export type DeleteStyleInput = z.infer<typeof DeleteStyleSchema>;
