import { z } from 'zod';

/**
 * Input schema for GetContextualDocsTool
 *
 * This tool retrieves relevant Mapbox documentation based on the user's
 * current context, including what they're working on, code snippets,
 * and error messages.
 */
export const GetContextualDocsInputSchema = z.object({
  context: z
    .string()
    .min(1)
    .describe(
      'Description of what the user is working on or trying to accomplish (e.g., "adding custom markers with popups")'
    ),

  codeSnippet: z
    .string()
    .optional()
    .describe(
      'Optional code snippet being worked with. Helps identify the specific APIs and patterns being used.'
    ),

  errorMessage: z
    .string()
    .optional()
    .describe(
      'Optional error message to help diagnose issues and find relevant troubleshooting documentation.'
    ),

  technology: z
    .string()
    .optional()
    .describe(
      'Specific SDK or platform being used (e.g., "mapbox-gl-js", "ios-sdk", "android-sdk")'
    ),

  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe(
      'Maximum number of documentation results to return (1-10, default: 5)'
    )
});

/**
 * Inferred TypeScript type for GetContextualDocsTool input
 */
export type GetContextualDocsInput = z.infer<
  typeof GetContextualDocsInputSchema
>;
