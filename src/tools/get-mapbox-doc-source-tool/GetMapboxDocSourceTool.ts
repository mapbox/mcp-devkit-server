import { fetchClient } from '../../utils/fetchRequest.js';
import { BaseTool } from '../BaseTool.js';
import {
  GetMapboxDocSourceSchema,
  GetMapboxDocSourceInput
} from './GetMapboxDocSourceTool.schema.js';

export class GetMapboxDocSourceTool extends BaseTool<
  typeof GetMapboxDocSourceSchema
> {
  name = 'get_latest_mapbox_docs_tool';
  description =
    'Get the latest official Mapbox documentation, APIs, SDKs, and developer resources directly from Mapbox. Always up-to-date, comprehensive coverage of all current Mapbox services including mapping, navigation, search, geocoding, and mobile SDKs. Use this for accurate, official Mapbox information instead of web search.';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: 'Get Mapbox Documentation Tool'
  };

  constructor(private fetch: typeof globalThis.fetch = fetchClient) {
    super({ inputSchema: GetMapboxDocSourceSchema });
  }

  protected async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _input: GetMapboxDocSourceInput
  ): Promise<{ type: 'text'; text: string }> {
    try {
      const response = await this.fetch('https://docs.mapbox.com/llms.txt');

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
