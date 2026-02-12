import { z } from 'zod';

/**
 * Input schema for SearchMapboxDocsTool
 *
 * Enables AI-powered search of Mapbox documentation for specific topics,
 * providing targeted, relevant documentation instead of loading entire corpus.
 */
export const SearchMapboxDocsInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Search query for finding relevant Mapbox documentation (e.g., "geocoding rate limits", "custom markers")'
    ),
  category: z
    .enum(['apis', 'sdks', 'guides', 'examples', 'all'])
    .optional()
    .describe(
      'Filter results by documentation category: "apis" (REST APIs), "sdks" (Mobile/Web SDKs), "guides" (tutorials/how-tos), "examples" (code samples), or "all" (default)'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(5)
    .describe('Maximum number of results to return (default: 5, max: 20)')
});

/**
 * Inferred TypeScript type for SearchMapboxDocsTool input
 */
export type SearchMapboxDocsInput = z.infer<typeof SearchMapboxDocsInputSchema>;
