import { z } from 'zod';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { SearchMapboxDocsInputSchema } from './SearchMapboxDocsTool.input.schema.js';
import {
  SearchMapboxDocsOutputSchema,
  type SearchMapboxDocsOutput,
  type SearchResult
} from './SearchMapboxDocsTool.output.schema.js';

/**
 * Represents a parsed documentation section
 */
interface DocSection {
  title: string;
  content: string;
  category: string;
  url?: string;
}

/**
 * SearchMapboxDocsTool - AI-powered documentation search
 *
 * Enables semantic search of Mapbox documentation for specific topics,
 * providing targeted, relevant documentation sections instead of loading
 * the entire documentation corpus.
 *
 * This tool fetches the latest Mapbox documentation from docs.mapbox.com/llms.txt,
 * parses it into searchable sections, and returns ranked results matching
 * the user's query.
 *
 * @example
 * ```typescript
 * const tool = new SearchMapboxDocsTool({ httpRequest });
 * const result = await tool.run({
 *   query: 'geocoding rate limits',
 *   category: 'apis',
 *   limit: 5
 * });
 * ```
 */
export class SearchMapboxDocsTool extends BaseTool<
  typeof SearchMapboxDocsInputSchema,
  typeof SearchMapboxDocsOutputSchema
> {
  readonly name = 'search_mapbox_docs_tool';
  readonly description =
    'Search Mapbox documentation for specific topics. Returns ranked, relevant documentation sections instead of the entire corpus. Use this to find targeted information about Mapbox APIs, SDKs, guides, and examples. Supports filtering by category (apis, sdks, guides, examples) and limiting results.';
  readonly annotations = {
    title: 'Search Mapbox Documentation Tool',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  };

  private httpRequest: HttpRequest;
  private docCache: DocSection[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: SearchMapboxDocsInputSchema,
      outputSchema: SearchMapboxDocsOutputSchema
    });
    this.httpRequest = params.httpRequest;
  }

  /**
   * Fetch and cache Mapbox documentation
   */
  private async fetchDocs(): Promise<string> {
    const response = await this.httpRequest(
      'https://docs.mapbox.com/llms.txt',
      {
        headers: {
          Accept: 'text/markdown, text/plain;q=0.9, */*;q=0.8'
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Mapbox documentation: ${response.statusText}`
      );
    }

    return await response.text();
  }

  /**
   * Parse documentation into searchable sections
   */
  private parseDocs(content: string): DocSection[] {
    const sections: DocSection[] = [];
    const lines = content.split('\n');

    let currentSection: DocSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      // Detect section headers (lines starting with #)
      if (line.startsWith('#')) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }

        // Start new section
        const title = line.replace(/^#+\s*/, '').trim();
        const category = this.categorizeSection(title, line);

        currentSection = {
          title,
          content: '',
          category,
          url: this.extractUrl(title)
        };
        currentContent = [];
      } else if (currentSection) {
        // Add content to current section
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection && currentContent.length > 0) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Categorize a section based on its title and content
   */
  private categorizeSection(title: string, _fullLine: string): string {
    const lower = title.toLowerCase();

    if (
      lower.includes('api') ||
      lower.includes('endpoint') ||
      lower.includes('rest')
    ) {
      return 'apis';
    }
    if (
      lower.includes('sdk') ||
      lower.includes('ios') ||
      lower.includes('android') ||
      lower.includes('mapbox-gl')
    ) {
      return 'sdks';
    }
    if (
      lower.includes('guide') ||
      lower.includes('tutorial') ||
      lower.includes('how to')
    ) {
      return 'guides';
    }
    if (lower.includes('example') || lower.includes('demo')) {
      return 'examples';
    }

    return 'general';
  }

  /**
   * Extract URL from title if it looks like a link
   */
  private extractUrl(title: string): string | undefined {
    // Try to extract URL from markdown links
    const linkMatch = title.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      return linkMatch[2];
    }

    // Check if the title contains a URL
    const urlMatch = title.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    return undefined;
  }

  /**
   * Calculate relevance score for a section based on query
   */
  private calculateRelevance(section: DocSection, query: string): number {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    const titleLower = section.title.toLowerCase();
    const contentLower = section.content.toLowerCase();

    let score = 0;

    // Exact phrase match in title (highest weight)
    if (titleLower.includes(queryLower)) {
      score += 10;
    }

    // Individual word matches in title
    for (const word of queryWords) {
      if (word.length < 3) continue; // Skip short words
      if (titleLower.includes(word)) {
        score += 3;
      }
    }

    // Exact phrase match in content
    if (contentLower.includes(queryLower)) {
      score += 5;
    }

    // Individual word matches in content
    for (const word of queryWords) {
      if (word.length < 3) continue;
      const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score += matches * 0.5; // Multiple occurrences add fractional score
    }

    // Normalize score to 0-1 range (max theoretical score ~20)
    return Math.min(score / 20, 1);
  }

  /**
   * Search documentation sections
   */
  private async searchDocs(
    query: string,
    category?: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    // Check cache
    const now = Date.now();
    if (
      !this.docCache ||
      !this.cacheTimestamp ||
      now - this.cacheTimestamp > this.CACHE_TTL_MS
    ) {
      // Fetch and parse docs
      const content = await this.fetchDocs();
      this.docCache = this.parseDocs(content);
      this.cacheTimestamp = now;
    }

    // Filter by category if specified
    let sections = this.docCache;
    if (category && category !== 'all') {
      sections = sections.filter((s) => s.category === category);
    }

    // Calculate relevance for each section
    const results: SearchResult[] = sections
      .map((section) => ({
        title: section.title,
        excerpt: this.extractExcerpt(section.content, query),
        category: section.category,
        url: section.url,
        relevanceScore: this.calculateRelevance(section, query)
      }))
      .filter((r) => r.relevanceScore > 0.05) // Filter out very low relevance
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return results;
  }

  /**
   * Extract a relevant excerpt from content
   */
  private extractExcerpt(content: string, query: string): string {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    // Find the position of the query or first query word
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length >= 3);
    let bestPos = -1;

    // Try exact phrase first
    bestPos = contentLower.indexOf(queryLower);

    // If not found, try individual words
    if (bestPos === -1) {
      for (const word of queryWords) {
        const pos = contentLower.indexOf(word);
        if (pos !== -1) {
          bestPos = pos;
          break;
        }
      }
    }

    // Extract excerpt around the match
    const excerptLength = 200;
    if (bestPos !== -1) {
      const start = Math.max(0, bestPos - excerptLength / 2);
      const end = Math.min(content.length, bestPos + excerptLength / 2);
      let excerpt = content.substring(start, end).trim();

      // Add ellipsis if truncated
      if (start > 0) excerpt = '...' + excerpt;
      if (end < content.length) excerpt = excerpt + '...';

      return excerpt;
    }

    // If no match, return first part of content
    return content.substring(0, excerptLength).trim() + '...';
  }

  /**
   * Execute the search
   */
  protected async execute(
    input: z.infer<typeof SearchMapboxDocsInputSchema>
  ): Promise<CallToolResult> {
    try {
      const results = await this.searchDocs(
        input.query,
        input.category,
        input.limit
      );

      const output: SearchMapboxDocsOutput = {
        results,
        query: input.query,
        totalResults: results.length,
        category: input.category
      };

      // Validate against output schema
      const validatedOutput = SearchMapboxDocsOutputSchema.parse(output);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validatedOutput, null, 2)
          }
        ],
        structuredContent: validatedOutput,
        isError: false
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log('error', `${this.name}: ${errorMessage}`);

      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true
      };
    }
  }
}
