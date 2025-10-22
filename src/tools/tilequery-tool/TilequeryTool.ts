import { fetchClient } from '../../utils/fetchRequest.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { TilequerySchema, TilequeryInput } from './TilequeryTool.schema.js';

export class TilequeryTool extends MapboxApiBasedTool<typeof TilequerySchema> {
  name = 'tilequery_tool';
  description =
    'Query vector and raster data from Mapbox tilesets at geographic coordinates';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    title: 'Mapbox Tilequery Tool'
  };

  constructor(private fetch: typeof globalThis.fetch = fetchClient) {
    super({ inputSchema: TilequerySchema });
  }

  protected async execute(
    input: TilequeryInput,
    accessToken?: string
  ): Promise<any> {
    const { tilesetId, longitude, latitude, ...queryParams } = input;
    const url = new URL(
      `${MapboxApiBasedTool.mapboxApiEndpoint}v4/${tilesetId}/tilequery/${longitude},${latitude}.json`
    );

    if (queryParams.radius !== undefined) {
      url.searchParams.set('radius', queryParams.radius.toString());
    }

    if (queryParams.limit !== undefined) {
      url.searchParams.set('limit', queryParams.limit.toString());
    }

    if (queryParams.dedupe !== undefined) {
      url.searchParams.set('dedupe', queryParams.dedupe.toString());
    }

    if (queryParams.geometry) {
      url.searchParams.set('geometry', queryParams.geometry);
    }

    if (queryParams.layers && queryParams.layers.length > 0) {
      url.searchParams.set('layers', queryParams.layers.join(','));
    }

    if (queryParams.bands && queryParams.bands.length > 0) {
      url.searchParams.set('bands', queryParams.bands.join(','));
    }

    url.searchParams.set('access_token', accessToken || '');

    const response = await this.fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Tilequery request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    return data;
  }
}
