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
import { parseToolConfigFromArgs, filterTools } from './config/toolConfig.js';
import { getAllTools } from './tools/toolRegistry.js';
import { getAllResources } from './resources/resourceRegistry.js';
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
