import { z } from 'zod';

export const UpdateStyleSchema = z.object({
  styleId: z.string().describe('Style ID to update'),
  name: z.string().optional().describe('New name for the style'),
  style: z
    .record(z.any())
    .optional()
    .describe('Updated Mapbox style specification object')
});

export type UpdateStyleInput = z.infer<typeof UpdateStyleSchema>;
