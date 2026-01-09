// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const CheckColorContrastInputSchema = z.object({
  foregroundColor: z
    .string()
    .min(1)
    .describe(
      'Foreground color (text color) in any CSS format (hex, rgb, rgba, named colors)'
    ),
  backgroundColor: z
    .string()
    .min(1)
    .describe(
      'Background color in any CSS format (hex, rgb, rgba, named colors)'
    ),
  level: z
    .enum(['AA', 'AAA'])
    .optional()
    .describe('WCAG conformance level to check against (default: AA)'),
  fontSize: z
    .enum(['normal', 'large'])
    .optional()
    .describe(
      'Font size category: normal (<18pt or <14pt bold) or large (≥18pt or ≥14pt bold)'
    )
});

export type CheckColorContrastInput = z.infer<
  typeof CheckColorContrastInputSchema
>;
