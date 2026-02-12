import { z } from 'zod';

const ValidationIssueSchema = z.object({
  type: z.enum(['error', 'warning']),
  field: z.string(),
  message: z.string(),
  expected: z.string().optional(),
  received: z.any().optional()
});

const ParameterValidationSchema = z.object({
  provided: z.number(),
  required: z.number(),
  optional: z.number(),
  missing: z.array(z.string()),
  extra: z.array(z.string())
});

const ScopeValidationSchema = z.object({
  hasRequired: z.boolean(),
  required: z.array(z.string()),
  provided: z.array(z.string()).optional(),
  missing: z.array(z.string()).optional()
});

// Output schema defines only the structured content
export const ValidateApiRequestOutputSchema = z.object({
  valid: z.boolean(),
  operation: z.object({
    api: z.string(),
    operation: z.string(),
    method: z.string(),
    endpoint: z.string()
  }),
  issues: z.array(ValidationIssueSchema),
  parameters: z.object({
    path: ParameterValidationSchema.optional(),
    query: ParameterValidationSchema.optional(),
    body: ParameterValidationSchema.optional()
  }),
  scopes: ScopeValidationSchema.optional()
});

export type ValidateApiRequestOutput = z.infer<
  typeof ValidateApiRequestOutputSchema
>;
