import { z } from 'zod';

export const CreateStyleSchema = z.object({
  name: z.string().describe('Name for the new style'),
  style: z.record(z.any()).describe('Mapbox style specification object')
});

export type CreateStyleInput = z.infer<typeof CreateStyleSchema>;
