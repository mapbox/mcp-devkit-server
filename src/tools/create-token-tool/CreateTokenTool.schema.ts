import { z } from 'zod';
import { stringSchema, arraySchema } from '../../schemas/common.js';

// Public scopes that can be used with public tokens
const PUBLIC_SCOPES = [
  'styles:tiles',
  'styles:read',
  'fonts:read',
  'datasets:read',
  'vision:read'
] as const;

// Secret scopes that can only be used with secret tokens
const SECRET_SCOPES = [
  'scopes:list',
  'map:read',
  'map:write',
  'user:read',
  'user:write',
  'uploads:read',
  'uploads:list',
  'uploads:write',
  'fonts:list',
  'fonts:write',
  'styles:write',
  'styles:list',
  'styles:download',
  'styles:protect',
  'tokens:read',
  'tokens:write',
  'datasets:list',
  'datasets:write',
  'tilesets:list',
  'tilesets:read',
  'tilesets:write',
  'downloads:read',
  'vision:download',
  'navigation:download',
  'offline:read',
  'offline:write',
  'user-feedback:read'
] as const;

// All valid scopes
const ALL_SCOPES = [...PUBLIC_SCOPES, ...SECRET_SCOPES] as const;

export const CreateTokenSchema = z.object({
  note: stringSchema('Description of the token'),
  scopes: arraySchema(
    z.enum(ALL_SCOPES),
    'Array of scopes/permissions for the token. PUBLIC scopes (styles:tiles, styles:read, fonts:read, datasets:read, vision:read) create a public token. SECRET scopes (all others) create a secret token. If any secret scope is included, the entire token becomes secret and will only be visible once upon creation.'
  ),
  allowedUrls: arraySchema(
    z.string(),
    'Optional array of URLs where the token can be used (max 100)',
    true
  ),
  expires: stringSchema(
    'Optional expiration time in ISO 8601 format (maximum 1 hour in the future)',
    true
  )
});

export type CreateTokenInput = z.infer<typeof CreateTokenSchema>;

// Export scopes for potential reuse
export { PUBLIC_SCOPES, SECRET_SCOPES, ALL_SCOPES };
