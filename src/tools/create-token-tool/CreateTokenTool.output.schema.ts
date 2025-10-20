// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const CreateTokenOutputSchema = z.object({
  id: z.string().describe('Token ID'),
  scopes: z.array(z.string()).describe('Array of scopes assigned to the token'),
  token: z.string().describe('The actual token string'),
  created: z.string().describe('ISO 8601 creation timestamp'),
  modified: z.string().describe('ISO 8601 last modified timestamp'),
  usage: z.string().describe('Token usage type, e.g. pk or sk'),
  default: z.boolean().describe('Whether this is the default token'),
  note: z.string().optional().describe('Optional note or description'),
  allowedUrls: z.array(z.string()).optional().describe('Array of allowed URLs'),
  expires: z.string().optional().describe('Expiration time in ISO 8601 format'),
  message: z.string().optional().describe('Status or error message')
});

export type CreateTokenOutput = z.infer<typeof CreateTokenOutputSchema>;
