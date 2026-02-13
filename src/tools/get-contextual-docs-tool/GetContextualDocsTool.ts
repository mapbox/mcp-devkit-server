import { z } from 'zod';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { GetContextualDocsInputSchema } from './GetContextualDocsTool.input.schema.js';
import {
  GetContextualDocsOutputSchema,
  type GetContextualDocsOutput
} from './GetContextualDocsTool.output.schema.js';
import { parseHTML } from 'linkedom';

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
  private htmlPagesCache: Map<string, { content: string; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_PAGES_TO_FETCH = 2; // Fetch top 2 pages from index
  private readonly MAX_LINKED_PAGES = 3; // Fetch top 3 linked pages from those

  /**
   * Curated high-value documentation pages organized by topic
   * These are frequently needed pages that may not be easily discoverable through crawling
   */
  private readonly CURATED_PAGES: Record<string, string[]> = {
    // Markers and Popups
    marker: [
      'https://docs.mapbox.com/mapbox-gl-js/example/add-a-marker/',
      'https://docs.mapbox.com/mapbox-gl-js/example/custom-marker-icons/',
      'https://docs.mapbox.com/mapbox-gl-js/api/markers/#marker'
    ],
    popup: [
      'https://docs.mapbox.com/mapbox-gl-js/example/popup/',
      'https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/',
      'https://docs.mapbox.com/mapbox-gl-js/example/popup-on-hover/',
      'https://docs.mapbox.com/mapbox-gl-js/api/markers/#popup'
    ],

    // Layers and Styling
    layer: [
      'https://docs.mapbox.com/mapbox-gl-js/example/geojson-layer/',
      'https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/',
      'https://docs.mapbox.com/mapbox-gl-js/api/map/#map#addlayer',
      'https://docs.mapbox.com/style-spec/reference/layers/'
    ],
    style: [
      'https://docs.mapbox.com/mapbox-gl-js/example/setstyle/',
      'https://docs.mapbox.com/mapbox-gl-js/style-spec/',
      'https://docs.mapbox.com/mapbox-gl-js/api/map/#map#setstyle'
    ],

    // Data Sources
    source: [
      'https://docs.mapbox.com/mapbox-gl-js/example/geojson-line/',
      'https://docs.mapbox.com/mapbox-gl-js/example/live-update-feature/',
      'https://docs.mapbox.com/mapbox-gl-js/api/sources/'
    ],

    // Events and Interaction
    click: [
      'https://docs.mapbox.com/mapbox-gl-js/example/popup-on-click/',
      'https://docs.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures/',
      'https://docs.mapbox.com/mapbox-gl-js/api/map/#map.event:click'
    ],
    hover: [
      'https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/',
      'https://docs.mapbox.com/mapbox-gl-js/example/popup-on-hover/'
    ],

    // Geocoding and Search
    geocoding: [
      'https://docs.mapbox.com/api/search/geocoding/',
      'https://docs.mapbox.com/mapbox-gl-js/example/mapbox-gl-geocoder/',
      'https://docs.mapbox.com/playground/geocoding/'
    ],
    search: [
      'https://docs.mapbox.com/api/search/search-box/',
      'https://docs.mapbox.com/playground/search-box/'
    ],

    // Navigation and Directions
    directions: [
      'https://docs.mapbox.com/api/navigation/directions/',
      'https://docs.mapbox.com/playground/directions/'
    ],
    navigation: [
      'https://docs.mapbox.com/ios/navigation/',
      'https://docs.mapbox.com/android/navigation/guides/'
    ],

    // Controls
    control: [
      'https://docs.mapbox.com/mapbox-gl-js/example/navigation/',
      'https://docs.mapbox.com/mapbox-gl-js/example/locate-user/',
      'https://docs.mapbox.com/mapbox-gl-js/api/markers/#navigationcontrol'
    ],

    // Camera and Animation
    camera: [
      'https://docs.mapbox.com/mapbox-gl-js/example/flyto/',
      'https://docs.mapbox.com/mapbox-gl-js/example/fitbounds/',
      'https://docs.mapbox.com/mapbox-gl-js/api/map/#map#flyto'
    ],

    // 3D and Terrain
    terrain: [
      'https://docs.mapbox.com/mapbox-gl-js/example/add-terrain/',
      'https://docs.mapbox.com/mapbox-gl-js/example/3d-buildings/'
    ],

    // Expressions
    expression: [
      'https://docs.mapbox.com/style-spec/reference/expressions/',
      'https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/'
    ]
  };

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

      // Get curated pages based on keywords (high priority)
      const curatedUrls = this.getCuratedPages(extractedKeywords);

      // Stage 1: Fetch documentation index
      const docsIndex = await this.fetchDocumentation();

      // Stage 2: Extract and score relevant URLs from index
      const relevantUrls = this.extractRelevantUrls(
        docsIndex,
        extractedKeywords
      );

      // Combine curated URLs (high priority) with discovered URLs
      const allUrlsToConsider = [
        ...curatedUrls.map((url) => ({ url, score: 1.0 })), // Curated pages get max score
        ...relevantUrls
      ];

      // Remove duplicates, keeping the highest score
      const uniqueUrls = new Map<string, number>();
      allUrlsToConsider.forEach(({ url, score }) => {
        const existing = uniqueUrls.get(url);
        if (!existing || score > existing) {
          uniqueUrls.set(url, score);
        }
      });

      // Stage 3: Fetch curated pages first
      const allLinks: Array<{ url: string; score: number }> = [];
      const allSections: Array<{
        title: string;
        content: string;
        url: string;
      }> = [];

      // Fetch curated pages (always fetch these if matched)
      for (const url of curatedUrls) {
        try {
          const html = await this.fetchHtmlPage(url);
          const sections = this.extractHtmlContent(html, url);
          allSections.push(...sections);
        } catch (error) {
          this.log('warning', `Failed to fetch curated page ${url}: ${error}`);
          // Continue with other pages
        }
      }

      // Stage 4: Fetch top N pages from index (supplement curated pages)
      const indexPagesToFetch = relevantUrls
        .filter((p) => !curatedUrls.includes(p.url))
        .slice(0, this.MAX_PAGES_TO_FETCH);

      for (const { url } of indexPagesToFetch) {
        try {
          const html = await this.fetchHtmlPage(url);

          // Extract sections from this page
          const sections = this.extractHtmlContent(html, url);
          allSections.push(...sections);

          // Extract links from this page for further crawling
          const links = this.extractLinksFromHtml(html, url, extractedKeywords);
          allLinks.push(...links);
        } catch (error) {
          this.log('warning', `Failed to fetch ${url}: ${error}`);
          // Continue with other pages
        }
      }

      // Stage 5: Fetch most relevant linked pages (if we still need more content)
      const alreadyFetched = new Set([
        ...curatedUrls,
        ...indexPagesToFetch.map((p) => p.url)
      ]);
      const linkedPagesToFetch = allLinks
        .filter((link) => !alreadyFetched.has(link.url))
        .slice(0, this.MAX_LINKED_PAGES);

      for (const { url } of linkedPagesToFetch) {
        try {
          const html = await this.fetchHtmlPage(url);
          const sections = this.extractHtmlContent(html, url);
          allSections.push(...sections);
        } catch (error) {
          this.log('warning', `Failed to fetch linked page ${url}: ${error}`);
          // Continue with other pages
        }
      }

      // If no HTML content was extracted, fall back to index content
      if (allSections.length === 0) {
        const indexSections = this.parseSections(docsIndex);
        allSections.push(
          ...indexSections.map((s) => ({
            title: s.title,
            content: s.content,
            url: s.url
          }))
        );
      }

      // Parse and score documentation sections
      const results = this.findRelevantDocs(
        allSections,
        input,
        extractedKeywords
      );

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
   * Get curated pages relevant to the keywords
   */
  private getCuratedPages(keywords: string[]): string[] {
    const curatedUrls = new Set<string>();

    keywords.forEach((keyword) => {
      const keywordLower = keyword.toLowerCase();

      // Try exact match first
      let pages = this.CURATED_PAGES[keywordLower];

      // Try singular form if plural (remove trailing 's')
      if (!pages && keywordLower.endsWith('s')) {
        const singular = keywordLower.slice(0, -1);
        pages = this.CURATED_PAGES[singular];
      }

      // Try plural form if singular (add 's')
      if (!pages && !keywordLower.endsWith('s')) {
        const plural = keywordLower + 's';
        pages = this.CURATED_PAGES[plural];
      }

      if (pages) {
        pages.forEach((url) => curatedUrls.add(url));
      }
    });

    return Array.from(curatedUrls);
  }

  /**
   * Extract and score URLs from llms.txt index
   */
  private extractRelevantUrls(
    docs: string,
    keywords: string[]
  ): Array<{ url: string; score: number; context: string }> {
    const lines = docs.split('\n');
    const urls: Array<{ url: string; score: number; context: string }> = [];

    let currentSection = '';
    for (const line of lines) {
      // Track section headers for context
      if (line.startsWith('##')) {
        currentSection = line.replace(/^##\s+/, '').trim();
      }

      // Extract URLs from markdown links
      const urlMatch = line.match(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/);
      if (urlMatch) {
        const [, linkText, url] = urlMatch;
        const context = `${currentSection} - ${linkText}`;

        // Score URL based on keywords in context and URL
        let score = 0;
        const contextLower = context.toLowerCase();
        const urlLower = url.toLowerCase();

        keywords.forEach((keyword) => {
          if (contextLower.includes(keyword)) {
            score += 0.3;
          }
          if (urlLower.includes(keyword)) {
            score += 0.2;
          }
        });

        // Boost for API reference and guide pages
        if (url.includes('/api/') || url.includes('/guides/')) {
          score += 0.1;
        }

        if (score > 0) {
          urls.push({ url, score, context });
        }
      }
    }

    // Sort by score and return top results
    return urls.sort((a, b) => b.score - a.score);
  }

  /**
   * Fetch and parse HTML documentation page
   */
  private async fetchHtmlPage(url: string): Promise<string> {
    // Check cache
    const cached = this.htmlPagesCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.content;
    }

    // Fetch page
    const response = await this.httpRequest(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const content = await response.text();

    // Update cache
    this.htmlPagesCache.set(url, {
      content,
      timestamp: Date.now()
    });

    return content;
  }

  /**
   * Extract and score links from HTML page
   */
  private extractLinksFromHtml(
    html: string,
    baseUrl: string,
    keywords: string[]
  ): Array<{ url: string; score: number; text: string }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { document } = parseHTML(html) as any;
      const links: Array<{ url: string; score: number; text: string }> = [];
      const seenUrls = new Set<string>();

      // Find all links
      const anchors = document.querySelectorAll('a[href]');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const anchor of Array.from(anchors) as any[]) {
        const href = anchor.getAttribute('href');
        if (!href) continue;

        // Resolve relative URLs
        let url: string;
        try {
          url = new URL(href, baseUrl).href;
        } catch {
          continue;
        }

        // Skip if already seen or not a docs.mapbox.com URL
        if (seenUrls.has(url) || !url.startsWith('https://docs.mapbox.com/')) {
          continue;
        }
        seenUrls.add(url);

        const linkText = anchor.textContent?.trim() || '';
        const urlLower = url.toLowerCase();
        const textLower = linkText.toLowerCase();

        let score = 0;

        // Score based on keywords
        keywords.forEach((keyword) => {
          if (urlLower.includes(keyword)) {
            score += 0.4;
          }
          if (textLower.includes(keyword)) {
            score += 0.3;
          }
        });

        // Boost for examples and API reference pages
        if (url.includes('/example/')) {
          score += 0.3;
        }
        if (url.includes('/api/')) {
          score += 0.2;
        }
        if (url.includes('/guides/')) {
          score += 0.2;
        }

        // Skip low-scoring links
        if (score > 0.2) {
          links.push({ url, score, text: linkText });
        }
      }

      // Sort by score
      return links.sort((a, b) => b.score - a.score);
    } catch (error) {
      this.log('warning', `Failed to extract links from ${baseUrl}: ${error}`);
      return [];
    }
  }

  /**
   * Extract meaningful content from HTML page
   */
  private extractHtmlContent(
    html: string,
    url: string
  ): Array<{
    title: string;
    content: string;
    url: string;
  }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { document } = parseHTML(html) as any;
      const sections: Array<{ title: string; content: string; url: string }> =
        [];

      // Extract meta description as fallback
      const metaDescription =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content') || '';
      const pageTitle =
        document.querySelector('title')?.textContent?.trim() ||
        url.split('/').pop() ||
        'Documentation';

      // Try to find main content area (Docusaurus-specific selectors first)
      const mainContent =
        document.querySelector('article') ||
        document.querySelector('[id*="docs-content"]') ||
        document.querySelector('.markdown') ||
        document.querySelector('main') ||
        document.querySelector('.content') ||
        document.querySelector('#content') ||
        document.body;

      if (!mainContent) {
        // Return meta description as fallback
        if (metaDescription) {
          return [
            {
              title: pageTitle,
              content: metaDescription,
              url
            }
          ];
        }
        return [];
      }

      // Extract sections based on headings
      const headings = mainContent.querySelectorAll('h1, h2, h3, h4');
      const headingArray = Array.from(headings) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any

      if (headingArray.length > 0) {
        // Extract content by heading sections
        for (const heading of headingArray) {
          const title = heading.textContent?.trim() || '';
          if (!title) continue;

          // Get content until next heading
          let content = '';
          let currentElement = heading.nextElementSibling;

          while (
            currentElement &&
            !['H1', 'H2', 'H3', 'H4'].includes(currentElement.tagName)
          ) {
            const text = currentElement.textContent?.trim();
            if (text) {
              content += text + '\n\n';
            }
            currentElement = currentElement.nextElementSibling;
          }

          if (content.trim()) {
            sections.push({
              title,
              content: content.trim(),
              url
            });
          }
        }
      }

      // If no heading-based sections found, extract all paragraphs and create one section
      if (sections.length === 0) {
        const paragraphs = mainContent.querySelectorAll('p, li, code, pre');
        let allContent = '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const para of Array.from(paragraphs) as any[]) {
          const text = para.textContent?.trim();
          if (text && text.length > 20) {
            // Skip very short snippets
            allContent += text + '\n\n';
          }
        }

        if (allContent.trim()) {
          sections.push({
            title: pageTitle,
            content: allContent.trim().substring(0, 2000), // Limit to 2000 chars
            url
          });
        } else if (metaDescription) {
          // Final fallback to meta description
          sections.push({
            title: pageTitle,
            content: metaDescription,
            url
          });
        }
      }

      return sections;
    } catch (error) {
      this.log('warning', `Failed to parse HTML from ${url}: ${error}`);
      return [];
    }
  }

  /**
   * Find relevant documentation sections
   */
  private findRelevantDocs(
    sections: Array<{
      title: string;
      content: string;
      url: string;
    }>,
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
    const scoredSections = sections
      .map((section) => {
        const score = this.calculateRelevance(
          {
            title: section.title,
            content: section.content,
            category: this.categorizeSection(section.title, section.content)
          },
          keywords,
          input
        );
        const reason = this.explainMatch(section, keywords, input);
        return {
          title: section.title,
          excerpt: this.extractExcerpt(section.content),
          category: this.categorizeSection(section.title, section.content),
          url: section.url,
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
