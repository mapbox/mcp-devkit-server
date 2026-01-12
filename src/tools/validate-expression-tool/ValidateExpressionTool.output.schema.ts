// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

const ExpressionIssueSchema = z.object({
  severity: z.enum(['error', 'warning', 'info']).describe('Issue severity'),
  message: z.string().describe('Description of the issue'),
  path: z.string().optional().describe('Path to the problem in the expression'),
  suggestion: z.string().optional().describe('How to fix the issue')
});

export const ValidateExpressionOutputSchema = z.object({
  valid: z.boolean().describe('Whether the expression is valid'),
  errors: z.array(ExpressionIssueSchema).describe('Critical errors'),
  warnings: z.array(ExpressionIssueSchema).describe('Non-critical warnings'),
  info: z.array(ExpressionIssueSchema).describe('Informational messages'),
  metadata: z
    .object({
      expressionType: z
        .string()
        .optional()
        .describe('Detected expression type (e.g., "literal", "get", "match")'),
      returnType: z
        .string()
        .optional()
        .describe('Expected return type of the expression'),
      depth: z.number().optional().describe('Maximum nesting depth')
    })
    .describe('Expression metadata')
});

export type ValidateExpressionOutput = z.infer<
  typeof ValidateExpressionOutputSchema
>;
export type ExpressionIssue = z.infer<typeof ExpressionIssueSchema>;
