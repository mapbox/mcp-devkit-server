import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseToolConfigFromArgs, filterTools } from './config/toolConfig.js';
import { getAllTools } from './tools/toolRegistry.js';
import { patchGlobalFetch } from './utils/requestUtils.js';
import { getVersionInfo } from './utils/versionUtils.js';

// Get version info and patch fetch
const versionInfo = getVersionInfo();
patchGlobalFetch(versionInfo);

// Parse configuration from command-line arguments
const config = parseToolConfigFromArgs();

// Get and filter tools based on configuration
const allTools = getAllTools();
const enabledTools = filterTools(allTools, config);

// Create an MCP server
const server = new McpServer(
  {
    name: versionInfo.name,
    version: versionInfo.version
  },
  {
    capabilities: {
      logging: {},
      tools: {}
    }
  }
);

// Register enabled tools to the server
enabledTools.forEach((tool) => {
  tool.installTo(server);
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
