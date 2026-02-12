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
 * Resource providing Mapbox SDK documentation
 */
export class MapboxSdkDocsResource extends BaseResource {
  readonly name = 'Mapbox SDK Documentation';
  readonly uri = 'resource://mapbox-sdk-docs';
  readonly description =
    'Mapbox SDK and client library documentation for mobile (iOS, Android, Flutter) and web (Mapbox GL JS, Search JS) platforms';
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

      // Parse and filter for SDK sections only
      const allSections = parseDocSections(content);
      const sdkSections = filterSectionsByCategory(allSections, 'sdks');
      const sdkContent = sectionsToMarkdown(sdkSections);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: this.mimeType,
            text: `# Mapbox SDK Documentation\n\n${sdkContent}`
          }
        ]
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch Mapbox SDK docs: ${errorMessage}`);
    }
  }
}
