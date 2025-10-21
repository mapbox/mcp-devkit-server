// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool } from '../BaseTool.js';
import {
  GetReferenceSchema,
  GetReferenceInput
} from './GetReferenceTool.input.schema.js';
import { getAllResources } from '../../resources/resourceRegistry.js';

/**
 * Tool to access Mapbox reference documentation and schemas
 * This tool provides access to static reference data that helps understand
 * Mapbox concepts, field definitions, token scopes, and layer type mappings.
 */
export class GetReferenceTool extends BaseTool<typeof GetReferenceSchema> {
  readonly name = 'get_reference_tool';
  readonly description =
    'Get Mapbox reference documentation including Streets v8 field definitions, token scopes, layer type mappings, and style specifications. Use this tool to understand what fields, scopes, or layer types are available before creating styles or tokens.';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: 'Get Mapbox Reference Documentation'
  };

  constructor() {
    super({ inputSchema: GetReferenceSchema });
  }

  protected async execute(input: GetReferenceInput): Promise<CallToolResult> {
    const resources = getAllResources();
    const resource = resources.find((r) => r.uri === input.reference);

    if (!resource) {
      return {
        content: [
          {
            type: 'text',
            text: `Reference not found: ${input.reference}\n\nAvailable references:\n${resources.map((r) => `- ${r.uri}: ${r.description}`).join('\n')}`
          }
        ],
        isError: true
      };
    }

    try {
      // Call the resource's readCallback to get the content
      const uri = new URL(resource.uri);
      // Pass empty object for extra parameter (not used by resources)
      const result = await resource.readCallback(uri, {} as any);

      // Return the first content item (resources can return multiple but we typically have one)
      if (result.contents.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No content available for reference: ${input.reference}`
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: result.contents[0].text
          }
        ],
        isError: false
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading reference: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }
}
