import { BoundingBoxTool } from './bounding-box-tool/BoundingBoxTool.js';
import { CountryBoundingBoxTool } from './bounding-box-tool/CountryBoundingBoxTool.js';
import { CoordinateConversionTool } from './coordinate-conversion-tool/CoordinateConversionTool.js';
import { CreateStyleTool } from './create-style-tool/CreateStyleTool.js';
import { CreateTokenTool } from './create-token-tool/CreateTokenTool.js';
import { DeleteStyleTool } from './delete-style-tool/DeleteStyleTool.js';
import { GeojsonPreviewTool } from './geojson-preview-tool/GeojsonPreviewTool.js';
import { ListStylesTool } from './list-styles-tool/ListStylesTool.js';
import { ListTokensTool } from './list-tokens-tool/ListTokensTool.js';
import { PreviewStyleTool } from './preview-style-tool/PreviewStyleTool.js';
import { RetrieveStyleTool } from './retrieve-style-tool/RetrieveStyleTool.js';
import { StyleComparisonTool } from './style-comparison-tool/StyleComparisonTool.js';
import { TilequeryTool } from './tilequery-tool/TilequeryTool.js';
import { UpdateStyleTool } from './update-style-tool/UpdateStyleTool.js';

// Central registry of all tools
export const ALL_TOOLS = [
  new ListStylesTool(),
  new CreateStyleTool(),
  new RetrieveStyleTool(),
  new UpdateStyleTool(),
  new DeleteStyleTool(),
  new PreviewStyleTool(),
  new GeojsonPreviewTool(),
  new CreateTokenTool(),
  new ListTokensTool(),
  new BoundingBoxTool(),
  new CountryBoundingBoxTool(),
  new CoordinateConversionTool(),
  new StyleComparisonTool(),
  new TilequeryTool()
] as const;

export type ToolInstance = (typeof ALL_TOOLS)[number];

export function getAllTools(): readonly ToolInstance[] {
  return ALL_TOOLS;
}

export function getToolByName(name: string): ToolInstance | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}
