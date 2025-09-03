import { z } from 'zod';
import {
  limitSchema,
  stringSchema,
  booleanSchema,
  enumSchema
} from '../../schemas/common.js';

export const ListTokensSchema = z.object({
  default: booleanSchema('Filter to show only the default public token', true),
  limit: limitSchema(1, 100, 'Maximum number of tokens to return (1-100)'),
  sortby: enumSchema(
    ['created', 'modified'],
    'Sort tokens by created or modified timestamp',
    true
  ),
  start: stringSchema('Token ID to start pagination from', true),
  usage: enumSchema(
    ['pk', 'sk', 'tk'],
    'Filter by token type: pk (public), sk (secret), tk (temporary)',
    true
  )
});

export type ListTokensInput = z.infer<typeof ListTokensSchema>;
