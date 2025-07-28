import { z } from 'zod';

export const PreviewStyleSchema = z.object({
  styleId: z.string().describe('Style ID to preview'),
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
