// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import {
  getCoreTools,
  getElicitationTools,
  getResourceFallbackTools,
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

      // Verify some expected core tools
      expect(toolNames).toContain('list_styles_tool');
      expect(toolNames).toContain('create_style_tool');
      expect(toolNames).toContain('style_builder_tool');
      expect(toolNames).toContain('validate_style_tool');
    });

    it('should not include elicitation-dependent tools', () => {
      const coreTools = getCoreTools();
      const toolNames = coreTools.map((tool) => tool.name);

      // Elicitation tools should not be in core
      expect(toolNames).not.toContain('preview_style_tool');
      expect(toolNames).not.toContain('style_comparison_tool');
    });

    it('should not include resource fallback tools', () => {
      const coreTools = getCoreTools();
      const toolNames = coreTools.map((tool) => tool.name);

      // Resource fallback tools should not be in core
      expect(toolNames).not.toContain('get_reference_tool');
    });
  });

  describe('getElicitationTools', () => {
    it('should return an array of elicitation tools', () => {
      const elicitationTools = getElicitationTools();
      expect(Array.isArray(elicitationTools)).toBe(true);
      expect(elicitationTools.length).toBe(2);
    });

    it('should include preview_style_tool', () => {
      const elicitationTools = getElicitationTools();
      const toolNames = elicitationTools.map((tool) => tool.name);
      expect(toolNames).toContain('preview_style_tool');
    });

    it('should include style_comparison_tool', () => {
      const elicitationTools = getElicitationTools();
      const toolNames = elicitationTools.map((tool) => tool.name);
      expect(toolNames).toContain('style_comparison_tool');
    });
  });

  describe('getResourceFallbackTools', () => {
    it('should return an array of resource fallback tools', () => {
      const resourceFallbackTools = getResourceFallbackTools();
      expect(Array.isArray(resourceFallbackTools)).toBe(true);
      expect(resourceFallbackTools.length).toBe(1);
    });

    it('should include get_reference_tool', () => {
      const resourceFallbackTools = getResourceFallbackTools();
      const toolNames = resourceFallbackTools.map((tool) => tool.name);
      expect(toolNames).toContain('get_reference_tool');
    });
  });

  describe('getAllTools', () => {
    it('should return all tools combined', () => {
      const allTools = getAllTools();
      const coreTools = getCoreTools();
      const elicitationTools = getElicitationTools();
      const resourceFallbackTools = getResourceFallbackTools();

      expect(allTools.length).toBe(
        coreTools.length +
          elicitationTools.length +
          resourceFallbackTools.length
      );
    });

    it('should have no duplicate tools', () => {
      const allTools = getAllTools();
      const toolNames = allTools.map((tool) => tool.name);
      const uniqueToolNames = new Set(toolNames);

      expect(toolNames.length).toBe(uniqueToolNames.size);
    });

    it('should include tools from all categories', () => {
      const allTools = getAllTools();
      const toolNames = allTools.map((tool) => tool.name);

      // Core tool
      expect(toolNames).toContain('list_styles_tool');
      // Elicitation tool
      expect(toolNames).toContain('preview_style_tool');
      // Resource fallback tool
      expect(toolNames).toContain('get_reference_tool');
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

    it('should have no overlap between core and resource fallback tools', () => {
      const coreToolNames = getCoreTools().map((tool) => tool.name);
      const resourceFallbackToolNames = getResourceFallbackTools().map(
        (tool) => tool.name
      );

      const overlap = coreToolNames.filter((name) =>
        resourceFallbackToolNames.includes(name)
      );
      expect(overlap).toEqual([]);
    });

    it('should have no overlap between elicitation and resource fallback tools', () => {
      const elicitationToolNames = getElicitationTools().map(
        (tool) => tool.name
      );
      const resourceFallbackToolNames = getResourceFallbackTools().map(
        (tool) => tool.name
      );

      const overlap = elicitationToolNames.filter((name) =>
        resourceFallbackToolNames.includes(name)
      );
      expect(overlap).toEqual([]);
    });
  });
});
