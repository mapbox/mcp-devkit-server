import { z } from 'zod';
import { styleIdSchema } from '../shared/styleId.schema.js';

export const DeleteStyleSchema = z.object({
  styleId: styleIdSchema.describe('Style ID to delete')
});

export type DeleteStyleInput = z.infer<typeof DeleteStyleSchema>;
