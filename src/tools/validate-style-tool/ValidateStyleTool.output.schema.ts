// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

const ValidationIssueSchema = z.object({
  severity: z
    .enum(['error', 'warning', 'info'])
    .describe('Severity level of the issue'),
  message: z.string().describe('Description of the validation issue'),
  path: z.string().optional().describe('JSON path to the problematic property'),
  suggestion: z.string().optional().describe('Suggested fix for the issue')
});

/**
 * Output schema for ValidateStyleTool
 * Returns comprehensive validation results for a Mapbox style JSON
 */
export const ValidateStyleOutputSchema = z.object({
  valid: z.boolean().describe('Whether the style is valid'),
  errors: z
    .array(ValidationIssueSchema)
    .describe('Critical errors that prevent the style from working'),
  warnings: z
    .array(ValidationIssueSchema)
    .describe('Non-critical issues that may cause unexpected behavior'),
  info: z
    .array(ValidationIssueSchema)
    .describe('Informational messages and suggestions for improvement'),
  summary: z
    .object({
      version: z.number().optional().describe('Style specification version'),
      layerCount: z.number().describe('Number of layers'),
      sourceCount: z.number().describe('Number of sources'),
      hasSprite: z.boolean().describe('Whether style has sprite defined'),
      hasGlyphs: z.boolean().describe('Whether style has glyphs defined')
    })
    .describe('Summary of style structure')
});

/**
 * Type inference for ValidateStyleOutput
 */
export type ValidateStyleOutput = z.infer<typeof ValidateStyleOutputSchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
