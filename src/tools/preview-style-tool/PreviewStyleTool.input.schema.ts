import { z } from 'zod';
import { styleIdSchema } from '../shared/styleId.schema.js';

export const PreviewStyleSchema = z.object({
  styleId: styleIdSchema.describe('Style ID to preview'),
  accessToken: z
    .string()
    .startsWith(
      'pk.',
      'Invalid access token. Only public tokens (starting with pk.*) are allowed for preview URLs. Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs.'
    )
    .optional()
    .describe(
      'Existing Mapbox public token (must start with pk.* and have styles:read permission). Optional — if omitted, a short-lived (~1 hour) preview token is generated automatically, so no existing token is needed. Pass your own token when you want a preview URL that keeps working after that hour.'
    ),
  title: z
    .boolean()
    .optional()
    .default(false)
    .describe('Show title in the preview'),
  zoomwheel: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable zoom wheel control')
});

export type PreviewStyleInput = z.infer<typeof PreviewStyleSchema>;
