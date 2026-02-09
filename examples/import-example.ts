// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

/**
 * Examples demonstrating how to import and use Mapbox MCP Devkit tools, resources,
 * prompts, and utilities in your application.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/* =============================================================================
 * SIMPLE USAGE: Pre-configured instances (recommended for most use cases)
 * ============================================================================= */

// Import pre-configured tool instances with short, clean names
import {
  listStyles,
  createStyle,
  previewStyle
} from '@mapbox/mcp-devkit-server/tools';

// Import pre-configured resource instances
import {
  mapboxStyleLayers,
  previewStyleUI
} from '@mapbox/mcp-devkit-server/resources';

// Import pre-configured prompt instances
import {
  createAndPreviewStyle,
  buildCustomMap
} from '@mapbox/mcp-devkit-server/prompts';

// Ready to use - httpRequest is already configured
async function simpleExample() {
  const server = new McpServer({
    name: 'my-devkit-app',
    version: '1.0.0'
  });

  // Tools, resources, and prompts use installTo() method
  listStyles.installTo(server);
  createStyle.installTo(server);
  previewStyle.installTo(server);

  mapboxStyleLayers.installTo(server);
  previewStyleUI.installTo(server);

  // Prompts can be used directly - they have execute() method
  // See src/index.ts for how to register prompts with the server

  return server;
}

/* =============================================================================
 * ADVANCED USAGE: Tool classes with default httpRequest
 * ============================================================================= */

// Import tool classes for custom instantiation
import {
  ListStylesTool,
  CreateStyleTool,
  PreviewStyleTool
} from '@mapbox/mcp-devkit-server/tools';

// Import the default httpRequest function
import { httpRequest } from '@mapbox/mcp-devkit-server/utils';

// Create tools with default pipeline but custom configuration
async function advancedExample() {
  const server = new McpServer({
    name: 'my-custom-devkit-app',
    version: '1.0.0'
  });

  // Instantiate tools with default httpRequest
  const myListStyles = new ListStylesTool({ httpRequest });
  const myCreateStyle = new CreateStyleTool({ httpRequest });
  const myPreviewStyle = new PreviewStyleTool();

  myListStyles.installTo(server);
  myCreateStyle.installTo(server);
  myPreviewStyle.installTo(server);

  return server;
}

/* =============================================================================
 * EXPERT USAGE: Custom HTTP pipeline with policies
 * ============================================================================= */

// Import HTTP pipeline components
import {
  HttpPipeline,
  UserAgentPolicy,
  RetryPolicy
} from '@mapbox/mcp-devkit-server/utils';

import type { HttpRequest } from '@mapbox/mcp-devkit-server/utils';

// Create a custom HTTP pipeline
function createCustomPipeline(): HttpRequest {
  const pipeline = new HttpPipeline();

  // Add custom User-Agent
  pipeline.usePolicy(new UserAgentPolicy('MyDevkitApp/2.0.0'));

  // Add aggressive retry policy: 5 attempts, 300ms min, 3000ms max backoff
  pipeline.usePolicy(new RetryPolicy(5, 300, 3000));

  return pipeline.execute.bind(pipeline);
}

async function expertExample() {
  const server = new McpServer({
    name: 'my-expert-devkit-app',
    version: '1.0.0'
  });

  // Use custom pipeline
  const customHttpRequest = createCustomPipeline();

  // Create tools with custom pipeline
  const myListStyles = new ListStylesTool({ httpRequest: customHttpRequest });
  const myCreateStyle = new CreateStyleTool({
    httpRequest: customHttpRequest
  });

  myListStyles.installTo(server);
  myCreateStyle.installTo(server);

  return server;
}

/* =============================================================================
 * REGISTRY FUNCTIONS: Batch operations
 * ============================================================================= */

// Import registry functions for batch access
import {
  getCoreTools,
  getElicitationTools
} from '@mapbox/mcp-devkit-server/tools';

import { getAllResources } from '@mapbox/mcp-devkit-server/resources';

import { getAllPrompts } from '@mapbox/mcp-devkit-server/prompts';

async function registryExample() {
  const server = new McpServer({
    name: 'my-registry-app',
    version: '1.0.0'
  });

  // Register all core tools at once
  const coreTools = getCoreTools();
  for (const tool of coreTools) {
    tool.installTo(server);
  }

  // Register all elicitation tools
  const elicitationTools = getElicitationTools();
  for (const tool of elicitationTools) {
    tool.installTo(server);
  }

  // Register all resources
  const resources = getAllResources();
  for (const resource of resources) {
    resource.installTo(server);
  }

  // Get all prompts - they can be used directly or registered
  // See src/index.ts for how to register prompts with the server
  const _prompts = getAllPrompts();

  return server;
}

/* =============================================================================
 * TYPE-SAFE USAGE: Import types
 * ============================================================================= */

import type { HttpPolicy } from '@mapbox/mcp-devkit-server/utils';
import type { ToolInstance } from '@mapbox/mcp-devkit-server/tools';
import type { ResourceInstance } from '@mapbox/mcp-devkit-server/resources';
import type { PromptInstance } from '@mapbox/mcp-devkit-server/prompts';

// Create custom policy
class _CustomLoggingPolicy implements HttpPolicy {
  readonly id = 'custom-logging';

  async handle(
    input: string | URL | Request,
    init: RequestInit,
    next: HttpRequest
  ): Promise<Response> {
    const url = input instanceof Request ? input.url : input.toString();
    console.log(`Request: ${url}`);
    const response = await next(input, init);
    console.log(`Response: ${response.status}`);
    return response;
  }
}

// Type-safe tool handling
function processTool(tool: ToolInstance) {
  console.log(`Processing tool: ${tool.name}`);
  // Tool instances have installTo() method
}

function processResource(resource: ResourceInstance) {
  console.log(`Processing resource: ${resource.uri}`);
  // Resource instances have installTo() method
}

function processPrompt(prompt: PromptInstance) {
  console.log(`Processing prompt: ${prompt.name}`);
  // Prompt instances can be executed directly or registered via server.registerPrompt()
}

// Use them
processTool(listStyles);
processTool(createStyle);

processResource(mapboxStyleLayers);
processResource(previewStyleUI);

processPrompt(createAndPreviewStyle);
processPrompt(buildCustomMap);

/* =============================================================================
 * MAIN: Run examples
 * ============================================================================= */

async function main() {
  console.log('Simple example:');
  await simpleExample();

  console.log('\nAdvanced example:');
  await advancedExample();

  console.log('\nExpert example:');
  await expertExample();

  console.log('\nRegistry example:');
  await registryExample();

  console.log('\nAll examples completed successfully!');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
