import { fetchClient } from '../../utils/fetchRequest.js';
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

  constructor(private fetch: typeof globalThis.fetch = fetchClient) {
    super({ inputSchema: DeleteStyleSchema });
  }

  protected async execute(
    input: DeleteStyleInput,
    accessToken?: string
  ): Promise<any> {
    const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);
    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}/${input.styleId}?access_token=${accessToken}`;

    const response = await this.fetch(url, {
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
