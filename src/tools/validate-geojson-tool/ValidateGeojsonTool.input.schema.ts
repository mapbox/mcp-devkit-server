// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const ValidateGeojsonInputSchema = z.object({
  geojson: z
    .union([z.string(), z.record(z.unknown())])
    .describe('GeoJSON object or JSON string to validate')
});

export type ValidateGeojsonInput = z.infer<typeof ValidateGeojsonInputSchema>;
