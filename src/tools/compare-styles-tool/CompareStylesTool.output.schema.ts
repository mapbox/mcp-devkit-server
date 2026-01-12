// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

const DifferenceSchema = z.object({
  path: z.string().describe('JSON path to the difference'),
  type: z.enum(['added', 'removed', 'modified']).describe('Type of difference'),
  valueA: z.unknown().optional().describe('Value in style A (if exists)'),
  valueB: z.unknown().optional().describe('Value in style B (if exists)'),
  description: z.string().optional().describe('Human-readable description')
});

export const CompareStylesOutputSchema = z.object({
  identical: z.boolean().describe('Whether the styles are identical'),
  differences: z.array(DifferenceSchema).describe('List of differences found'),
  summary: z
    .object({
      totalDifferences: z.number().describe('Total number of differences'),
      added: z.number().describe('Number of additions in style B'),
      removed: z.number().describe('Number of removals from style A'),
      modified: z.number().describe('Number of modifications')
    })
    .describe('Summary of differences')
});

export type CompareStylesOutput = z.infer<typeof CompareStylesOutputSchema>;
export type Difference = z.infer<typeof DifferenceSchema>;
