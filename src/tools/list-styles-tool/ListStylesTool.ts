import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { ListStylesSchema, ListStylesInput } from './ListStylesTool.schema.js';

export class ListStylesTool extends MapboxApiBasedTool<
  typeof ListStylesSchema
> {
  name = 'list_styles_tool';
  description =
    'List styles for a Mapbox account. Use limit parameter to avoid large responses (recommended: limit=5-10). Use start parameter for pagination.';

  constructor() {
    super({ inputSchema: ListStylesSchema });
  }

  protected async execute(
    input: ListStylesInput,
    accessToken?: string
  ): Promise<any> {
    const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);

    // Build query parameters
    const params = new URLSearchParams();
    if (!accessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is not set');
    }
    params.append('access_token', accessToken);

    if (input.limit) {
      params.append('limit', input.limit.toString());
    }

    if (input.start) {
      params.append('start', input.start);
    }

    const url = `${MapboxApiBasedTool.MAPBOX_API_ENDPOINT}styles/v1/${username}?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to list styles: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  }
}
