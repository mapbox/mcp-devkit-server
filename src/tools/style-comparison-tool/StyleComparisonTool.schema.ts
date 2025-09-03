import { z } from 'zod';
import {
  publicAccessTokenSchema,
  mapPositionSchema,
  stringSchema
} from '../../schemas/common.js';

export const StyleComparisonSchema = z.object({
  before: stringSchema(
    'Mapbox style for the "before" side. Accepts: full style URL (mapbox://styles/username/styleId), username/styleId format, or just styleId if using your own styles'
  ),
  after: stringSchema(
    'Mapbox style for the "after" side. Accepts: full style URL (mapbox://styles/username/styleId), username/styleId format, or just styleId if using your own styles'
  ),
  accessToken: publicAccessTokenSchema(),
  ...mapPositionSchema()
});

export type StyleComparisonInput = z.infer<typeof StyleComparisonSchema>;
