// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi } from 'vitest';
import { SearchMapboxDocsTool } from '../../../src/tools/search-mapbox-docs-tool/SearchMapboxDocsTool.js';
import type { HttpRequest } from '../../../src/utils/types.js';

// Mock documentation content for testing
const MOCK_DOCS = `# Mapbox Geocoding API

The Mapbox Geocoding API allows you to convert location text into geographic coordinates and vice versa.

## Forward Geocoding

Forward geocoding converts location text into geographic coordinates. Rate limit: 600 requests per minute.

## Reverse Geocoding

Reverse geocoding converts coordinates into location text.

# Mapbox GL JS SDK

Mapbox GL JS is a JavaScript library for interactive maps.

## Custom Markers

Learn how to add custom markers to your map with images and popups.

## Data-Driven Styling

Use data properties to style your map layers dynamically.

# Mapbox Directions API

Get optimal routes between coordinates.

## Route Optimization

Optimize routes for multiple waypoints.
`;

describe('SearchMapboxDocsTool', () => {
  const mockHttpRequest: HttpRequest = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => MOCK_DOCS,
    json: async () => ({}),
    headers: new Headers()
  })) as unknown as HttpRequest;

  it('should have correct tool metadata', () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });
    expect(tool.name).toBe('search_mapbox_docs_tool');
    expect(tool.description).toContain('Search Mapbox documentation');
    expect(tool.annotations.readOnlyHint).toBe(true);
    expect(tool.annotations.destructiveHint).toBe(false);
  });

  it('should search and return relevant results', async () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });

    const result = await tool.run({
      query: 'geocoding rate limits',
      limit: 5
    });

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty('results');
    expect(response).toHaveProperty('query', 'geocoding rate limits');
    expect(response).toHaveProperty('totalResults');
    expect(response.results).toBeInstanceOf(Array);

    // Should find the geocoding section
    expect(response.results.length).toBeGreaterThan(0);
    const topResult = response.results[0];
    expect(topResult).toHaveProperty('title');
    expect(topResult).toHaveProperty('excerpt');
    expect(topResult).toHaveProperty('category');
    expect(topResult).toHaveProperty('relevanceScore');
  });

  it('should filter results by category', async () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });

    const result = await tool.run({
      query: 'markers',
      category: 'sdks',
      limit: 5
    });

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text);

    expect(response.category).toBe('sdks');
    // All results should be from SDKs category
    response.results.forEach((r: { category: string }) => {
      expect(r.category).toBe('sdks');
    });
  });

  it('should respect the limit parameter', async () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });

    const result = await tool.run({
      query: 'mapbox',
      limit: 2
    });

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text);

    expect(response.results.length).toBeLessThanOrEqual(2);
  });

  it('should use default limit when not specified', async () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });

    const result = await tool.run({
      query: 'api'
    });

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text);

    // Default limit is 5
    expect(response.results.length).toBeLessThanOrEqual(5);
  });

  it('should return structured content', async () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });

    const result = await tool.run({
      query: 'directions',
      limit: 3
    });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toBeDefined();

    const structured = result.structuredContent as {
      results: unknown[];
      query: string;
      totalResults: number;
    };
    expect(structured).toHaveProperty('results');
    expect(structured).toHaveProperty('query', 'directions');
    expect(structured).toHaveProperty('totalResults');
  });

  it('should rank results by relevance', async () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });

    const result = await tool.run({
      query: 'geocoding',
      limit: 10
    });

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text);

    // Results should be sorted by relevance score (descending)
    for (let i = 1; i < response.results.length; i++) {
      expect(response.results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
        response.results[i].relevanceScore
      );
    }
  });

  it('should include excerpts with relevant content', async () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });

    const result = await tool.run({
      query: 'rate limit',
      limit: 5
    });

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text);

    if (response.results.length > 0) {
      const topResult = response.results[0];
      expect(topResult.excerpt).toBeTruthy();
      expect(topResult.excerpt.toLowerCase()).toContain('rate');
    }
  });

  it('should handle HTTP errors gracefully', async () => {
    const errorHttpRequest: HttpRequest = vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => '',
      json: async () => ({}),
      headers: new Headers()
    })) as unknown as HttpRequest;

    const tool = new SearchMapboxDocsTool({ httpRequest: errorHttpRequest });

    const result = await tool.run({
      query: 'test',
      limit: 5
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
  });

  it('should cache documentation for performance', async () => {
    const spyHttpRequest = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => MOCK_DOCS,
      json: async () => ({}),
      headers: new Headers()
    })) as unknown as HttpRequest;

    const tool = new SearchMapboxDocsTool({ httpRequest: spyHttpRequest });

    // First search
    await tool.run({ query: 'geocoding', limit: 5 });
    expect(spyHttpRequest).toHaveBeenCalledTimes(1);

    // Second search should use cache
    await tool.run({ query: 'markers', limit: 5 });
    expect(spyHttpRequest).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it('should categorize sections correctly', async () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });

    const result = await tool.run({
      query: 'mapbox',
      limit: 10
    });

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text);

    // Check that results have valid categories
    response.results.forEach((r: { category: string }) => {
      expect(['apis', 'sdks', 'guides', 'examples', 'general']).toContain(
        r.category
      );
    });
  });

  it('should handle empty query results', async () => {
    const tool = new SearchMapboxDocsTool({ httpRequest: mockHttpRequest });

    const result = await tool.run({
      query: 'xyzzzzzzzznonexistent',
      limit: 5
    });

    expect(result.isError).toBe(false);
    const response = JSON.parse(result.content[0].text);

    expect(response.results).toEqual([]);
    expect(response.totalResults).toBe(0);
  });
});
