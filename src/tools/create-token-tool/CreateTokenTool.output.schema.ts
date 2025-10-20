// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const CreateTokenOutputSchema = z.object({
  id: z.string().describe("The token's unique identifier"),
  usage: z
    .enum(['pk', 'sk', 'tk'])
    .describe('Token usage type: pk (public), sk (secret), or tk (temporary)'),
  client: z.string().describe('The client for the token'),
  default: z.boolean().describe('Whether this is the default token'),
  scopes: z.array(z.string()).describe('Array of scopes granted to the token'),
  note: z
    .string()
    .nullable()
    .describe('Human-readable description of the token'),
  created: z.string().describe('ISO 8601 creation timestamp'),
  modified: z.string().describe('ISO 8601 last modified timestamp'),
  allowedUrls: z
    .array(z.string())
    .optional()
    .describe('URLs that the token is restricted to'),
  token: z.string().describe('The actual access token string'),
  expires: z
    .string()
    .optional()
    .describe('Expiration time in ISO 8601 format (temporary tokens only)')
});

export type CreateTokenOutput = z.infer<typeof CreateTokenOutputSchema>;
