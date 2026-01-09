// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

const OptimizationSchema = z.object({
  type: z.string().describe('Type of optimization applied'),
  description: z.string().describe('Description of what was optimized'),
  count: z.number().describe('Number of items affected by this optimization')
});

export const OptimizeStyleOutputSchema = z.object({
  optimizedStyle: z.record(z.unknown()).describe('The optimized Mapbox style'),
  optimizations: z
    .array(OptimizationSchema)
    .describe('List of optimizations that were applied'),
  summary: z.object({
    totalOptimizations: z
      .number()
      .describe('Total number of optimization operations performed'),
    originalSize: z.number().describe('Original style size in bytes'),
    optimizedSize: z.number().describe('Optimized style size in bytes'),
    sizeSaved: z.number().describe('Bytes saved through optimization'),
    percentReduction: z.number().describe('Percentage reduction in size')
  })
});

export type OptimizeStyleOutput = z.infer<typeof OptimizeStyleOutputSchema>;
