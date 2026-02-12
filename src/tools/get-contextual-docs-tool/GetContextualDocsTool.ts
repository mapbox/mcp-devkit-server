import { z } from 'zod';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { GetContextualDocsInputSchema } from './GetContextualDocsTool.input.schema.js';
import {
  GetContextualDocsOutputSchema,
  type GetContextualDocsOutput
} from './GetContextualDocsTool.output.schema.js';

/**
 * GetContextualDocsTool - Retrieve relevant Mapbox documentation based on context
 *
 * This tool intelligently retrieves documentation by analyzing the user's current
 * context, including what they're working on, code snippets, and error messages.
 * It goes beyond simple keyword search by understanding the full context and
 * providing targeted, actionable documentation.
 *
 * Features:
 * - Context-aware keyword extraction
 * - Code pattern recognition
 * - Error message analysis
 * - Technology-specific filtering
 * - Relevance scoring with explanations
 * - Suggested related topics
 *
 * @example
 * ```typescript
 * const tool = new GetContextualDocsTool({ httpRequest });
 * const result = await tool.run({
 *   context: "adding custom markers with popups",
 *   codeSnippet: "map.addLayer({type: 'symbol', ...})",
 *   technology: "mapbox-gl-js"
 * });
 * ```
 */
export class GetContextualDocsTool extends BaseTool<
  typeof GetContextualDocsInputSchema,
  typeof GetContextualDocsOutputSchema
> {
  readonly name = 'get_contextual_docs_tool';
  readonly description =
    "Retrieve relevant Mapbox documentation based on current context. Analyzes what you're working on, code snippets, and error messages to provide targeted documentation. Smarter than simple search - understands context and provides actionable guidance.";
  readonly annotations = {
    title: 'Get Contextual Documentation',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  };

  private readonly httpRequest: HttpRequest;
  private documentationCache: {
    content: string;
    timestamp: number;
  } | null = null;
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(deps: { httpRequest: HttpRequest }) {
    super({
      inputSchema: GetContextualDocsInputSchema,
      outputSchema: GetContextualDocsOutputSchema
    });
    this.httpRequest = deps.httpRequest;
  }

  protected async execute(
    input: z.infer<typeof GetContextualDocsInputSchema>
  ): Promise<CallToolResult> {
    try {
      // Extract keywords from all provided context
      const extractedKeywords = this.extractKeywords(input);

      // Fetch documentation
      const docs = await this.fetchDocumentation();

      // Parse and score documentation sections
      const results = this.findRelevantDocs(docs, input, extractedKeywords);

      // Generate suggestions
      const suggestedTopics = this.generateSuggestions(
        extractedKeywords,
        results
      );
      const troubleshootingTips = input.errorMessage
        ? this.generateTroubleshootingTips(input.errorMessage, results)
        : undefined;

      // Limit results
      const limitedResults = results.slice(0, input.limit);

      const output: GetContextualDocsOutput = {
        results: limitedResults,
        extractedKeywords,
        suggestedTopics,
        troubleshootingTips,
        totalResults: results.length,
        context: input.context
      };

      // Format text output
      const text = this.formatOutput(output);

      return {
        content: [{ type: 'text', text }],
        structuredContent: output,
        isError: false
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log('error', `${this.name}: ${errorMessage}`);

      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving contextual documentation: ${errorMessage}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Extract keywords from context, code, and errors
   */
  private extractKeywords(
    input: z.infer<typeof GetContextualDocsInputSchema>
  ): string[] {
    const keywords = new Set<string>();

    // Extract from context
    const contextWords =
      input.context.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    contextWords.forEach((word) => {
      if (!this.isStopWord(word)) {
        keywords.add(word);
      }
    });

    // Extract from code snippet
    if (input.codeSnippet) {
      const codeKeywords = this.extractCodeKeywords(input.codeSnippet);
      codeKeywords.forEach((kw) => keywords.add(kw));
    }

    // Extract from error message
    if (input.errorMessage) {
      const errorKeywords = this.extractErrorKeywords(input.errorMessage);
      errorKeywords.forEach((kw) => keywords.add(kw));
    }

    // Add technology if specified
    if (input.technology) {
      keywords.add(input.technology.toLowerCase());
    }

    return Array.from(keywords);
  }

  /**
   * Extract keywords from code snippets
   */
  private extractCodeKeywords(code: string): string[] {
    const keywords: string[] = [];

    // API/method patterns
    const apiPattern =
      /\b(map|layer|source|marker|popup|style|feature|coordinates?)\b/gi;
    const matches = code.match(apiPattern);
    if (matches) {
      matches.forEach((m) => keywords.push(m.toLowerCase()));
    }

    // Method calls
    const methodPattern = /\.(add|remove|set|get|load|update|create)(\w+)/g;
    let match;
    while ((match = methodPattern.exec(code)) !== null) {
      keywords.push(match[1].toLowerCase());
      if (match[2]) {
        keywords.push(match[2].toLowerCase());
      }
    }

    return keywords;
  }

  /**
   * Extract keywords from error messages
   */
  private extractErrorKeywords(error: string): string[] {
    const keywords: string[] = [];

    // Common error terms
    const errorTerms = [
      'token',
      'authentication',
      'permission',
      'rate limit',
      'timeout',
      'network',
      'style',
      'layer',
      'source'
    ];

    errorTerms.forEach((term) => {
      if (error.toLowerCase().includes(term)) {
        keywords.push(term);
      }
    });

    return keywords;
  }

  /**
   * Check if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'this',
      'that',
      'from',
      'have',
      'has',
      'can',
      'will',
      'what',
      'how',
      'when',
      'where',
      'why'
    ]);
    return stopWords.has(word);
  }

  /**
   * Fetch Mapbox documentation
   */
  private async fetchDocumentation(): Promise<string> {
    // Check cache
    if (
      this.documentationCache &&
      Date.now() - this.documentationCache.timestamp < this.CACHE_TTL
    ) {
      return this.documentationCache.content;
    }

    // Fetch fresh documentation
    const response = await this.httpRequest(
      'https://docs.mapbox.com/llms.txt',
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch documentation: ${response.status} ${response.statusText}`
      );
    }

    const content = await response.text();

    // Update cache
    this.documentationCache = {
      content,
      timestamp: Date.now()
    };

    return content;
  }

  /**
   * Find relevant documentation sections
   */
  private findRelevantDocs(
    docs: string,
    input: z.infer<typeof GetContextualDocsInputSchema>,
    keywords: string[]
  ): Array<{
    title: string;
    excerpt: string;
    category: string;
    url: string;
    relevanceScore: number;
    matchReason?: string;
  }> {
    const sections = this.parseSections(docs);
    const scoredSections = sections
      .map((section) => {
        const score = this.calculateRelevance(section, keywords, input);
        const reason = this.explainMatch(section, keywords, input);
        return {
          ...section,
          relevanceScore: score,
          matchReason: reason
        };
      })
      .filter((section) => section.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scoredSections;
  }

  /**
   * Parse documentation into sections
   */
  private parseSections(docs: string): Array<{
    title: string;
    content: string;
    category: string;
    url: string;
    excerpt: string;
  }> {
    const sections: Array<{
      title: string;
      content: string;
      category: string;
      url: string;
      excerpt: string;
    }> = [];

    const lines = docs.split('\n');
    let currentSection: {
      title: string;
      content: string;
      url: string;
    } | null = null;

    for (const line of lines) {
      // Section headers (# Title)
      if (line.startsWith('# ') && !line.startsWith('## ')) {
        if (currentSection) {
          sections.push(this.finalizeSection(currentSection));
        }
        currentSection = {
          title: line.replace(/^#\s+/, '').trim(),
          content: '',
          url: ''
        };
      } else if (currentSection) {
        // URL detection
        if (line.includes('http')) {
          const urlMatch = line.match(/https?:\/\/[^\s]+/);
          if (urlMatch && !currentSection.url) {
            currentSection.url = urlMatch[0];
          }
        }
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(this.finalizeSection(currentSection));
    }

    return sections;
  }

  /**
   * Finalize a documentation section
   */
  private finalizeSection(section: {
    title: string;
    content: string;
    url: string;
  }): {
    title: string;
    content: string;
    category: string;
    url: string;
    excerpt: string;
  } {
    return {
      title: section.title,
      content: section.content,
      category: this.categorizeSection(section.title, section.content),
      url:
        section.url ||
        `https://docs.mapbox.com/search/?query=${encodeURIComponent(section.title)}`,
      excerpt: this.extractExcerpt(section.content)
    };
  }

  /**
   * Categorize documentation section
   */
  private categorizeSection(title: string, content: string): string {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    if (
      titleLower.includes('api') ||
      contentLower.includes('endpoint') ||
      contentLower.includes('request')
    ) {
      return 'apis';
    }
    if (titleLower.includes('sdk') || titleLower.includes('library')) {
      return 'sdks';
    }
    if (titleLower.includes('example') || contentLower.includes('demo')) {
      return 'examples';
    }
    return 'guides';
  }

  /**
   * Extract a relevant excerpt from content
   */
  private extractExcerpt(content: string, maxLength: number = 200): string {
    const cleaned = content.replace(/\n\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return cleaned.substring(0, maxLength) + '...';
  }

  /**
   * Calculate relevance score for a section
   */
  private calculateRelevance(
    section: { title: string; content: string; category: string },
    keywords: string[],
    input: z.infer<typeof GetContextualDocsInputSchema>
  ): number {
    let score = 0;
    const titleLower = section.title.toLowerCase();
    const contentLower = section.content.toLowerCase();

    // Keyword matches in title (highest weight)
    keywords.forEach((keyword) => {
      if (titleLower.includes(keyword)) {
        score += 0.3;
      }
    });

    // Keyword matches in content
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        score += Math.min(matches.length * 0.05, 0.2);
      }
    });

    // Technology match
    if (input.technology) {
      if (contentLower.includes(input.technology.toLowerCase())) {
        score += 0.15;
      }
    }

    // Error message match
    if (input.errorMessage) {
      if (
        contentLower.includes('error') ||
        contentLower.includes('troubleshoot')
      ) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Explain why a section matches
   */
  private explainMatch(
    section: { title: string; content: string },
    keywords: string[],
    input: z.infer<typeof GetContextualDocsInputSchema>
  ): string {
    const reasons: string[] = [];
    const titleLower = section.title.toLowerCase();
    const contentLower = section.content.toLowerCase();

    // Check for keyword matches
    const matchedKeywords = keywords.filter(
      (kw) => titleLower.includes(kw) || contentLower.includes(kw)
    );

    if (matchedKeywords.length > 0) {
      reasons.push(
        `Matches key concepts: ${matchedKeywords.slice(0, 3).join(', ')}`
      );
    }

    if (
      input.technology &&
      contentLower.includes(input.technology.toLowerCase())
    ) {
      reasons.push(`Relevant to ${input.technology}`);
    }

    if (input.errorMessage && contentLower.includes('troubleshoot')) {
      reasons.push('Contains troubleshooting information');
    }

    return reasons.length > 0 ? reasons.join('; ') : 'Related to your query';
  }

  /**
   * Generate suggested topics
   */
  private generateSuggestions(
    keywords: string[],
    _results: Array<{ title: string }>
  ): string[] {
    const suggestions = new Set<string>();

    // Common related topics based on keywords
    const relatedTopics: Record<string, string[]> = {
      marker: ['Popups', 'Custom Icons', 'Clustering'],
      layer: ['Styling', 'Data Sources', 'Expressions'],
      style: ['Layers', 'Sprites', 'Fonts'],
      map: ['Events', 'Controls', 'Camera'],
      geocoding: ['Search', 'Rate Limits', 'Caching']
    };

    keywords.forEach((keyword) => {
      const related = relatedTopics[keyword.toLowerCase()];
      if (related) {
        related.forEach((topic) => suggestions.add(topic));
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Generate troubleshooting tips
   */
  private generateTroubleshootingTips(
    errorMessage: string,
    _results: Array<{ title: string }>
  ): string[] {
    const tips: string[] = [];
    const errorLower = errorMessage.toLowerCase();

    if (errorLower.includes('token') || errorLower.includes('401')) {
      tips.push(
        'Check that your access token is valid and has the required scopes'
      );
    }

    if (errorLower.includes('rate limit') || errorLower.includes('429')) {
      tips.push(
        'You may have exceeded API rate limits - implement caching or request throttling'
      );
    }

    if (errorLower.includes('network') || errorLower.includes('timeout')) {
      tips.push('Check your network connection and API endpoint URL');
    }

    if (errorLower.includes('style') || errorLower.includes('layer')) {
      tips.push(
        'Verify your style JSON is valid and all referenced sources exist'
      );
    }

    if (tips.length === 0) {
      tips.push(
        'Review the error message and check the relevant documentation sections below'
      );
    }

    return tips;
  }

  /**
   * Format output as markdown text
   */
  private formatOutput(output: GetContextualDocsOutput): string {
    let text = '# Contextual Documentation\n\n';
    text += `**Context:** ${output.context}\n\n`;

    if (output.extractedKeywords.length > 0) {
      text += `**Key Concepts:** ${output.extractedKeywords.slice(0, 8).join(', ')}\n\n`;
    }

    if (output.troubleshootingTips && output.troubleshootingTips.length > 0) {
      text += '## 🔧 Troubleshooting Tips\n\n';
      output.troubleshootingTips.forEach((tip) => {
        text += `- ${tip}\n`;
      });
      text += '\n';
    }

    text += `## 📚 Relevant Documentation (${output.results.length} results)\n\n`;

    output.results.forEach((result, index) => {
      text += `### ${index + 1}. ${result.title}\n\n`;
      text += `**Category:** ${result.category} | **Relevance:** ${(result.relevanceScore * 100).toFixed(0)}%\n\n`;

      if (result.matchReason) {
        text += `**Why relevant:** ${result.matchReason}\n\n`;
      }

      text += `${result.excerpt}\n\n`;
      text += `🔗 [Read more](${result.url})\n\n`;
      text += '---\n\n';
    });

    if (output.suggestedTopics && output.suggestedTopics.length > 0) {
      text += '## 💡 Related Topics\n\n';
      text += output.suggestedTopics.map((topic) => `- ${topic}`).join('\n');
      text += '\n';
    }

    return text;
  }
}
