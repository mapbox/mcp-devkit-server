import { z } from 'zod';

/**
 * Schema for a single documentation result
 */
const DocResultSchema = z.object({
  title: z.string().describe('Title of the documentation section'),
  excerpt: z
    .string()
    .describe(
      'Relevant excerpt from the documentation showing key information'
    ),
  category: z
    .string()
    .describe('Category of documentation (apis, sdks, guides, examples)'),
  url: z.string().describe('Full URL to the documentation page'),
  relevanceScore: z
    .number()
    .describe(
      'Relevance score from 0-1 indicating how well this matches the context'
    ),
  matchReason: z
    .string()
    .optional()
    .describe(
      'Explanation of why this documentation is relevant to the context'
    )
});

/**
 * Output schema for GetContextualDocsTool
 */
export const GetContextualDocsOutputSchema = z.object({
  results: z
    .array(DocResultSchema)
    .describe('Ranked list of relevant documentation sections'),
  extractedKeywords: z
    .array(z.string())
    .describe('Key concepts extracted from the provided context'),
  suggestedTopics: z
    .array(z.string())
    .optional()
    .describe('Related topics the user might want to explore'),
  troubleshootingTips: z
    .array(z.string())
    .optional()
    .describe('Troubleshooting suggestions if an error message was provided'),
  totalResults: z.number().describe('Total number of results found'),
  context: z.string().describe('The original context provided')
});

/**
 * Inferred TypeScript type for GetContextualDocsTool output
 */
export type GetContextualDocsOutput = z.infer<
  typeof GetContextualDocsOutputSchema
>;
