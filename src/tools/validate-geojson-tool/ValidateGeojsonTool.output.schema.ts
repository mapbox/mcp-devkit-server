// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

const GeojsonIssueSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']).describe('Issue severity'),
  message: z.string().describe('Description of the issue'),
  path: z.string().optional().describe('JSON path to the problem'),
  suggestion: z.string().optional().describe('How to fix the issue')
});

export const ValidateGeojsonOutputSchema = z.object({
  valid: z.boolean().describe('Whether the GeoJSON is valid'),
  errors: z.array(GeojsonIssueSchema).describe('Critical errors'),
  warnings: z.array(GeojsonIssueSchema).describe('Non-critical warnings'),
  info: z.array(GeojsonIssueSchema).describe('Informational messages'),
  statistics: z
    .object({
      type: z.string().describe('GeoJSON type'),
      featureCount: z.number().optional().describe('Number of features'),
      geometryTypes: z.array(z.string()).describe('Geometry types found'),
      bbox: z
        .array(z.number())
        .optional()
        .describe('Bounding box [minLon, minLat, maxLon, maxLat]')
    })
    .describe('GeoJSON statistics')
});

export type ValidateGeojsonOutput = z.infer<typeof ValidateGeojsonOutputSchema>;
export type GeojsonIssue = z.infer<typeof GeojsonIssueSchema>;
