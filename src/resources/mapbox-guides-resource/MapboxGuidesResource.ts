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
 * Resource providing Mapbox guides and tutorials
 */
export class MapboxGuidesResource extends BaseResource {
  readonly name = 'Mapbox Guides';
  readonly uri = 'resource://mapbox-guides';
  readonly description =
    'Mapbox guides, tutorials, and how-tos including Studio Manual, map design guides, and best practices';
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

      // Parse and filter for guide sections only
      const allSections = parseDocSections(content);
      const guideSections = filterSectionsByCategory(allSections, 'guides');
      const guideContent = sectionsToMarkdown(guideSections);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: this.mimeType,
            text: `# Mapbox Guides\n\n${guideContent}`
          }
        ]
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch Mapbox guides: ${errorMessage}`);
    }
  }
}
