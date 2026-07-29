// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import type { ToolExecutionContext } from '../../utils/tracing.js';
import { getUserNameFromToken } from '../../utils/jwtUtils.js';
import { filterExpandedMapboxStyles } from '../../utils/styleUtils.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import {
  CreateStyleInputSchema,
  CreateStyleInput
} from './CreateStyleTool.input.schema.js';
import {
  MapboxStyleOutput,
  MapboxStyleOutputSchema
} from './CreateStyleTool.output.schema.js';

export class CreateStyleTool extends MapboxApiBasedTool<
  typeof CreateStyleInputSchema,
  typeof MapboxStyleOutputSchema
> {
  name = 'create_style_tool';
  // The Standard import example lives on the `style` field's own description rather than being
  // repeated here; the model gets both.
  description = `Create a new Mapbox style from a complete style JSON.

Uploads whatever JSON it is given — it does not build a style. Prefer style_builder_tool for that:
it defaults to Mapbox Standard and supplies what hand-authored styles miss, an explicit slot on
every custom layer and emissive strength so they survive the dusk/night presets.

First check whether Standard's config already expresses the intent — theme, lightPreset, show* and
color* need no style to create or maintain. A dark map is lightPreset:'night', not a new style.

A Standard style is an 'imports' entry, not a layer stack: no background layer, no basemap layers
copied in, and 'sources'/'layers' hold only your own data. Omitting imports makes a Classic style.`;
  readonly annotations = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
    title: 'Create Mapbox Style Tool'
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: CreateStyleInputSchema,
      outputSchema: MapboxStyleOutputSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    input: CreateStyleInput,
    accessToken: string,
    _context: ToolExecutionContext
  ): Promise<CallToolResult> {
    const username = getUserNameFromToken(accessToken);
    const url = `${MapboxApiBasedTool.mapboxApiEndpoint}styles/v1/${username}?access_token=${accessToken}`;

    // Merge name into style object for API request
    const payload = {
      ...input.style,
      name: input.name
    };

    const response = await this.httpRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return this.handleApiError(response, 'create style');
    }

    const rawData = await response.json();
    // Validate response against schema with graceful fallback
    let data: MapboxStyleOutput;
    try {
      data = MapboxStyleOutputSchema.parse(rawData);
    } catch (validationError) {
      this.log(
        'warning',
        `Schema validation failed for search response: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
      );
      // Graceful fallback to raw data
      data = rawData as MapboxStyleOutput;
    }

    this.log('info', `CreateStyleTool: Successfully created style ${data.id}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(filterExpandedMapboxStyles(data), null, 2)
        }
      ],
      structuredContent: filterExpandedMapboxStyles(data),
      isError: false
    };
  }
}
