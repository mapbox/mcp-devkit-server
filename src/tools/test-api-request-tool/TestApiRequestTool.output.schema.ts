import { z } from 'zod';

/**
 * Code snippet for a specific programming language
 */
const CodeSnippetSchema = z.object({
  language: z
    .enum(['curl', 'javascript', 'python'])
    .describe('Programming language of the code snippet'),
  code: z.string().describe('The generated code snippet'),
  description: z
    .string()
    .optional()
    .describe('Optional description of what the code does')
});

/**
 * Output schema for TestApiRequestTool
 *
 * Returns the actual API response along with optional code generation
 * showing how to replicate the API call in various languages.
 */
export const TestApiRequestOutputSchema = z.object({
  success: z.boolean().describe('Whether the API request succeeded'),

  statusCode: z.number().describe('HTTP status code from the API response'),

  request: z
    .object({
      method: z.string().describe('HTTP method used (GET, POST, PUT, etc.)'),
      url: z.string().describe('Full URL that was called'),
      headers: z.record(z.string()).optional().describe('Request headers sent')
    })
    .describe('Details about the request that was made'),

  response: z
    .object({
      data: z
        .unknown()
        .optional()
        .describe('The API response body (structure varies by endpoint)'),
      headers: z
        .record(z.string())
        .optional()
        .describe('Relevant response headers'),
      error: z
        .string()
        .optional()
        .describe('Error message if the request failed')
    })
    .describe('The API response'),

  codeSnippets: z
    .array(CodeSnippetSchema)
    .optional()
    .describe('Generated code examples showing how to replicate this API call'),

  executionTime: z
    .number()
    .optional()
    .describe('Time taken to execute the request in milliseconds')
});

/**
 * Type inference for TestApiRequestOutput
 */
export type TestApiRequestOutput = z.infer<typeof TestApiRequestOutputSchema>;
