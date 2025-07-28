import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  RetrieveStyleSchema,
  RetrieveStyleInput
} from './RetrieveStyleTool.schema.js';

export class RetrieveStyleTool extends MapboxApiBasedTool<
  typeof RetrieveStyleSchema
> {
  name = 'retrieve_style_tool';
  description = 'Retrieve a specific Mapbox style by ID';

  constructor() {
    super({ inputSchema: RetrieveStyleSchema });
  }

  protected async execute(input: RetrieveStyleInput): Promise<any> {
    const username = MapboxApiBasedTool.getUserNameFromToken();
    const url = `${MapboxApiBasedTool.MAPBOX_API_ENDPOINT}styles/v1/${username}/${input.styleId}?access_token=${MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to retrieve style: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  }
}
