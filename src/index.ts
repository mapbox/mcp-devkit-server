// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

// Load environment variables from .env file if present
// Use Node.js built-in util.parseEnv() and manually apply to override existing vars
import { parseEnv } from 'node:util';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { SpanStatusCode } from '@opentelemetry/api';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { parseToolConfigFromArgs, filterTools } from './config/toolConfig.js';
import {
  getCoreTools,
  getElicitationTools,
  getResourceFallbackTools
} from './tools/toolRegistry.js';
import { getAllResources } from './resources/resourceRegistry.js';
import { getAllPrompts } from './prompts/promptRegistry.js';
import { getVersionInfo } from './utils/versionUtils.js';
import {
  initializeTracing,
  shutdownTracing,
  isTracingInitialized,
  getTracer
} from './utils/tracing.js';

// Load .env from current working directory (where npm run is executed)
// This happens before tracing is initialized, but we'll add a span when tracing is ready
const envPath = join(process.cwd(), '.env');
let envLoadError: Error | null = null;
let envLoadedCount = 0;

if (existsSync(envPath)) {
  try {
    // Read and parse .env file using Node.js built-in parseEnv
    const envFile = readFileSync(envPath, 'utf-8');
    const parsed = parseEnv(envFile);

    // Apply parsed values to process.env (with override)
    // Note: process.loadEnvFile() doesn't override, so we use parseEnv + manual assignment
    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] = value;
      envLoadedCount++;
    }
  } catch (error) {
    envLoadError = error instanceof Error ? error : new Error(String(error));
    // Error will be logged via MCP logging messages and traced if tracing is enabled
  }
}

const versionInfo = getVersionInfo();

// Parse configuration from command-line arguments
const config = parseToolConfigFromArgs();

// Get and filter tools based on configuration
// Split into categories for capability-aware registration
const coreTools = getCoreTools();
const elicitationTools = getElicitationTools();
const resourceFallbackTools = getResourceFallbackTools();

const enabledCoreTools = filterTools(coreTools, config);
const enabledElicitationTools = filterTools(elicitationTools, config);
const enabledResourceFallbackTools = filterTools(resourceFallbackTools, config);

// Create an MCP server
const server = new McpServer(
  {
    name: versionInfo.name,
    version: versionInfo.version
  },
  {
    capabilities: {
      tools: {
        listChanged: true // Advertise support for dynamic tool registration
      },
      resources: {},
      prompts: {}
    }
  }
);

// Register only core tools before connection
// Capability-dependent tools will be registered dynamically after connection
enabledCoreTools.forEach((tool) => {
  tool.installTo(server);
});

// Register resources to the server
const resources = getAllResources();
resources.forEach((resource) => {
  resource.installTo(server);
});

// Register prompts to the server
const prompts = getAllPrompts();
prompts.forEach((prompt) => {
  const argsSchema: Record<string, z.ZodString | z.ZodOptional<z.ZodString>> =
    {};

  // Convert prompt arguments to Zod schema format
  prompt.arguments.forEach((arg) => {
    const zodString = z.string().describe(arg.description);
    argsSchema[arg.name] = arg.required ? zodString : zodString.optional();
  });

  server.registerPrompt(
    prompt.name,
    {
      description: prompt.description,
      argsSchema: argsSchema
    },
    async (args) => {
      // Filter out undefined values from optional arguments
      const filteredArgs: Record<string, string> = {};
      for (const [key, value] of Object.entries(args || {})) {
        if (value !== undefined) {
          filteredArgs[key] = value;
        }
      }
      return prompt.execute(filteredArgs);
    }
  );
});

async function main() {
  // Send MCP logging messages about .env loading
  if (envLoadError) {
    server.server.sendLoggingMessage({
      level: 'warning',
      data: `Failed to load .env file: ${envLoadError.message}`
    });
  } else if (envLoadedCount > 0) {
    server.server.sendLoggingMessage({
      level: 'info',
      data: `Loaded ${envLoadedCount} environment variables from ${envPath}`
    });
  } else {
    server.server.sendLoggingMessage({
      level: 'debug',
      data: 'No .env file found or file was empty'
    });
  }

  // Initialize OpenTelemetry tracing if not in test mode
  if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
    try {
      await initializeTracing();

      // Send MCP logging message about tracing status
      if (isTracingInitialized()) {
        server.server.sendLoggingMessage({
          level: 'info',
          data: 'OpenTelemetry tracing enabled'
        });
      } else {
        server.server.sendLoggingMessage({
          level: 'debug',
          data: 'OpenTelemetry tracing disabled (no OTLP endpoint configured)'
        });
      }

      // Record .env loading as a span (retrospectively since it happened before tracing init)
      if (isTracingInitialized()) {
        const tracer = getTracer();
        const span = tracer.startSpan('config.load_env', {
          attributes: {
            'config.file.path': envPath,
            'config.file.exists': existsSync(envPath),
            'config.vars.loaded': envLoadedCount,
            'operation.type': 'config_load'
          }
        });

        if (envLoadError) {
          span.recordException(envLoadError);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: envLoadError.message
          });
          span.setAttribute('error.type', envLoadError.name);
          span.setAttribute('error.message', envLoadError.message);
        } else if (envLoadedCount > 0) {
          span.setStatus({ code: SpanStatusCode.OK });
          span.setAttribute('config.load.success', true);
        } else {
          // No error, but no variables loaded either (file might be empty or not exist)
          span.setStatus({ code: SpanStatusCode.OK });
          span.setAttribute('config.load.success', true);
          span.setAttribute('config.load.empty', true);
        }

        span.end();
      }
    } catch (error) {
      // Log tracing initialization failure
      server.server.sendLoggingMessage({
        level: 'warning',
        data: `Failed to initialize tracing: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  const relevantEnvVars = Object.freeze({
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN ? '***' : undefined,
    MAPBOX_API_ENDPOINT: process.env.MAPBOX_API_ENDPOINT,
    OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_TRACING_ENABLED: process.env.OTEL_TRACING_ENABLED,
    OTEL_LOG_LEVEL: process.env.OTEL_LOG_LEVEL,
    NODE_ENV: process.env.NODE_ENV
  });

  server.server.sendLoggingMessage({
    level: 'debug',
    data: JSON.stringify(relevantEnvVars, null, 2)
  });

  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // After connection, dynamically register capability-dependent tools
  const clientCapabilities = server.server.getClientCapabilities();

  // Debug: Log what capabilities we detected
  server.server.sendLoggingMessage({
    level: 'info',
    data: `Client capabilities detected: ${JSON.stringify(clientCapabilities, null, 2)}`
  });

  let toolsAdded = false;

  // Register elicitation tools if client supports elicitation
  if (clientCapabilities?.elicitation && enabledElicitationTools.length > 0) {
    server.server.sendLoggingMessage({
      level: 'info',
      data: `Client supports elicitation. Registering ${enabledElicitationTools.length} elicitation-dependent tools`
    });

    enabledElicitationTools.forEach((tool) => {
      tool.installTo(server);
    });
    toolsAdded = true;
  } else if (enabledElicitationTools.length > 0) {
    server.server.sendLoggingMessage({
      level: 'debug',
      data: `Client does not support elicitation. Skipping ${enabledElicitationTools.length} elicitation-dependent tools`
    });
  }

  // Register resource fallback tools for clients that may not support resources properly
  // Note: Resources are a core MCP feature, but not all clients support them perfectly.
  // We use an allowlist approach: only skip fallback tools for clients we KNOW support resources.
  // This is safer than blocklisting - unknown clients get fallback tools by default.
  const clientVersion = server.server.getClientVersion();
  const clientName = clientVersion?.name?.toLowerCase() || '';

  // Known clients with proper resource support (can skip fallback tools)
  const supportsResourcesProperly =
    clientName.includes('inspector') || clientName.includes('vscode');

  if (!supportsResourcesProperly && enabledResourceFallbackTools.length > 0) {
    server.server.sendLoggingMessage({
      level: 'info',
      data: `Client "${clientVersion?.name}" may need resource fallback tools. Registering ${enabledResourceFallbackTools.length} resource fallback tools`
    });

    enabledResourceFallbackTools.forEach((tool) => {
      tool.installTo(server);
    });
    toolsAdded = true;
  } else if (enabledResourceFallbackTools.length > 0) {
    server.server.sendLoggingMessage({
      level: 'debug',
      data: `Client "${clientVersion?.name}" supports resources properly. Skipping ${enabledResourceFallbackTools.length} resource fallback tools`
    });
  }

  // Notify client about tool list changes if any tools were added
  if (toolsAdded) {
    try {
      server.sendToolListChanged();

      server.server.sendLoggingMessage({
        level: 'debug',
        data: 'Sent notifications/tools/list_changed to client'
      });
    } catch (error) {
      server.server.sendLoggingMessage({
        level: 'warning',
        data: `Failed to send tool list change notification: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
}

// Ensure cleanup interval is cleared when the process exits
async function shutdown() {
  // Shutdown tracing
  try {
    await shutdownTracing();
    server.server.sendLoggingMessage({
      level: 'info',
      data: 'Server shutting down gracefully'
    });
  } catch (error) {
    server.server.sendLoggingMessage({
      level: 'warning',
      data: `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  process.exit(0);
}

function exitWithError(error: unknown, code = 1) {
  // Use MCP logging for fatal errors
  try {
    server.server.sendLoggingMessage({
      level: 'error',
      data: `Fatal error: ${error instanceof Error ? error.message : String(error)}`
    });
  } catch {
    // If MCP logging fails, we have no choice but to use console
    console.error('Fatal error:', error);
  }
  process.exit(code);
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    try {
      await shutdown();
    } finally {
      process.exit(0);
    }
  });
});

process.on('uncaughtException', (err) => exitWithError(err));
process.on('unhandledRejection', (reason) => exitWithError(reason));

main().catch((error) => exitWithError(error));
