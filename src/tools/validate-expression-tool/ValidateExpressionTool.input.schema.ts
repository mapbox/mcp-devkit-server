// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const ValidateExpressionInputSchema = z.object({
  expression: z
    .union([z.string(), z.any()])
    .describe(
      'Mapbox expression to validate (JSON string or expression array)'
    ),
  context: z
    .enum(['style', 'filter', 'layout', 'paint'])
    .optional()
    .describe('Context where the expression will be used')
});

export type ValidateExpressionInput = z.infer<
  typeof ValidateExpressionInputSchema
>;
