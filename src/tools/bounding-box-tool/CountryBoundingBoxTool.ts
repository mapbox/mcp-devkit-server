// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool } from '../BaseTool.js';
import {
  CountryBoundingBoxSchema,
  CountryBoundingBoxInput
} from './CountryBoundingBoxTool.input.schema.js';
import { CountryBoundingBoxOutputSchema } from './CountryBoundingBoxTool.output.schema.js';
import boundariesData from './BoundariesData.js';

export class CountryBoundingBoxTool extends BaseTool<
  typeof CountryBoundingBoxSchema,
  typeof CountryBoundingBoxOutputSchema
> {
  readonly name = 'country_bounding_box_tool';
  readonly description =
    'Gets bounding box for a country by its ISO 3166-1 country code, returns as [minX, minY, maxX, maxY].';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: 'Get Country Bounding Box Tool'
  };

  private boundariesData: Record<string, [number, number, number, number]> =
    boundariesData as unknown as Record<
      string,
      [number, number, number, number]
    >;

  constructor() {
    super({
      inputSchema: CountryBoundingBoxSchema,
      outputSchema: CountryBoundingBoxOutputSchema
    });
  }

  protected async execute(
    input: CountryBoundingBoxInput
  ): Promise<CallToolResult> {
    const { iso_3166_1 } = input;
    const upperCaseCode = iso_3166_1.toUpperCase();
    const bbox = this.boundariesData[upperCaseCode];

    if (!bbox) {
      return {
        content: [
          {
            type: 'text',
            text: `Country code "${iso_3166_1}" not found. Please use a valid ISO 3166-1 country code (e.g., "CN", "US", "AE").`
          }
        ],
        isError: true
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ data: bbox }, null, 2)
        }
      ],
      structuredContent: {
        data: bbox
      },
      isError: false
    };
  }

  // Helper method to get all supported country codes
  public getSupportedCountries(): string[] {
    return Object.keys(this.boundariesData).sort();
  }
}
