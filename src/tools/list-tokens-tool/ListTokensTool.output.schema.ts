// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const TokenObjectSchema = z.object({
  id: z.string().describe('Token ID'),
  name: z.string().describe('Token name'),
  scopes: z.array(z.string()).describe('Array of scopes assigned to the token'),
  token: z.string().describe('The actual token string'),
  created: z.string().describe('ISO 8601 creation timestamp'),
  modified: z.string().describe('ISO 8601 last modified timestamp'),
  usage: z.string().describe('Token usage type, e.g. pk or sk'),
  default: z.boolean().describe('Whether this is the default token'),
  note: z.string().optional().describe('Optional note or description'),
  allowedUrls: z.array(z.string()).optional().describe('Array of allowed URLs'),
  expires: z.string().optional().describe('Expiration time in ISO 8601 format')
});

export const ListTokensOutputSchema = z.object({
  tokens: z.array(TokenObjectSchema),
  count: z.number().describe('Total number of tokens returned'),
  next_start: z.string().optional().describe('Pagination token for next page')
});

export type ListTokensOutput = z.infer<typeof ListTokensOutputSchema>;
export type TokenObject = z.infer<typeof TokenObjectSchema>;
