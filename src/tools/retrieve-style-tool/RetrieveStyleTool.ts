import { fetchClient } from '../../utils/fetchRequest.js';
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

  constructor(private fetch: typeof globalThis.fetch = fetchClient) {
    super({ inputSchema: RetrieveStyleSchema });
  }

  protected async execute(
    input: RetrieveStyleInput,
    accessToken?: string
  ): Promise<any> {
    const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);
    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}/${input.styleId}?access_token=${accessToken}`;

    const response = await this.fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to retrieve style: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  }
}
