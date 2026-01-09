// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const CompareStylesInputSchema = z.object({
  styleA: z
    .union([z.string(), z.record(z.unknown())])
    .describe('First Mapbox style (JSON string or style object)'),
  styleB: z
    .union([z.string(), z.record(z.unknown())])
    .describe('Second Mapbox style (JSON string or style object)'),
  ignoreMetadata: z
    .boolean()
    .optional()
    .describe('Ignore metadata fields like id, owner, created, modified')
});

export type CompareStylesInput = z.infer<typeof CompareStylesInputSchema>;
