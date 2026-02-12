import { z } from 'zod';

/**
 * Schema for a single search result
 */
export const SearchResultSchema = z.object({
  title: z.string().describe('Title or heading of the documentation section'),
  excerpt: z
    .string()
    .describe('Relevant excerpt or snippet from the documentation'),
  category: z
    .string()
    .describe('Category of the result (apis, sdks, guides, examples)'),
  url: z
    .string()
    .optional()
    .describe('Link to full documentation (if available)'),
  relevanceScore: z
    .number()
    .min(0)
    .max(1)
    .describe('Relevance score from 0 to 1')
});

/**
 * Output schema for SearchMapboxDocsTool
 *
 * Returns an array of ranked, relevant documentation sections matching the search query.
 */
export const SearchMapboxDocsOutputSchema = z.object({
  results: z
    .array(SearchResultSchema)
    .describe('Array of matching documentation sections, ranked by relevance'),
  query: z.string().describe('The original search query'),
  totalResults: z
    .number()
    .int()
    .min(0)
    .describe('Total number of results found (before limit applied)'),
  category: z
    .string()
    .optional()
    .describe('Category filter that was applied (if any)')
});

/**
 * Type inference for SearchMapboxDocsOutput
 */
export type SearchMapboxDocsOutput = z.infer<
  typeof SearchMapboxDocsOutputSchema
>;

/**
 * Type inference for a single search result
 */
export type SearchResult = z.infer<typeof SearchResultSchema>;
