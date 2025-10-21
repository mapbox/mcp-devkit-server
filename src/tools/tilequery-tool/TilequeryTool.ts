// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  TilequerySchema,
  TilequeryInput
} from './TilequeryTool.input.schema.js';
import {
  TilequeryResponse,
  TilequeryResponseSchema
} from './TilequeryTool.output.schema.js';

export class TilequeryTool extends MapboxApiBasedTool<
  typeof TilequerySchema,
  typeof TilequeryResponseSchema
> {
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

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: TilequerySchema,
      outputSchema: TilequeryResponseSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: TilequeryInput,
    accessToken?: string
  ): Promise<CallToolResult> {
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

    const response = await this.httpRequest(url.toString());

    if (!response.ok) {
      return this.handleApiError(response, 'query tile');
    }

    const rawData = await response.json();

    // Validate response against schema with graceful fallback
    let data: TilequeryResponse;
    try {
      data = TilequeryResponseSchema.parse(rawData);
    } catch (validationError) {
      this.log(
        'warning',
        `Schema validation failed for search response: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
      );
      // Graceful fallback to raw data
      data = rawData as TilequeryResponse;
    }

    this.log(
      'info',
      `TilequeryTool: Successfully completed query, found ${data.features?.length || 0} results`
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ],
      structuredContent: data,
      isError: false
    };
  }
}
