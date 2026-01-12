// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const OptimizeStyleInputSchema = z.object({
  style: z
    .union([z.string(), z.record(z.unknown())])
    .describe('Mapbox style to optimize (JSON string or style object)'),
  optimizations: z
    .array(
      z.enum([
        'remove-unused-sources',
        'remove-duplicate-layers',
        'simplify-expressions',
        'remove-empty-layers',
        'consolidate-filters'
      ])
    )
    .optional()
    .describe(
      'Specific optimizations to apply (if not specified, all optimizations are applied)'
    )
});

export type OptimizeStyleInput = z.infer<typeof OptimizeStyleInputSchema>;
