// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { BoundingBoxTool } from './bounding-box-tool/BoundingBoxTool.js';
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
import { httpRequest } from '../utils/httpPipeline.js';

// Central registry of all tools
export const ALL_TOOLS = [
  new ListStylesTool({ httpRequest }),
  new CreateStyleTool({ httpRequest }),
  new RetrieveStyleTool({ httpRequest }),
  new UpdateStyleTool({ httpRequest }),
  new DeleteStyleTool({ httpRequest }),
  new PreviewStyleTool(),
  new StyleBuilderTool(),
  new GeojsonPreviewTool(),
  new OptimizeStyleTool(),
  new CreateTokenTool({ httpRequest }),
  new ListTokensTool({ httpRequest }),
  new BoundingBoxTool(),
  new CountryBoundingBoxTool(),
  new CoordinateConversionTool(),
  new GetFeedbackTool({ httpRequest }),
  new ListFeedbackTool({ httpRequest }),
  new GetMapboxDocSourceTool({ httpRequest }),
  new GetReferenceTool(),
  new StyleComparisonTool(),
  new TilequeryTool({ httpRequest }),
  new ValidateExpressionTool(),
  new ValidateGeojsonTool(),
  new ValidateStyleTool()
] as const;

export type ToolInstance = (typeof ALL_TOOLS)[number];

export function getAllTools(): readonly ToolInstance[] {
  return ALL_TOOLS;
}

export function getToolByName(name: string): ToolInstance | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}
