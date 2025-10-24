// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// OUTPUT Schema - Simplified schema for tool responses
// This schema describes the key metadata fields returned, not the entire style spec.
// The full style data is included in structuredContent but uses .passthrough()
// to avoid overwhelming clients with a massive schema definition.
export const MapboxStyleOutputSchema = z
  .object({
    // API-specific metadata properties
    id: z.string().describe('Unique style identifier'),
    name: z.string().describe('Human-readable name for the style'),
    owner: z.string().describe('Username of the style owner'),
    created: z
      .string()
      .datetime()
      .describe('ISO 8601 timestamp when style was created'),
    modified: z
      .string()
      .datetime()
      .describe('ISO 8601 timestamp when style was last modified'),
    visibility: z
      .enum(['public', 'private'])
      .describe('Style visibility setting'),
    draft: z.boolean().optional().describe('Whether this is a draft version'),

    // Style spec version (always 8)
    version: z.literal(8).describe('Style specification version number')
  })
  .passthrough()
  .describe(
    'Mapbox style with metadata. Additional style properties (sources, layers, etc.) are included but not explicitly validated to keep the schema manageable.'
  );

// Type exports
export type MapboxStyleOutput = z.infer<typeof MapboxStyleOutputSchema>;
