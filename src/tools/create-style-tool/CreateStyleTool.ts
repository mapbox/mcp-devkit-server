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

  constructor() {
    super({ inputSchema: CreateStyleSchema });
  }

  protected async execute(input: CreateStyleInput): Promise<any> {
    const username = MapboxApiBasedTool.getUserNameFromToken();
    const url = `${MapboxApiBasedTool.MAPBOX_API_ENDPOINT}styles/v1/${username}?access_token=${MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN}`;

    const payload = {
      name: input.name,
      ...input.style
    };

    const response = await fetch(url, {
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
