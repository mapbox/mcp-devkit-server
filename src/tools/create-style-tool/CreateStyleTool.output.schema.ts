// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
import { BaseStylePropertiesSchema } from '../../schemas/style.js';

// OUTPUT Schema - For API responses (POST response)
// Uses the same comprehensive schema as RetrieveStyleTool to ensure all
// properties returned by the Mapbox API are explicitly defined.
// This avoids issues with additionalProperties: false in strict validators.
export const MapboxStyleOutputSchema = BaseStylePropertiesSchema.extend({
  name: z.string().describe('Human-readable name for the style'),

  // API-specific properties (only present in responses)
  id: z.string().describe('Unique style identifier'),
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
  protected: z
    .boolean()
    .optional()
    .describe('Whether style is protected from modifications'),
  draft: z.boolean().optional().describe('Whether this is a draft version')
});

// Type exports
export type MapboxStyleOutput = z.infer<typeof MapboxStyleOutputSchema>;
