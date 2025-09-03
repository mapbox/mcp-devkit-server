import { z } from 'zod';
import { stringSchema } from '../../schemas/common.js';

export const RetrieveStyleSchema = z.object({
  styleId: stringSchema('Style ID to retrieve')
});

export type RetrieveStyleInput = z.infer<typeof RetrieveStyleSchema>;
