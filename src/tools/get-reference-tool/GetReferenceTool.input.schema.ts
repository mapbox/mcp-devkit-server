// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

export const GetReferenceSchema = z.object({
  reference: z
    .enum([
      'resource://mapbox-style-layers',
      'resource://mapbox-streets-v8-fields',
      'resource://mapbox-token-scopes',
      'resource://mapbox-layer-type-mapping'
    ])
    .describe(
      'The reference documentation to retrieve. Available references: ' +
        'resource://mapbox-style-layers (Mapbox GL JS style specification for layer types and properties), ' +
        'resource://mapbox-streets-v8-fields (Complete field definitions for all Streets v8 source layers), ' +
        'resource://mapbox-token-scopes (Token scope reference and permissions guide), ' +
        'resource://mapbox-layer-type-mapping (Mapping of source layers to compatible layer types)'
    )
});

export type GetReferenceInput = z.infer<typeof GetReferenceSchema>;
