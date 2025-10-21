import { z } from 'zod';

export const DeleteStyleSchema = z.object({
  styleId: z.string().describe('Style ID to delete')
});

export type DeleteStyleInput = z.infer<typeof DeleteStyleSchema>;
