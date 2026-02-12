import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetContextualDocsTool } from '../../../src/tools/get-contextual-docs-tool/GetContextualDocsTool.js';
import type { HttpRequest } from '../../../src/utils/types.js';

describe('GetContextualDocsTool', () => {
  let httpRequest: HttpRequest;
  let tool: GetContextualDocsTool;

  const mockDocumentation = `
# Mapbox GL JS

Mapbox GL JS is a JavaScript library for interactive, customizable vector maps on the web.

https://docs.mapbox.com/mapbox-gl-js/

## Markers and Popups

Learn how to add markers and popups to your map.

Markers are used to indicate specific locations on a map. Popups provide additional information when markers are clicked.

https://docs.mapbox.com/mapbox-gl-js/example/add-a-marker/

## Handling Errors

Common errors and how to fix them.

Style is not done loading: This error occurs when you try to add layers before the style has finished loading. Use the 'load' event to ensure the style is ready.

https://docs.mapbox.com/help/troubleshooting/

## Rate Limits

API rate limits and best practices.

The Geocoding API has a rate limit of 600 requests per minute. Implement caching and throttling to avoid hitting limits.

https://docs.mapbox.com/api/search/geocoding/#rate-limits
`;

  beforeEach(() => {
    httpRequest = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => mockDocumentation
    });

    tool = new GetContextualDocsTool({ httpRequest });
  });

  describe('Basic functionality', () => {
    it('should retrieve relevant documentation based on context', async () => {
      const result = await tool.run({
        context: 'adding custom markers with popups to a map'
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent).toBeDefined();

      const output = result.structuredContent as any;
      expect(output.results).toBeDefined();
      expect(output.results.length).toBeGreaterThan(0);
      expect(output.extractedKeywords).toContain('markers');
      expect(output.extractedKeywords).toContain('popups');
    });

    it('should extract keywords from code snippets', async () => {
      const result = await tool.run({
        context: 'working with map layers',
        codeSnippet: 'map.addLayer({type: "symbol", ...})'
      });

      expect(result.isError).toBe(false);
      const output = result.structuredContent as any;
      expect(output.extractedKeywords).toContain('map');
      expect(output.extractedKeywords).toContain('layer');
    });

    it('should provide troubleshooting tips for error messages', async () => {
      const result = await tool.run({
        context: 'getting an error when adding layers',
        errorMessage: 'Style is not done loading'
      });

      expect(result.isError).toBe(false);
      const output = result.structuredContent as any;
      expect(output.troubleshootingTips).toBeDefined();
      expect(output.troubleshootingTips.length).toBeGreaterThan(0);
    });

    it('should filter by technology when specified', async () => {
      const result = await tool.run({
        context: 'building a web map',
        technology: 'mapbox-gl-js'
      });

      expect(result.isError).toBe(false);
      const output = result.structuredContent as any;
      expect(output.extractedKeywords).toContain('mapbox-gl-js');
    });

    it('should respect the limit parameter', async () => {
      const result = await tool.run({
        context: 'mapbox maps',
        limit: 2
      });

      expect(result.isError).toBe(false);
      const output = result.structuredContent as any;
      expect(output.results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Relevance scoring', () => {
    it('should rank results by relevance', async () => {
      const result = await tool.run({
        context: 'rate limiting in geocoding API'
      });

      expect(result.isError).toBe(false);
      const output = result.structuredContent as any;

      // Results should be sorted by relevance score
      for (let i = 0; i < output.results.length - 1; i++) {
        expect(output.results[i].relevanceScore).toBeGreaterThanOrEqual(
          output.results[i + 1].relevanceScore
        );
      }
    });

    it('should provide match reasons for results', async () => {
      const result = await tool.run({
        context: 'adding markers to a map'
      });

      expect(result.isError).toBe(false);
      const output = result.structuredContent as any;

      // At least one result should have a match reason
      expect(output.results.length).toBeGreaterThan(0);
      const resultWithReason = output.results.find((r: any) => r.matchReason);
      expect(resultWithReason).toBeDefined();
    });
  });

  describe('Suggestions', () => {
    it('should suggest related topics', async () => {
      const result = await tool.run({
        context: 'working with map markers'
      });

      expect(result.isError).toBe(false);
      const output = result.structuredContent as any;
      expect(output.suggestedTopics).toBeDefined();
      expect(output.suggestedTopics.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle HTTP errors gracefully', async () => {
      httpRequest = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      tool = new GetContextualDocsTool({ httpRequest });

      const result = await tool.run({
        context: 'test context'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle network errors', async () => {
      httpRequest = vi.fn().mockRejectedValue(new Error('Network error'));

      tool = new GetContextualDocsTool({ httpRequest });

      const result = await tool.run({
        context: 'test context'
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should cache documentation for subsequent requests', async () => {
      await tool.run({ context: 'first request' });
      await tool.run({ context: 'second request' });

      // HTTP request should only be called once due to caching
      expect(httpRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Output formatting', () => {
    it('should return both text and structured content', async () => {
      const result = await tool.run({
        context: 'adding markers'
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.structuredContent).toBeDefined();
    });

    it('should format text output as markdown', async () => {
      const result = await tool.run({
        context: 'adding markers',
        errorMessage: 'test error'
      });

      const text = result.content[0].text as string;
      expect(text).toContain('#');
      expect(text).toContain('**');
      expect(text).toContain('Troubleshooting Tips');
    });
  });
});
