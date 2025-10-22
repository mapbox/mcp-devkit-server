import { z } from 'zod';

export const PreviewStyleSchema = z.object({
  styleId: z.string().describe('Style ID to preview'),
  accessToken: z
    .string()
    .startsWith(
      'pk.',
      'Invalid access token. Only public tokens (starting with pk.*) are allowed for preview URLs. Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs.'
    )
    .describe(
      'Mapbox public access token (required, must start with pk.* and have styles:read permission). Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs. Please use an existing public token or get one from list_tokens_tool or create one with create_token_tool with styles:read permission.'
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
