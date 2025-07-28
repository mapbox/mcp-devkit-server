import { z } from 'zod';

export const ListStylesSchema = z.object({
  limit: z
    .number()
    .optional()
    .describe('Maximum number of styles to return (default: no limit)'),
  start: z.string().optional().describe('Start token for pagination')
});

export type ListStylesInput = z.infer<typeof ListStylesSchema>;
