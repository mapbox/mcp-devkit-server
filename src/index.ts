// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseToolConfigFromArgs, filterTools } from './config/toolConfig.js';
import { getAllTools } from './tools/toolRegistry.js';
import { getAllResources } from './resources/resourceRegistry.js';
import { getVersionInfo } from './utils/versionUtils.js';

// Get version info and patch fetch
const versionInfo = getVersionInfo();

// Parse configuration from command-line arguments
const config = parseToolConfigFromArgs();

// Get and filter tools based on configuration
const allTools = getAllTools();

// Cursor + OpenAI models have issues with complex input schemas (create_style_tool, update_style_tool)
// This provides an easy workaround
const cursorOpenAiMode = process.env.CURSOR_OPENAI_MODE === 'true';
if (cursorOpenAiMode && !config.disabledTools) {
  config.disabledTools = ['create_style_tool', 'update_style_tool'];
}

const enabledTools = filterTools(allTools, config);

// Create an MCP server
const server = new McpServer(
  {
    name: versionInfo.name,
    version: versionInfo.version
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// Register enabled tools to the server
enabledTools.forEach((tool) => {
  tool.installTo(server);
});

// Register resources to the server
const resources = getAllResources();
resources.forEach((resource) => {
  resource.installTo(server);
});

async function main() {
  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
