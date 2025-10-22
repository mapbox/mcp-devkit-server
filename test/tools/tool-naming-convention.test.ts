import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseTool } from '../../src/tools/BaseTool.js';
import { pathToFileURL } from 'node:url';

async function discoverTools(): Promise<any[]> {
  const toolsDir = path.resolve(
    new URL('.', import.meta.url).pathname,
    '../../src/tools'
  );
  const tools: any[] = [];

  // Find all directories that end with '-tool'
  const entries = fs.readdirSync(toolsDir, { withFileTypes: true });
  const toolDirectories = entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('-tool'))
    .map((entry) => entry.name);

  // Dynamically import each tool
  for (const toolDir of toolDirectories) {
    const allFiles = fs.readdirSync(path.join(toolsDir, toolDir));
    const toolFiles = allFiles.filter(
      (file) => file.endsWith('.ts') && file.includes('Tool')
    );

    // Import all tool files in the directory
    for (const toolFile of toolFiles) {
      try {
        const modulePath = pathToFileURL(
          path.join(toolsDir, toolDir, toolFile.replace('.ts', '.js'))
        ).href;
        const module = await import(modulePath);

        // Find all exported tool classes
        const toolClasses = Object.values(module).filter(
          (exp: any) =>
            exp && exp.prototype && exp.prototype instanceof BaseTool
        );

        for (const toolClass of toolClasses) {
          tools.push(new (toolClass as any)());
        }
      } catch (error) {
        console.warn(
          `Failed to import tool from ${toolDir}/${toolFile}: ${error}`
        );
      }
    }
  }

  return tools;
}

describe('Tool Naming Convention', () => {
  it('should enforce snake_case naming with _tool suffix for all tool names', async () => {
    // Snake case pattern: lowercase letters, numbers, and underscores only
    // Must start with a letter, no consecutive underscores
    // Must end with "_tool" suffix
    const snakeCasePattern = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
    const toolSuffixPattern = /_tool$/;

    // Dynamically discover all tool instances
    const tools = await discoverTools();

    const violations: string[] = [];

    expect(tools.length).toBeGreaterThan(0); // Ensure we found some tools

    // Check each tool's name
    for (const tool of tools) {
      const toolName = tool.name;
      const className = tool.constructor.name;

      if (!snakeCasePattern.test(toolName)) {
        violations.push(
          `${className}: "${toolName}" is not in snake_case format`
        );
      }

      if (!toolSuffixPattern.test(toolName)) {
        violations.push(
          `${className}: "${toolName}" must end with "_tool" suffix`
        );
      }
    }

    // Report all violations
    if (violations.length > 0) {
      const errorMessage = [
        'Tool names must follow snake_case convention and end with "_tool":',
        '- Use lowercase letters and numbers only',
        '- Separate words with single underscores',
        '- Start with a letter',
        '- No consecutive underscores',
        '- Must end with "_tool" suffix',
        '',
        `Found ${tools.length} tools to check.`,
        '',
        'Violations found:',
        ...violations.map((v) => `  - ${v}`),
        '',
        'Please update the tool name property to follow the naming convention.'
      ].join('\n');

      throw new Error(errorMessage);
    }
  });

  it('should maintain consistent tool list (snapshot test)', async () => {
    // Dynamically discover all tool instances
    const tools = await discoverTools();

    // Extract tool names and class names for snapshot
    const toolSnapshot = tools
      .map((tool) => ({
        className: tool.constructor.name,
        toolName: tool.name,
        description: tool.description
      }))
      .sort((a, b) => a.className.localeCompare(b.className));

    // This snapshot test will fail if tools are accidentally added or removed
    expect(toolSnapshot).toMatchSnapshot();

    // Also verify we have the expected number of tools
    expect(tools.length).toBeGreaterThan(0);
  });

  it('should validate snake_case pattern with _tool suffix examples', () => {
    const snakeCasePattern = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
    const toolSuffixPattern = /_tool$/;

    // Valid tool names (snake_case + _tool suffix)
    const validToolNames = [
      'my_tool',
      'create_style_tool',
      'list_tokens_tool',
      'bounding_box_tool',
      'simple_tool',
      'coordinate_conversion_tool'
    ];

    // Invalid tool names (violate snake_case or missing _tool suffix)
    const invalidToolNames = [
      'tool', // missing _tool suffix
      'list_tokens', // missing _tool suffix
      'bounding_box', // missing _tool suffix
      'MyTool', // not snake_case
      'my-tool', // uses hyphens
      'my__tool', // consecutive underscores
      'my_tool_', // trailing underscore after _tool
      '_my_tool', // leading underscore
      'my tool', // contains space
      'TOOL', // all uppercase
      'myTool' // camelCase
    ];

    // Test valid tool names (must pass both patterns)
    for (const name of validToolNames) {
      expect(snakeCasePattern.test(name)).toBe(true);
      expect(toolSuffixPattern.test(name)).toBe(true);
    }

    // Test invalid tool names (should fail at least one pattern)
    for (const name of invalidToolNames) {
      const isValidSnakeCase = snakeCasePattern.test(name);
      const hasToolSuffix = toolSuffixPattern.test(name);
      expect(isValidSnakeCase && hasToolSuffix).toBe(false);
    }
  });
});
