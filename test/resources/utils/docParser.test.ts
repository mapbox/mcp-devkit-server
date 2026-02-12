// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import {
  parseDocSections,
  categorizeSection,
  filterSectionsByCategory,
  sectionsToMarkdown
} from '../../../src/resources/utils/docParser.js';

describe('docParser', () => {
  const MOCK_DOCS = `# Mapbox Documentation

> Introduction text

## Maps client libraries & SDKs

- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [iOS SDK](https://docs.mapbox.com/ios/)

## Geocoding API

- [API Docs](https://docs.mapbox.com/api/search/geocoding/)
- [API Playground](https://docs.mapbox.com/playground/geocoding/)

## Map Design

- [Studio Manual](https://docs.mapbox.com/studio-manual/)

## API Playgrounds

- [Static Images Playground](https://docs.mapbox.com/playground/static/)

## Mapbox Tilesets

- [Tileset Reference](https://docs.mapbox.com/data/tilesets/reference/)
`;

  describe('parseDocSections', () => {
    it('should parse documentation into sections', () => {
      const sections = parseDocSections(MOCK_DOCS);

      expect(sections).toHaveLength(5);
      expect(sections[0].title).toBe('Maps client libraries & SDKs');
      expect(sections[0].content).toContain('Mapbox GL JS');
      expect(sections[1].title).toBe('Geocoding API');
      expect(sections[2].title).toBe('Map Design');
    });

    it('should handle empty content', () => {
      const sections = parseDocSections('');
      expect(sections).toEqual([]);
    });

    it('should handle content without sections', () => {
      const sections = parseDocSections('Some text without sections');
      expect(sections).toEqual([]);
    });
  });

  describe('categorizeSection', () => {
    it('should categorize API sections', () => {
      expect(categorizeSection('Geocoding API')).toBe('apis');
      expect(categorizeSection('Directions API')).toBe('apis');
      expect(categorizeSection('Tiling & rendering APIs')).toBe('apis');
    });

    it('should categorize SDK sections', () => {
      expect(categorizeSection('Maps client libraries & SDKs')).toBe('sdks');
      expect(categorizeSection('Navigation SDK')).toBe('sdks');
      expect(categorizeSection('Android Core library')).toBe('sdks');
    });

    it('should categorize guide sections', () => {
      expect(categorizeSection('Map Design')).toBe('guides');
      expect(categorizeSection('Studio Manual')).toBe('guides');
    });

    it('should categorize example sections', () => {
      expect(categorizeSection('API Playgrounds')).toBe('examples');
      expect(categorizeSection('Demo Projects')).toBe('examples');
    });

    it('should categorize reference sections by default', () => {
      expect(categorizeSection('Mapbox Tilesets')).toBe('reference');
      expect(categorizeSection('Accounts and Pricing')).toBe('reference');
      expect(categorizeSection('Random Section')).toBe('reference');
    });
  });

  describe('filterSectionsByCategory', () => {
    it('should filter sections by category', () => {
      const sections = parseDocSections(MOCK_DOCS);

      const apiSections = filterSectionsByCategory(sections, 'apis');
      expect(apiSections).toHaveLength(1);
      expect(apiSections[0].title).toBe('Geocoding API');

      const sdkSections = filterSectionsByCategory(sections, 'sdks');
      expect(sdkSections).toHaveLength(1);
      expect(sdkSections[0].title).toBe('Maps client libraries & SDKs');

      const guideSections = filterSectionsByCategory(sections, 'guides');
      expect(guideSections).toHaveLength(1);
      expect(guideSections[0].title).toBe('Map Design');

      const exampleSections = filterSectionsByCategory(sections, 'examples');
      expect(exampleSections).toHaveLength(1);
      expect(exampleSections[0].title).toBe('API Playgrounds');

      const referenceSections = filterSectionsByCategory(sections, 'reference');
      expect(referenceSections).toHaveLength(1);
      expect(referenceSections[0].title).toBe('Mapbox Tilesets');
    });

    it('should return empty array when no sections match', () => {
      const sections = parseDocSections('## Some Random Section\n\nContent');
      const apiSections = filterSectionsByCategory(sections, 'apis');
      expect(apiSections).toEqual([]);
    });
  });

  describe('sectionsToMarkdown', () => {
    it('should convert sections back to markdown', () => {
      const sections = [
        { title: 'Section 1', content: 'Content 1' },
        { title: 'Section 2', content: 'Content 2' }
      ];

      const markdown = sectionsToMarkdown(sections);

      expect(markdown).toContain('## Section 1');
      expect(markdown).toContain('Content 1');
      expect(markdown).toContain('## Section 2');
      expect(markdown).toContain('Content 2');
    });

    it('should handle empty sections array', () => {
      const markdown = sectionsToMarkdown([]);
      expect(markdown).toBe('');
    });
  });
});
