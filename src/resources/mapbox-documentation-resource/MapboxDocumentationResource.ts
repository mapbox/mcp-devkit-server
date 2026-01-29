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

/**
 * Resource providing the latest official Mapbox documentation
 * fetched from docs.mapbox.com/llms.txt
 */
export class MapboxDocumentationResource extends BaseResource {
  readonly name = 'Mapbox Documentation';
  readonly uri = 'resource://mapbox-documentation';
  readonly description =
    'Latest official Mapbox documentation, APIs, SDKs, and developer resources. Always up-to-date comprehensive coverage of all current Mapbox services.';
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

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: this.mimeType,
            text: content
          }
        ]
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch Mapbox documentation: ${errorMessage}`);
    }
  }
}
