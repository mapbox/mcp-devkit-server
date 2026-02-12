import { z } from 'zod';

export const ValidateApiRequestInputSchema = z.object({
  api: z
    .string()
    .describe(
      'API name to validate against (e.g., "geocoding", "styles", "tokens")'
    ),
  operation: z
    .string()
    .describe(
      'Operation ID to validate (e.g., "forward-geocode", "create-style")'
    ),
  parameters: z
    .object({
      path: z
        .record(z.any())
        .optional()
        .describe('Path parameters as key-value pairs'),
      query: z
        .record(z.any())
        .optional()
        .describe('Query parameters as key-value pairs'),
      body: z
        .record(z.any())
        .optional()
        .describe('Body parameters as key-value pairs')
    })
    .describe('Request parameters to validate'),
  tokenScopes: z
    .array(z.string())
    .optional()
    .describe(
      'Token scopes to validate (optional). If provided, checks if token has required scopes for the operation.'
    )
});

export type ValidateApiRequestInput = z.infer<
  typeof ValidateApiRequestInputSchema
>;
