import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  UpdateStyleSchema,
  UpdateStyleInput
} from './UpdateStyleTool.schema.js';

export class UpdateStyleTool extends MapboxApiBasedTool<
  typeof UpdateStyleSchema
> {
  name = 'update_style_tool';
  description = 'Update an existing Mapbox style';

  constructor() {
    super({ inputSchema: UpdateStyleSchema });
  }

  protected async execute(input: UpdateStyleInput): Promise<any> {
    const username = MapboxApiBasedTool.getUserNameFromToken();
    const url = `${MapboxApiBasedTool.MAPBOX_API_ENDPOINT}styles/v1/${username}/${input.styleId}?access_token=${MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN}`;

    const payload: any = {};
    if (input.name) payload.name = input.name;
    if (input.style) Object.assign(payload, input.style);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update style: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  }
}
