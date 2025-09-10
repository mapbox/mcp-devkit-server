import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import {
  parseToolConfigFromArgs,
  filterTools,
  ToolConfig
} from '../../src/config/toolConfig.js';

// Mock getVersionInfo to avoid import.meta.url issues in vitest
vi.mock('../../src/utils/versionUtils.js', () => ({
  getVersionInfo: vi.fn(() => ({
    name: 'Mapbox MCP devkit server',
    version: '1.0.0',
    sha: 'mock-sha',
    tag: 'mock-tag',
    branch: 'mock-branch'
  }))
}));

describe('Tool Configuration', () => {
  // Save original argv
  const originalArgv = process.argv;

  beforeEach(() => {
    // Reset argv before each test
    process.argv = [...originalArgv];
  });

  afterAll(() => {
    // Restore original argv
    process.argv = originalArgv;
  });

  describe('parseToolConfigFromArgs', () => {
    it('should return empty config when no arguments provided', () => {
      process.argv = ['node', 'index.js'];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({});
    });

    it('should parse --enable-tools with single tool', () => {
      process.argv = ['node', 'index.js', '--enable-tools', 'list_styles_tool'];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({
        enabledTools: ['list_styles_tool']
      });
    });

    it('should parse --enable-tools with multiple tools', () => {
      process.argv = [
        'node',
        'index.js',
        '--enable-tools',
        'list_styles_tool,create_style_tool,preview_style_tool'
      ];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({
        enabledTools: [
          'list_styles_tool',
          'create_style_tool',
          'preview_style_tool'
        ]
      });
    });

    it('should trim whitespace from tool names', () => {
      process.argv = [
        'node',
        'index.js',
        '--enable-tools',
        'list_styles_tool , create_style_tool , preview_style_tool'
      ];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({
        enabledTools: [
          'list_styles_tool',
          'create_style_tool',
          'preview_style_tool'
        ]
      });
    });

    it('should parse --disable-tools with single tool', () => {
      process.argv = [
        'node',
        'index.js',
        '--disable-tools',
        'delete_style_tool'
      ];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({
        disabledTools: ['delete_style_tool']
      });
    });

    it('should parse --disable-tools with multiple tools', () => {
      process.argv = [
        'node',
        'index.js',
        '--disable-tools',
        'delete_style_tool,update_style_tool'
      ];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({
        disabledTools: ['delete_style_tool', 'update_style_tool']
      });
    });

    it('should parse both --enable-tools and --disable-tools', () => {
      process.argv = [
        'node',
        'index.js',
        '--enable-tools',
        'list_styles_tool',
        '--disable-tools',
        'delete_style_tool'
      ];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({
        enabledTools: ['list_styles_tool'],
        disabledTools: ['delete_style_tool']
      });
    });

    it('should handle missing value for --enable-tools', () => {
      process.argv = ['node', 'index.js', '--enable-tools'];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({});
    });

    it('should handle missing value for --disable-tools', () => {
      process.argv = ['node', 'index.js', '--disable-tools'];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({});
    });

    it('should ignore unknown arguments', () => {
      process.argv = [
        'node',
        'index.js',
        '--unknown-arg',
        'value',
        '--enable-tools',
        'list_styles_tool'
      ];
      const config = parseToolConfigFromArgs();
      expect(config).toEqual({
        enabledTools: ['list_styles_tool']
      });
    });
  });

  describe('filterTools', () => {
    // Mock tools for testing
    const mockTools = [
      { name: 'list_styles_tool', description: 'List styles' },
      { name: 'create_style_tool', description: 'Create style' },
      { name: 'delete_style_tool', description: 'Delete style' },
      { name: 'preview_style_tool', description: 'Preview style' }
    ] as any;

    it('should return all tools when no config provided', () => {
      const config: ToolConfig = {};
      const filtered = filterTools(mockTools, config);
      expect(filtered).toEqual(mockTools);
    });

    it('should filter tools based on enabledTools', () => {
      const config: ToolConfig = {
        enabledTools: ['list_styles_tool', 'create_style_tool']
      };
      const filtered = filterTools(mockTools, config);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.name)).toEqual([
        'list_styles_tool',
        'create_style_tool'
      ]);
    });

    it('should filter tools based on disabledTools', () => {
      const config: ToolConfig = {
        disabledTools: ['delete_style_tool', 'preview_style_tool']
      };
      const filtered = filterTools(mockTools, config);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.name)).toEqual([
        'list_styles_tool',
        'create_style_tool'
      ]);
    });

    it('should prioritize enabledTools over disabledTools', () => {
      const config: ToolConfig = {
        enabledTools: ['list_styles_tool'],
        disabledTools: ['list_styles_tool', 'create_style_tool']
      };
      const filtered = filterTools(mockTools, config);
      expect(filtered).toHaveLength(1);
      expect(filtered.map((t) => t.name)).toEqual(['list_styles_tool']);
    });

    it('should handle non-existent tool names gracefully', () => {
      const config: ToolConfig = {
        enabledTools: ['list_styles_tool', 'non_existent_tool']
      };
      const filtered = filterTools(mockTools, config);
      expect(filtered).toHaveLength(1);
      expect(filtered.map((t) => t.name)).toEqual(['list_styles_tool']);
    });

    it('should return empty array when enabledTools is empty', () => {
      const config: ToolConfig = {
        enabledTools: []
      };
      const filtered = filterTools(mockTools, config);
      expect(filtered).toHaveLength(0);
    });

    it('should return all tools when disabledTools is empty', () => {
      const config: ToolConfig = {
        disabledTools: []
      };
      const filtered = filterTools(mockTools, config);
      expect(filtered).toEqual(mockTools);
    });
  });
});
