import { z } from 'zod';
import { styleIdSchema } from '../shared/styleId.schema.js';

export const RetrieveStyleSchema = z.object({
  styleId: styleIdSchema.describe('Style ID to retrieve')
});

export type RetrieveStyleInput = z.infer<typeof RetrieveStyleSchema>;
