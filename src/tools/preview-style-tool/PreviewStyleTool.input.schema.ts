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
      'Existing Mapbox public token (must start with pk.* and have styles:read permission). Required when share is true, to build a durable link with a token you control. Optional otherwise — if omitted, a short-lived (~1 hour) preview token is generated automatically, so no existing token is needed for a quick inline look.'
    ),
  share: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Set to true to build a durable, shareable preview link using accessToken (required together with share). Defaults to false: generates a short-lived preview token automatically for viewing the style right now — the returned URL expires in about an hour and is not meant to be bookmarked or shared with others.'
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
