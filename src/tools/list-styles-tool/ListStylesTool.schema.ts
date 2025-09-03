import { z } from 'zod';
import { limitSchema, stringSchema } from '../../schemas/common.js';

export const ListStylesSchema = z.object({
  limit: limitSchema(
    1,
    500,
    'Maximum number of styles to return (recommended: 5-10 to avoid token limits, default: no limit)'
  ),
  start: stringSchema(
    'Start token for pagination (use the "start" value from previous response)',
    true
  )
});

export type ListStylesInput = z.infer<typeof ListStylesSchema>;
