import { z } from 'zod';

/**
 * Input schema for TestApiRequestTool
 *
 * This tool makes actual HTTP requests to Mapbox APIs and optionally generates
 * code snippets showing how to replicate the call in various languages.
 */
export const TestApiRequestInputSchema = z.object({
  api: z
    .string()
    .min(1)
    .describe('API name to test (e.g., "geocoding", "styles", "tokens")'),

  operation: z
    .string()
    .min(1)
    .describe(
      'Operation ID to execute (e.g., "forward-geocode", "list-styles")'
    ),

  parameters: z
    .object({
      path: z
        .record(z.any())
        .optional()
        .describe(
          'Path parameters (e.g., { username: "mapbox", style_id: "streets-v12" })'
        ),
      query: z
        .record(z.any())
        .optional()
        .describe(
          'Query parameters (e.g., { limit: 10, access_token: "pk.xxx" })'
        ),
      body: z
        .record(z.any())
        .optional()
        .describe('Request body parameters for POST/PUT/PATCH requests')
    })
    .describe('API request parameters organized by type'),

  generateCode: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to generate code snippets showing how to replicate this API call'
    ),

  codeLanguages: z
    .array(z.enum(['curl', 'javascript', 'python']))
    .optional()
    .default(['curl', 'javascript', 'python'])
    .describe('Programming languages to generate code examples for')
});

/**
 * Inferred TypeScript type for TestApiRequestTool input
 */
export type TestApiRequestInput = z.infer<typeof TestApiRequestInputSchema>;
