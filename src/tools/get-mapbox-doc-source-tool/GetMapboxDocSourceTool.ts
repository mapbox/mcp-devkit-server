import { BaseTool } from '../BaseTool.js';
import {
  GetMapboxDocSourceSchema,
  GetMapboxDocSourceInput
} from './GetMapboxDocSourceTool.schema.js';

export class GetMapboxDocSourceTool extends BaseTool<
  typeof GetMapboxDocSourceSchema
> {
  name = 'get_mapbox_doc_source_tool';
  description =
    'Fetch and return Mapbox documentation source collection content from llms.txt';

  constructor() {
    super({ inputSchema: GetMapboxDocSourceSchema });
  }

  protected async execute(
    _input: GetMapboxDocSourceInput
  ): Promise<{ type: 'text'; text: string }> {
    try {
      const response = await fetch('https://docs.mapbox.com/llms.txt');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const content = await response.text();

      return {
        type: 'text',
        text: content
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch Mapbox documentation: ${errorMessage}`);
    }
  }
}
