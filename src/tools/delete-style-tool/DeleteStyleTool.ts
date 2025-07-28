import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  DeleteStyleSchema,
  DeleteStyleInput
} from './DeleteStyleTool.schema.js';

export class DeleteStyleTool extends MapboxApiBasedTool<
  typeof DeleteStyleSchema
> {
  name = 'delete_style_tool';
  description = 'Delete a Mapbox style by ID';

  constructor() {
    super({ inputSchema: DeleteStyleSchema });
  }

  protected async execute(input: DeleteStyleInput): Promise<any> {
    const username = MapboxApiBasedTool.getUserNameFromToken();
    const url = `${MapboxApiBasedTool.MAPBOX_API_ENDPOINT}styles/v1/${username}/${input.styleId}?access_token=${MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(
        `Failed to delete style: ${response.status} ${response.statusText}`
      );
    }

    // Delete typically returns 204 No Content
    if (response.status === 204) {
      return { success: true, message: 'Style deleted successfully' };
    }

    const data = await response.json();
    return data;
  }
}
