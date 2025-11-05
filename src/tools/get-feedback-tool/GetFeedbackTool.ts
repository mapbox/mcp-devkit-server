// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { z } from 'zod';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../utils/types.js';
import { GetFeedbackInputSchema } from './GetFeedbackTool.input.schema.js';
import { FeedbackGetResponseSchema } from '../feedback.schema.js';
import type { FeedbackItem } from '../feedback.schema.js';

// API Documentation: https://docs.mapbox.com/api/feedback/

export class GetFeedbackTool extends MapboxApiBasedTool<
  typeof GetFeedbackInputSchema
> {
  name = 'get_feedback_tool';
  description =
    'Get a single user feedback item from the Mapbox Feedback API by its unique ID. Use this tool to retrieve detailed information about a specific user-reported issue, suggestion, or feedback about map data, routing, or POI details. Requires user-feedback:read scope on the access token.';
  annotations = {
    title: 'Get Feedback Tool',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  };

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: GetFeedbackInputSchema,
      httpRequest: params.httpRequest
    });
  }

  /**
   * Formats a feedback item for human-readable text output
   */
  private formatFeedbackItem(item: FeedbackItem): string {
    let result = `Feedback ID: ${item.id}\n`;
    result += `Status: ${item.status}\n`;
    result += `Category: ${item.category}\n`;
    result += `Feedback: ${item.feedback}\n`;
    if (item.location.place_name) {
      result += `Location: ${item.location.place_name} (${item.location.lat}, ${item.location.lon})\n`;
    } else {
      result += `Location: ${item.location.lat}, ${item.location.lon}\n`;
    }
    if (item.trace_id) {
      result += `Trace ID: ${item.trace_id}\n`;
    }
    result += `Created: ${item.created_at}\n`;
    result += `Received: ${item.received_at}\n`;
    result += `Updated: ${item.updated_at}`;
    return result;
  }

  protected async execute(
    input: z.infer<typeof GetFeedbackInputSchema>,
    accessToken: string
  ): Promise<CallToolResult> {
    const url = new URL(
      `${MapboxApiBasedTool.mapboxApiEndpoint}user-feedback/v1/feedback/${input.feedback_id}`
    );
    url.searchParams.append('access_token', accessToken);

    // Make the request
    const response = await this.httpRequest(url.toString());

    if (!response.ok) {
      return await this.handleApiError(response, 'get feedback');
    }

    const rawData = await response.json();

    // Validate and format response
    let data;
    try {
      data = FeedbackGetResponseSchema.parse(rawData);
    } catch (validationError) {
      this.log(
        'warning',
        `Schema validation failed for feedback get response: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
      );
      data = rawData;
    }

    if (input.format === 'json_string') {
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        structuredContent: data as unknown as Record<string, unknown>,
        isError: false
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: this.formatFeedbackItem(data as FeedbackItem)
          }
        ],
        structuredContent: data as unknown as Record<string, unknown>,
        isError: false
      };
    }
  }
}
