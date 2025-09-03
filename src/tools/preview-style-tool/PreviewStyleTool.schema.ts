import { z } from 'zod';
import {
  publicAccessTokenSchema,
  stringSchema,
  booleanSchema
} from '../../schemas/common.js';

export const PreviewStyleSchema = z.object({
  styleId: stringSchema('Style ID to preview'),
  accessToken: publicAccessTokenSchema(),
  title: booleanSchema('Show title in the preview', true, false),
  zoomwheel: booleanSchema('Enable zoom wheel control', true, true)
});

export type PreviewStyleInput = z.infer<typeof PreviewStyleSchema>;
