// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const CountryBoundingBoxSchema = z.object({
  iso_3166_1: z
    .string()
    .min(2)
    .max(10)
    .describe(
      'ISO 3166-1 country code (2-10 characters, e.g., "CN", "US", "AE" )'
    )
});

export type CountryBoundingBoxInput = z.infer<typeof CountryBoundingBoxSchema>;
