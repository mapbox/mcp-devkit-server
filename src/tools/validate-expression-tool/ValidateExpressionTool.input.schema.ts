// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// Generous for any realistic hand-written or generated expression (even a
// "match" with thousands of branches is a few KB), while bounding the size of
// the JSON.parse'd/validated structure so a pathological payload can't be used
// to exhaust memory before our own validation logic ever runs.
const MAX_EXPRESSION_JSON_LENGTH = 262_144; // 256 KB

export const ValidateExpressionInputSchema = z.object({
  // `z.any()` in the union matches everything, including oversized strings, so
  // `.max()` on the string branch alone would never trigger - the length check
  // has to be a refinement applied after the union instead.
  expression: z
    .union([z.string(), z.any()])
    .refine(
      (value) =>
        typeof value !== 'string' || value.length <= MAX_EXPRESSION_JSON_LENGTH,
      {
        message: `Expression JSON string exceeds maximum length of ${MAX_EXPRESSION_JSON_LENGTH} characters`
      }
    )
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
