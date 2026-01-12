// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

const WcagLevelRequirementsSchema = z.object({
  AA: z.object({
    normal: z.number().describe('Minimum contrast ratio for normal text (AA)'),
    large: z.number().describe('Minimum contrast ratio for large text (AA)')
  }),
  AAA: z.object({
    normal: z.number().describe('Minimum contrast ratio for normal text (AAA)'),
    large: z.number().describe('Minimum contrast ratio for large text (AAA)')
  })
});

export const CheckColorContrastOutputSchema = z.object({
  contrastRatio: z
    .number()
    .describe('Calculated contrast ratio between foreground and background'),
  passes: z
    .boolean()
    .describe('Whether the contrast ratio meets the specified WCAG level'),
  level: z.string().describe('WCAG level checked (AA or AAA)'),
  fontSize: z.string().describe('Font size category (normal or large)'),
  minimumRequired: z
    .number()
    .describe(
      'Minimum contrast ratio required for the specified level and font size'
    ),
  wcagRequirements: WcagLevelRequirementsSchema.describe(
    'Complete WCAG contrast requirements for all levels'
  ),
  recommendations: z
    .array(z.string())
    .optional()
    .describe('Optional recommendations for improvement')
});

export type CheckColorContrastOutput = z.infer<
  typeof CheckColorContrastOutputSchema
>;
