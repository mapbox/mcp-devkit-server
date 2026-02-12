// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

/**
 * Parsed documentation section
 */
export interface DocSection {
  title: string;
  content: string;
}

/**
 * Category type for documentation sections
 */
export type DocCategory = 'apis' | 'sdks' | 'guides' | 'examples' | 'reference';

/**
 * Parse Mapbox documentation into sections
 */
export function parseDocSections(content: string): DocSection[] {
  const sections: DocSection[] = [];
  const lines = content.split('\n');

  let currentSection: DocSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Detect section headers (lines starting with ##)
    if (line.startsWith('##')) {
      // Save previous section if exists
      if (currentSection && currentContent.length > 0) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
      }

      // Start new section
      const title = line.replace(/^##\s*/, '').trim();
      currentSection = {
        title,
        content: ''
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
 * Categorize a section based on its title
 */
export function categorizeSection(title: string): DocCategory {
  const lower = title.toLowerCase();

  // APIs category
  if (
    lower.includes('api') &&
    !lower.includes('playground') &&
    !lower.includes('sdk') &&
    !lower.includes('libraries')
  ) {
    return 'apis';
  }

  // SDKs category
  if (
    lower.includes('sdk') ||
    lower.includes('library') ||
    lower.includes('libraries') ||
    lower.includes('client')
  ) {
    return 'sdks';
  }

  // Examples category
  if (
    lower.includes('playground') ||
    lower.includes('demo') ||
    lower.includes('example')
  ) {
    return 'examples';
  }

  // Guides category
  if (
    lower.includes('design') ||
    lower.includes('studio') ||
    lower.includes('manual') ||
    lower.includes('guide')
  ) {
    return 'guides';
  }

  // Everything else is reference
  return 'reference';
}

/**
 * Filter sections by category
 */
export function filterSectionsByCategory(
  sections: DocSection[],
  category: DocCategory
): DocSection[] {
  return sections.filter(
    (section) => categorizeSection(section.title) === category
  );
}

/**
 * Convert sections back to markdown
 */
export function sectionsToMarkdown(sections: DocSection[]): string {
  return sections
    .map((section) => `## ${section.title}\n\n${section.content}`)
    .join('\n\n');
}
