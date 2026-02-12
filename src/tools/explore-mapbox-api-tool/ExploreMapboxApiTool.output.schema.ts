import { z } from 'zod';

const ParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  description: z.string(),
  default: z.any().optional(),
  enum: z.array(z.string()).optional()
});

const RateLimitSchema = z.object({
  requests: z.number(),
  period: z.string(),
  notes: z.string().optional()
});

const ApiOperationSchema = z.object({
  name: z.string(),
  operationId: z.string(),
  description: z.string(),
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  pathParameters: z.array(ParameterSchema).optional(),
  queryParameters: z.array(ParameterSchema).optional(),
  bodyParameters: z.array(ParameterSchema).optional(),
  requiredScopes: z.array(z.string()),
  rateLimit: RateLimitSchema.optional(),
  exampleRequest: z.string().optional(),
  exampleResponse: z.string().optional()
});

const ApiSummarySchema = z.object({
  api: z.string(),
  category: z.string(),
  description: z.string(),
  docsUrl: z.string(),
  operationCount: z.number()
});

const OperationSummarySchema = z.object({
  operationId: z.string(),
  name: z.string(),
  method: z.string(),
  endpoint: z.string(),
  description: z.string()
});

// Output schema defines only the structured content portion
// The text content is returned separately in the standard 'content' field
export const ExploreMapboxApiOutputSchema = z.object({
  apis: z.array(ApiSummarySchema).optional(),
  operations: z.array(OperationSummarySchema).optional(),
  operationDetails: ApiOperationSchema.optional()
});

export type ExploreMapboxApiOutput = z.infer<
  typeof ExploreMapboxApiOutputSchema
>;
