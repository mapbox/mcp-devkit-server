import { z } from 'zod';

export const PreviewStyleSchema = z.object({
  styleId: z.string().describe('Style ID to preview'),
  accessToken: z
    .string()
    .startsWith(
      'pk.',
      'Invalid access token. Only public tokens (starting with pk.*) are allowed for preview URLs. Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs.'
    )
    .optional()
    .describe(
      'Mapbox public access token (optional). If not provided, you will be prompted to provide, create, or auto-create a preview token. Must start with pk.* and have styles:read permission. Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs.'
    ),
  useCustomToken: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Force token selection dialog even if a preview token is already stored for this session. Useful when you want to use a different token.'
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
