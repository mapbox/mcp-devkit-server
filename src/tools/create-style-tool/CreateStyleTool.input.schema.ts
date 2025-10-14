// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
import { BaseStylePropertiesSchema } from '../../schemas/style.js';

// INPUT Schema - For creating/updating styles (PATCH/POST request body)
export const MapboxStyleInputSchema = BaseStylePropertiesSchema.extend({
  name: z
    .string()
    .describe('Human-readable name for the style (REQUIRED for updates)')
  // These fields should NOT be included in input - they're read-only
  // If present, they'll be ignored or cause API errors
}).passthrough();

// Type exports
export type MapboxStyleInput = z.infer<typeof MapboxStyleInputSchema>;
