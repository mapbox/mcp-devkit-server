import { z } from 'zod';

// Valid scopes for public tokens
const SCOPES = [
  'styles:tiles',
  'styles:read',
  'fonts:read',
  'datasets:read',
  'vision:read'
] as const;

export const CreateTokenSchema = z.object({
  note: z.string().describe('Description of the token'),
  scopes: z
    .array(z.enum(SCOPES))
    .describe(
      'Array of scopes/permissions for the public token. Valid scopes: styles:tiles, styles:read, fonts:read, datasets:read, vision:read.'
    ),
  allowedUrls: z
    .array(z.string())
    .optional()
    .describe('Optional array of URLs where the token can be used (max 100)'),
  expires: z
    .string()
    .optional()
    .describe(
      'Optional expiration time in ISO 8601 format (maximum 1 hour in the future)'
    )
});

export type CreateTokenInput = z.infer<typeof CreateTokenSchema>;

// Export scopes for potential reuse
export { SCOPES };
