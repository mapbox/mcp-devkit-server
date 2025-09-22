import { fetchClient } from '../../utils/fetchRequest.js';
import { filterExpandedMapboxStyles } from '../../utils/styleUtils.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  CreateStyleSchema,
  CreateStyleInput
} from './CreateStyleTool.schema.js';

export class CreateStyleTool extends MapboxApiBasedTool<
  typeof CreateStyleSchema
> {
  name = 'create_style_tool';
  description = 'Create a new Mapbox style';

  constructor(private fetch: typeof globalThis.fetch = fetchClient) {
    super({ inputSchema: CreateStyleSchema });
  }

  protected async execute(
    input: CreateStyleInput,
    accessToken?: string
  ): Promise<unknown> {
    const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);
    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}?access_token=${accessToken}`;

    const payload = {
      name: input.name,
      ...input.style
    };

    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create style: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    // Return full style but filter out expanded Mapbox styles
    return filterExpandedMapboxStyles(data);
  }
}
