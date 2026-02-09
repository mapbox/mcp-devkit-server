// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

/**
 * @module tools
 *
 * Public API for Mapbox MCP Devkit tools. This module exports:
 * - Tool classes for custom instantiation
 * - Pre-configured tool instances ready to use
 * - Registry functions for batch access
 *
 * @example Simple usage with pre-configured instances
 * ```typescript
 * import { listStyles, createStyle, previewStyle } from '@mapbox/mcp-devkit-server/tools';
 *
 * // Use directly - httpRequest already configured
 * const styles = await listStyles.run(args, extra);
 * ```
 *
 * @example Advanced usage with custom pipeline
 * ```typescript
 * import { ListStylesTool } from '@mapbox/mcp-devkit-server/tools';
 * import { httpRequest } from '@mapbox/mcp-devkit-server/utils';
 *
 * const customTool = new ListStylesTool({ httpRequest });
 * ```
 */

import { httpRequest } from '../utils/httpPipeline.js';

// Export all tool classes
export { BoundingBoxTool } from './bounding-box-tool/BoundingBoxTool.js';
export { CheckColorContrastTool } from './check-color-contrast-tool/CheckColorContrastTool.js';
export { CompareStylesTool } from './compare-styles-tool/CompareStylesTool.js';
export { CountryBoundingBoxTool } from './bounding-box-tool/CountryBoundingBoxTool.js';
export { CoordinateConversionTool } from './coordinate-conversion-tool/CoordinateConversionTool.js';
export { CreateStyleTool } from './create-style-tool/CreateStyleTool.js';
export { CreateTokenTool } from './create-token-tool/CreateTokenTool.js';
export { DeleteStyleTool } from './delete-style-tool/DeleteStyleTool.js';
export { GetFeedbackTool } from './get-feedback-tool/GetFeedbackTool.js';
export { ListFeedbackTool } from './list-feedback-tool/ListFeedbackTool.js';
export { GeojsonPreviewTool } from './geojson-preview-tool/GeojsonPreviewTool.js';
export { GetMapboxDocSourceTool } from './get-mapbox-doc-source-tool/GetMapboxDocSourceTool.js';
export { GetReferenceTool } from './get-reference-tool/GetReferenceTool.js';
export { ListStylesTool } from './list-styles-tool/ListStylesTool.js';
export { ListTokensTool } from './list-tokens-tool/ListTokensTool.js';
export { OptimizeStyleTool } from './optimize-style-tool/OptimizeStyleTool.js';
export { PreviewStyleTool } from './preview-style-tool/PreviewStyleTool.js';
export { RetrieveStyleTool } from './retrieve-style-tool/RetrieveStyleTool.js';
export { StyleBuilderTool } from './style-builder-tool/StyleBuilderTool.js';
export { StyleComparisonTool } from './style-comparison-tool/StyleComparisonTool.js';
export { TilequeryTool } from './tilequery-tool/TilequeryTool.js';
export { UpdateStyleTool } from './update-style-tool/UpdateStyleTool.js';
export { ValidateExpressionTool } from './validate-expression-tool/ValidateExpressionTool.js';
export { ValidateGeojsonTool } from './validate-geojson-tool/ValidateGeojsonTool.js';
export { ValidateStyleTool } from './validate-style-tool/ValidateStyleTool.js';

// Import tool classes for instantiation
import { BoundingBoxTool } from './bounding-box-tool/BoundingBoxTool.js';
import { CheckColorContrastTool } from './check-color-contrast-tool/CheckColorContrastTool.js';
import { CompareStylesTool } from './compare-styles-tool/CompareStylesTool.js';
import { CountryBoundingBoxTool } from './bounding-box-tool/CountryBoundingBoxTool.js';
import { CoordinateConversionTool } from './coordinate-conversion-tool/CoordinateConversionTool.js';
import { CreateStyleTool } from './create-style-tool/CreateStyleTool.js';
import { CreateTokenTool } from './create-token-tool/CreateTokenTool.js';
import { DeleteStyleTool } from './delete-style-tool/DeleteStyleTool.js';
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
import { TilequeryTool } from './tilequery-tool/TilequeryTool.js';
import { UpdateStyleTool } from './update-style-tool/UpdateStyleTool.js';
import { ValidateExpressionTool } from './validate-expression-tool/ValidateExpressionTool.js';
import { ValidateGeojsonTool } from './validate-geojson-tool/ValidateGeojsonTool.js';
import { ValidateStyleTool } from './validate-style-tool/ValidateStyleTool.js';

// Export pre-configured tool instances with short, clean names
// Note: Import path already indicates these are tools, so we omit the "Tool" suffix

/** Calculate bounding boxes for geometries */
export const boundingBox = new BoundingBoxTool();

/** Check color contrast ratios for accessibility */
export const checkColorContrast = new CheckColorContrastTool();

/** Compare two Mapbox styles */
export const compareStyles = new CompareStylesTool();

/** Get country bounding boxes */
export const countryBoundingBox = new CountryBoundingBoxTool();

/** Convert between coordinate systems */
export const coordinateConversion = new CoordinateConversionTool();

/** Create a new Mapbox style */
export const createStyle = new CreateStyleTool({ httpRequest });

/** Create a new Mapbox access token */
export const createToken = new CreateTokenTool({ httpRequest });

/** Delete a Mapbox style */
export const deleteStyle = new DeleteStyleTool({ httpRequest });

/** Get feedback for a location */
export const getFeedback = new GetFeedbackTool({ httpRequest });

/** List feedback items */
export const listFeedback = new ListFeedbackTool({ httpRequest });

/** Preview GeoJSON on a map */
export const geojsonPreview = new GeojsonPreviewTool();

/** Get Mapbox documentation source */
export const getMapboxDocSource = new GetMapboxDocSourceTool({ httpRequest });

/** Get reference documentation */
export const getReference = new GetReferenceTool();

/** List Mapbox styles */
export const listStyles = new ListStylesTool({ httpRequest });

/** List Mapbox access tokens */
export const listTokens = new ListTokensTool({ httpRequest });

/** Optimize a Mapbox style */
export const optimizeStyle = new OptimizeStyleTool();

/** Preview a Mapbox style */
export const previewStyle = new PreviewStyleTool();

/** Retrieve a Mapbox style */
export const retrieveStyle = new RetrieveStyleTool({ httpRequest });

/** Build a Mapbox style */
export const styleBuilder = new StyleBuilderTool();

/** Compare styles side-by-side */
export const styleComparison = new StyleComparisonTool();

/** Query tiles at a location */
export const tilequery = new TilequeryTool({ httpRequest });

/** Update a Mapbox style */
export const updateStyle = new UpdateStyleTool({ httpRequest });

/** Validate a Mapbox expression */
export const validateExpression = new ValidateExpressionTool();

/** Validate GeoJSON */
export const validateGeojson = new ValidateGeojsonTool();

/** Validate a Mapbox style */
export const validateStyle = new ValidateStyleTool();

// Export registry functions for batch access
export {
  getCoreTools,
  getElicitationTools,
  getResourceFallbackTools,
  getToolByName,
  type ToolInstance
} from './toolRegistry.js';
