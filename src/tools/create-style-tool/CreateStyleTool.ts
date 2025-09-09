import { fetchClient } from '../../utils/fetchRequest.js';
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

  constructor(private fetchImpl: typeof fetch = fetchClient) {
    super({ inputSchema: CreateStyleSchema });
  }

  protected async execute(
    input: CreateStyleInput,
    accessToken?: string
  ): Promise<any> {
    const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);
    const url = `${MapboxApiBasedTool.MAPBOX_API_ENDPOINT}styles/v1/${username}?access_token=${accessToken}`;

    const payload = {
      name: input.name,
      ...input.style
    };

    const response = await this.fetchImpl(url, {
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
    return data;
  }
}
