// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { BoundingBoxTool } from './bounding-box-tool/BoundingBoxTool.js';
import { CheckColorContrastTool } from './check-color-contrast-tool/CheckColorContrastTool.js';
import { CompareStylesTool } from './compare-styles-tool/CompareStylesTool.js';
import { CountryBoundingBoxTool } from './bounding-box-tool/CountryBoundingBoxTool.js';
import { CoordinateConversionTool } from './coordinate-conversion-tool/CoordinateConversionTool.js';
import { CreateStyleTool } from './create-style-tool/CreateStyleTool.js';
import { CreateTokenTool } from './create-token-tool/CreateTokenTool.js';
import { DeleteStyleTool } from './delete-style-tool/DeleteStyleTool.js';
import { ExploreMapboxApiTool } from './explore-mapbox-api-tool/ExploreMapboxApiTool.js';
import { GetFeedbackTool } from './get-feedback-tool/GetFeedbackTool.js';
import { ListFeedbackTool } from './list-feedback-tool/ListFeedbackTool.js';
import { GeojsonPreviewTool } from './geojson-preview-tool/GeojsonPreviewTool.js';
import { GetMapboxDocSourceTool } from './get-mapbox-doc-source-tool/GetMapboxDocSourceTool.js';
import { GetReferenceTool } from './get-reference-tool/GetReferenceTool.js';
import { ListStylesTool } from './list-styles-tool/ListStylesTool.js';
import { ListTokensTool } from './list-tokens-tool/ListTokensTool.js';
import { OptimizeStyleTool } from './optimize-style-tool/OptimizeStyleTool.js';
import { PreviewStyleTool } from './preview-style-tool/PreviewStyleTool.js';
import { RetrieveStyleTool } from './retrieve-style-tool/RetrieveStyleTool.js';
import { StyleBuilderTool } from './style-builder-tool/StyleBuilderTool.js';
import { StyleComparisonTool } from './style-comparison-tool/StyleComparisonTool.js';
import { TestApiRequestTool } from './test-api-request-tool/TestApiRequestTool.js';
import { TilequeryTool } from './tilequery-tool/TilequeryTool.js';
import { UpdateStyleTool } from './update-style-tool/UpdateStyleTool.js';
import { ValidateExpressionTool } from './validate-expression-tool/ValidateExpressionTool.js';
import { ValidateGeojsonTool } from './validate-geojson-tool/ValidateGeojsonTool.js';
import { ValidateStyleTool } from './validate-style-tool/ValidateStyleTool.js';
import { httpRequest } from '../utils/httpPipeline.js';

/**
 * Core tools that work in all MCP clients without requiring special capabilities
 * These tools are registered immediately during server startup
 */
export const CORE_TOOLS = [
  new ListStylesTool({ httpRequest }),
  new CreateStyleTool({ httpRequest }),
  new RetrieveStyleTool({ httpRequest }),
  new UpdateStyleTool({ httpRequest }),
  new DeleteStyleTool({ httpRequest }),
  new PreviewStyleTool(),
  new StyleBuilderTool(),
  new GeojsonPreviewTool(),
  new CheckColorContrastTool(),
  new CompareStylesTool(),
  new OptimizeStyleTool(),
  new StyleComparisonTool(),
  new CreateTokenTool({ httpRequest }),
  new ListTokensTool({ httpRequest }),
  new BoundingBoxTool(),
  new CountryBoundingBoxTool(),
  new CoordinateConversionTool(),
  new ExploreMapboxApiTool(),
  new TestApiRequestTool({ httpRequest }),
  new GetFeedbackTool({ httpRequest }),
  new ListFeedbackTool({ httpRequest }),
  new TilequeryTool({ httpRequest }),
  new ValidateExpressionTool(),
  new ValidateGeojsonTool(),
  new ValidateStyleTool()
] as const;

/**
 * Tools that require elicitation capability for optimal functionality
 * These tools use elicitInput() for secure token management
 * Registered only if client supports elicitation
 *
 * Currently empty - elicitation support will be added in a future PR.
 * This category is ready for tools that require the elicitation capability.
 */
export const ELICITATION_TOOLS = [] as const;

/**
 * Tools that serve as bridges for clients without resource support
 * These tools are only registered if CLIENT_NEEDS_RESOURCE_FALLBACK env var is set to "true"
 *
 * Context: Most MCP clients support resources (Claude Desktop, VS Code, Inspector, etc.).
 * However, some clients (like smolagents) don't support resources at all.
 * These tools provide the same content as resources but via tool calls instead.
 *
 * Configuration:
 * - Leave unset (default) = Skip these tools (assumes client supports resources)
 * - Set CLIENT_NEEDS_RESOURCE_FALLBACK=true = Include these tools (for smolagents, etc.)
 *
 * Tools:
 * - GetReferenceTool: Provides access to reference resources (style layers, Streets v8 fields, token scopes, layer type mapping)
 * - GetMapboxDocSourceTool: Provides access to Mapbox documentation (resource://mapbox-documentation)
 */
export const RESOURCE_FALLBACK_TOOLS = [
  new GetReferenceTool(),
  new GetMapboxDocSourceTool({ httpRequest })
] as const;

/**
 * All tools combined (for backward compatibility and testing)
 */
export const ALL_TOOLS = [
  ...CORE_TOOLS,
  ...ELICITATION_TOOLS,
  ...RESOURCE_FALLBACK_TOOLS
] as const;

export type ToolInstance = (typeof ALL_TOOLS)[number];

/**
 * Get all tools (for backward compatibility)
 * @deprecated Use getCoreTools(), getElicitationTools(), etc. instead for capability-aware registration
 */
export function getAllTools(): readonly ToolInstance[] {
  return ALL_TOOLS;
}

/**
 * Get tools that work in all MCP clients
 */
export function getCoreTools(): readonly ToolInstance[] {
  return CORE_TOOLS;
}

/**
 * Get tools that require elicitation capability
 */
export function getElicitationTools(): readonly ToolInstance[] {
  return ELICITATION_TOOLS;
}

/**
 * Get tools that serve as fallbacks when client doesn't support resources
 */
export function getResourceFallbackTools(): readonly ToolInstance[] {
  return RESOURCE_FALLBACK_TOOLS;
}

export function getToolByName(name: string): ToolInstance | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}
