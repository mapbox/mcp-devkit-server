import { z } from 'zod';

export const RetrieveStyleSchema = z.object({
  styleId: z.string().describe('Style ID to retrieve')
});

export type RetrieveStyleInput = z.infer<typeof RetrieveStyleSchema>;
