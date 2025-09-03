import { z } from 'zod';

export const ListStylesSchema = z.object({
  limit: z
    .number()
    .optional()
    .describe(
      'Maximum number of styles to return (recommended: 10-50 to avoid token limits, default: no limit)'
    ),
  start: z
    .string()
    .optional()
    .describe(
      'Start token for pagination (use the "start" value from previous response)'
    )
});

export type ListStylesInput = z.infer<typeof ListStylesSchema>;
