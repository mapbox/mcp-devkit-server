// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ReadResourceResult,
  ServerNotification,
  ServerRequest
} from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { BaseResource } from '../BaseResource.js';
import {
  parseDocSections,
  filterSectionsByCategory,
  sectionsToMarkdown
} from '../utils/docParser.js';

/**
 * Resource providing Mapbox API reference documentation
 */
export class MapboxApiReferenceResource extends BaseResource {
  readonly name = 'Mapbox API Reference';
  readonly uri = 'resource://mapbox-api-reference';
  readonly description =
    'Mapbox REST API reference documentation including endpoints, parameters, rate limits, and authentication for all Mapbox APIs (Geocoding, Directions, Static Images, Tilequery, etc.)';
  readonly mimeType = 'text/markdown';

  private httpRequest: HttpRequest;

  constructor(params: { httpRequest: HttpRequest }) {
    super();
    this.httpRequest = params.httpRequest;
  }

  public async readCallback(
    uri: URL,
    _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ): Promise<ReadResourceResult> {
    try {
      const response = await this.httpRequest(
        'https://docs.mapbox.com/llms.txt',
        {
          headers: {
            Accept: 'text/markdown, text/plain;q=0.9, */*;q=0.8'
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch Mapbox documentation: ${response.statusText}`
        );
      }

      const content = await response.text();

      // Parse and filter for API sections only
      const allSections = parseDocSections(content);
      const apiSections = filterSectionsByCategory(allSections, 'apis');
      const apiContent = sectionsToMarkdown(apiSections);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: this.mimeType,
            text: `# Mapbox API Reference\n\n${apiContent}`
          }
        ]
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch Mapbox API reference: ${errorMessage}`);
    }
  }
}
