// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

/**
 * @module utils
 *
 * Public API for Mapbox MCP Devkit utilities. This module exports the HTTP pipeline
 * system for making requests to Mapbox APIs with built-in policies like
 * User-Agent and Retry.
 *
 * @example Using the default pipeline
 * ```typescript
 * import { httpRequest } from '@mapbox/mcp-devkit-server/utils';
 * import { ListStylesTool } from '@mapbox/mcp-devkit-server/tools';
 *
 * // Use the pre-configured default pipeline
 * const tool = new ListStylesTool({ httpRequest });
 * ```
 *
 * @example Creating a custom pipeline
 * ```typescript
 * import { HttpPipeline, UserAgentPolicy, RetryPolicy } from '@mapbox/mcp-devkit-server/utils';
 * import { ListStylesTool } from '@mapbox/mcp-devkit-server/tools';
 *
 * // Create a custom pipeline with your own policies
 * const pipeline = new HttpPipeline();
 * pipeline.usePolicy(new UserAgentPolicy('MyApp/1.0.0'));
 * pipeline.usePolicy(new RetryPolicy(5, 300, 3000)); // More aggressive retry
 *
 * const tool = new ListStylesTool({ httpRequest: pipeline.execute.bind(pipeline) });
 * ```
 */

// Export the pre-configured default HTTP pipeline
export { httpRequest, systemHttpPipeline } from './httpPipeline.js';

// Export HTTP pipeline classes and interfaces for custom pipelines
export {
  HttpPipeline,
  UserAgentPolicy,
  RetryPolicy,
  type HttpPolicy
} from './httpPipeline.js';

// Export types
export type { HttpRequest } from './types.js';
