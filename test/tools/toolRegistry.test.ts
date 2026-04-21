// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import {
  getCoreTools,
  getElicitationTools,
  getAllTools
} from '../../src/tools/toolRegistry.js';

describe('Tool Registry', () => {
  describe('getCoreTools', () => {
    it('should return an array of core tools', () => {
      const coreTools = getCoreTools();
      expect(Array.isArray(coreTools)).toBe(true);
      expect(coreTools.length).toBeGreaterThan(0);
    });

    it('should include expected core tools', () => {
      const coreTools = getCoreTools();
      const toolNames = coreTools.map((tool) => tool.name);

      expect(toolNames).toContain('list_styles_tool');
      expect(toolNames).toContain('create_style_tool');
      expect(toolNames).toContain('style_builder_tool');
      expect(toolNames).toContain('validate_style_tool');
    });

    it('should include preview and comparison tools (until elicitation support is added)', () => {
      const coreTools = getCoreTools();
      const toolNames = coreTools.map((tool) => tool.name);

      expect(toolNames).toContain('preview_style_tool');
      expect(toolNames).toContain('style_comparison_tool');
    });
  });

  describe('getElicitationTools', () => {
    it('should return an array of elicitation tools', () => {
      const elicitationTools = getElicitationTools();
      expect(Array.isArray(elicitationTools)).toBe(true);
    });

    it('should currently be empty (elicitation support pending)', () => {
      const elicitationTools = getElicitationTools();
      expect(elicitationTools.length).toBe(0);
    });
  });

  describe('getAllTools', () => {
    it('should return all tools combined', () => {
      const allTools = getAllTools();
      const coreTools = getCoreTools();
      const elicitationTools = getElicitationTools();

      expect(allTools.length).toBe(coreTools.length + elicitationTools.length);
    });

    it('should have no duplicate tools', () => {
      const allTools = getAllTools();
      const toolNames = allTools.map((tool) => tool.name);
      const uniqueToolNames = new Set(toolNames);

      expect(toolNames.length).toBe(uniqueToolNames.size);
    });

    it('should include expected tools', () => {
      const allTools = getAllTools();
      const toolNames = allTools.map((tool) => tool.name);

      expect(toolNames).toContain('list_styles_tool');
      expect(toolNames).toContain('preview_style_tool');
    });
  });

  describe('Tool categorization consistency', () => {
    it('should have no overlap between core and elicitation tools', () => {
      const coreToolNames = getCoreTools().map((tool) => tool.name);
      const elicitationToolNames = getElicitationTools().map(
        (tool) => tool.name
      );

      const overlap = coreToolNames.filter((name) =>
        elicitationToolNames.includes(name)
      );
      expect(overlap).toEqual([]);
    });
  });
});
