// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const StyleComparisonOutputSchema = z.object({
  before: z
    .string()
    .describe('Resolved "before" style in username/styleId format'),
  after: z
    .string()
    .describe('Resolved "after" style in username/styleId format'),
  accessToken: z
    .string()
    .describe(
      'Public token the comparison view uses to load both styles (the one supplied, or a short-lived auto-generated tk.* token)'
    ),
  center: z
    .tuple([z.number().describe('Longitude'), z.number().describe('Latitude')])
    .optional()
    .describe('Initial map center as [longitude, latitude], if provided'),
  zoom: z.number().optional().describe('Initial zoom level, if provided')
});

export type StyleComparisonOutput = z.infer<typeof StyleComparisonOutputSchema>;
