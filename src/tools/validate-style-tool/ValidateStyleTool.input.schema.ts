// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// Generous for any real-world style (full styles with many layers/sources are
// typically well under 1 MB), while bounding the size of the JSON.parse'd
// structure so a pathological payload can't be used to exhaust memory before
// our own validation logic ever runs. Unlike ValidateExpressionInputSchema,
// `.max()` on the string branch alone is sufficient here since the object
// branch (`z.record`) doesn't also match strings.
const MAX_STYLE_JSON_LENGTH = 10 * 1024 * 1024; // 10 MB

/**
 * Input schema for ValidateStyleTool
 * Validates Mapbox GL JS style JSON against the style specification
 */
export const ValidateStyleInputSchema = z.object({
  style: z
    .union([
      z.string().max(MAX_STYLE_JSON_LENGTH),
      z.record(z.string(), z.unknown())
    ])
    .describe(
      'Mapbox style JSON object or JSON string to validate against the Mapbox Style Specification'
    )
});

/**
 * Inferred TypeScript type for ValidateStyleTool input
 */
export type ValidateStyleInput = z.infer<typeof ValidateStyleInputSchema>;
