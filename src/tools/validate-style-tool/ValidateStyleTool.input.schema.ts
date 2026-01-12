// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

/**
 * Input schema for ValidateStyleTool
 * Validates Mapbox GL JS style JSON against the style specification
 */
export const ValidateStyleInputSchema = z.object({
  style: z
    .union([z.string(), z.record(z.unknown())])
    .describe(
      'Mapbox style JSON object or JSON string to validate against the Mapbox Style Specification'
    )
});

/**
 * Inferred TypeScript type for ValidateStyleTool input
 */
export type ValidateStyleInput = z.infer<typeof ValidateStyleInputSchema>;
