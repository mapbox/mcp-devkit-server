import { z } from 'zod';

export const ListTokensSchema = z.object({
  default: z
    .boolean()
    .optional()
    .describe('Filter to show only the default public token'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of tokens to return (1-100)'),
  sortby: z
    .enum(['created', 'modified'])
    .optional()
    .describe('Sort tokens by created or modified timestamp'),
  start: z.string().optional().describe('Token ID to start pagination from'),
  usage: z.enum(['pk']).optional().describe('Filter by token type: pk (public)')
});

export type ListTokensInput = z.infer<typeof ListTokensSchema>;
