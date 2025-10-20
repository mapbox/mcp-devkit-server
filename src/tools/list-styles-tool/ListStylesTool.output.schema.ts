// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

/**
 * Schema for style metadata returned by the list styles endpoint.
 * Note: This is different from a full style specification - it contains
 * metadata about the style but may not include all style properties like layers.
 */
const StyleMetadataSchema = z
  .object({
    // Core metadata fields always present
    id: z.string().describe('Unique style ID'),
    name: z.string().describe('Style name'),
    owner: z.string().describe('Username of the style owner'),
    created: z.string().describe('ISO 8601 timestamp of creation'),
    modified: z.string().describe('ISO 8601 timestamp of last modification'),
    visibility: z
      .enum(['public', 'private'])
      .describe('Style visibility setting'),

    // Optional Style Spec fields that may be included
    version: z.literal(8).optional().describe('Style specification version'),
    center: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('Default center [longitude, latitude]'),
    zoom: z.number().optional().describe('Default zoom level'),
    bearing: z.number().optional().describe('Default bearing in degrees'),
    pitch: z.number().optional().describe('Default pitch in degrees'),

    // Sources and layers may or may not be included in list responses
    sources: z.record(z.any()).optional().describe('Style data sources'),
    layers: z.array(z.any()).optional().describe('Style layers'),

    // Additional metadata fields
    protected: z.boolean().optional().describe('Whether style is protected'),
    draft: z.boolean().optional().describe('Whether style is a draft')
  })
  .passthrough(); // Allow additional fields from API

export const ListStylesOutputSchema = z.array(StyleMetadataSchema);

export type ListStylesOutput = z.infer<typeof ListStylesOutputSchema>;
