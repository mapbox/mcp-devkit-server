// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import {
  setupHttpRequest,
  assertHeadersSent
} from '../../utils/httpPipelineUtils.js';
import { ListFeedbackTool } from '../../../src/tools/list-feedback-tool/ListFeedbackTool.js';

const mockToken = 'sk.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

beforeAll(() => {
  process.env.MAPBOX_ACCESS_TOKEN = mockToken;
});

describe('ListFeedbackTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const { httpRequest } = setupHttpRequest({
        json: async () => ({
          items: [],
          has_before: false,
          has_after: false
        })
      });
      const tool = new ListFeedbackTool({ httpRequest });
      expect(tool.name).toBe('list_feedback_tool');
      expect(tool.description).toContain('List user feedback items');
    });
  });

  it('sends custom header', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      json: async () => ({
        items: [],
        has_before: false,
        has_after: false
      })
    });

    await new ListFeedbackTool({ httpRequest }).run({});
    assertHeadersSent(mockHttpRequest);
  });

  it('constructs correct URL for list operation', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      json: async () => ({
        items: [],
        has_before: false,
        has_after: false
      })
    });

    await new ListFeedbackTool({ httpRequest }).run({});

    const calledUrl = mockHttpRequest.mock.calls[0][0];
    expect(calledUrl).toContain('user-feedback/v1/feedback');
    expect(calledUrl).toContain('access_token=');
    expect(calledUrl).toContain('sort_by=received_at');
    expect(calledUrl).toContain('order=asc');
  });

  it('includes all optional list parameters in URL', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      json: async () => ({
        items: [],
        has_before: false,
        has_after: false
      })
    });

    await new ListFeedbackTool({ httpRequest }).run({
      feedback_ids: [
        '40eae4c7-b157-4b49-a091-7e1099bba77e',
        '8b1eec47-a3f2-4a6d-a2d9-5e8c1f4a9b0c'
      ],
      after:
        'eyJpZCI6IjAxOTg1YWQ2LWE4ZjEtNzdkZS1iODkxLWU4NTVhNGI3ZTQ5NiIsInRpbWVzdGFtcCI6IjIwMjUtMDctMzBUMTA6MTc6NTQuMTYxWiJ9',
      limit: 50,
      sort_by: 'updated_at',
      order: 'desc',
      status: ['fixed', 'reviewed'],
      category: ['poi_details', 'routing_issue'],
      search: 'apartment building',
      trace_id: ['a35ab5db-dd99-45a6-966b-fc6bda2181b9'],
      created_after: '2025-07-01T00:00:00.000Z',
      created_before: '2025-07-31T23:59:59.999Z',
      received_after: '2025-07-01T00:00:00.000Z',
      received_before: '2025-07-31T23:59:59.999Z',
      updated_after: '2025-07-01T00:00:00.000Z',
      updated_before: '2025-07-31T23:59:59.999Z'
    });

    const calledUrl = mockHttpRequest.mock.calls[0][0];
    expect(calledUrl).toContain(
      'feedback_id=40eae4c7-b157-4b49-a091-7e1099bba77e'
    );
    expect(calledUrl).toContain(
      'feedback_id=8b1eec47-a3f2-4a6d-a2d9-5e8c1f4a9b0c'
    );
    expect(calledUrl).toContain('limit=50');
    expect(calledUrl).toContain('sort_by=updated_at');
    expect(calledUrl).toContain('order=desc');
    expect(calledUrl).toContain('status=fixed');
    expect(calledUrl).toContain('status=reviewed');
    expect(calledUrl).toContain('category=poi_details');
    expect(calledUrl).toContain('search=apartment+building');
  });

  it('handles list response with items', async () => {
    const mockResponse = {
      items: [
        {
          id: '40eae4c7-b157-4b49-a091-7e1099bba77e',
          status: 'fixed',
          category: 'poi_details',
          feedback:
            'I want to add a note that to get into this apartment building you have to put in a code for 396.',
          location: {
            place_name:
              'Financial District, Boston, Massachusetts, United States',
            lon: -71.05011393295,
            lat: 42.351484923828
          },
          trace_id: 'a35ab5db-dd99-45a6-966b-fc6bda2181b9',
          received_at: '2025-07-28T14:10:30.123Z',
          created_at: '2025-07-28T14:10:25.000Z',
          updated_at: '2025-07-28T14:10:30.123Z'
        },
        {
          id: '8b1eec47-a3f2-4a6d-a2d9-5e8c1f4a9b0c',
          status: 'received',
          category: 'routing_issue',
          feedback: 'The navigation tried to take me down a one-way street.',
          location: {
            place_name: '123 Main St, Anytown, USA',
            lon: -122.4194,
            lat: 37.7749
          },
          trace_id: '9c12345e-45a6-45a6-966b-abcdef123456',
          received_at: '2025-07-27T11:22:05.456Z',
          created_at: '2025-07-27T11:21:59.000Z',
          updated_at: '2025-07-29T09:00:00.000Z'
        }
      ],
      has_before: false,
      start_cursor:
        'eyJpZCI6IjAxOTg1YWQ2LWE4ZjEtNzdkZS1iODkxLWU4NTVhNGI3ZTQ5NiIsInRpbWVzdGFtcCI6IjIwMjUtMDctMzBUMTA6MTc6NTQuMTYxWiJ9',
      has_after: true,
      end_cursor:
        'eyJpZCI6IjAxOTg1YWQyLTE3MzUtNzNmYS1iMjE2LTI3NDk1YmJjYzFkYiIsInRpbWVzdGFtcCI6IjIwMjUtMDctMzBUMTA6MTI6NTQuNzA5WiJ9'
    };

    const { httpRequest } = setupHttpRequest({
      json: async () => mockResponse
    });

    const result = await new ListFeedbackTool({ httpRequest }).run({});

    expect(result.isError).toBe(false);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Found 2 feedback item(s)');
    expect(result.content[0].text).toContain(
      '40eae4c7-b157-4b49-a091-7e1099bba77e'
    );
    expect(result.content[0].text).toContain(
      '8b1eec47-a3f2-4a6d-a2d9-5e8c1f4a9b0c'
    );
    expect(result.structuredContent).toEqual(mockResponse);
  });

  it('handles empty list response', async () => {
    const { httpRequest } = setupHttpRequest({
      json: async () => ({
        items: [],
        has_before: false,
        has_after: false
      })
    });

    const result = await new ListFeedbackTool({ httpRequest }).run({});

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('No feedback items found');
  });

  it('handles list response with pagination info', async () => {
    const { httpRequest } = setupHttpRequest({
      json: async () => ({
        items: [
          {
            id: '40eae4c7-b157-4b49-a091-7e1099bba77e',
            status: 'fixed',
            category: 'poi_details',
            feedback: 'Test feedback',
            location: {
              place_name: 'Test Location',
              lon: -71.05,
              lat: 42.35
            },
            received_at: '2025-07-28T14:10:30.123Z',
            created_at: '2025-07-28T14:10:25.000Z',
            updated_at: '2025-07-28T14:10:30.123Z'
          }
        ],
        has_before: true,
        start_cursor: 'cursor1',
        has_after: true,
        end_cursor: 'cursor2'
      })
    });

    const result = await new ListFeedbackTool({ httpRequest }).run({});

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Has previous page');
    expect(result.content[0].text).toContain('Has next page');
    expect(result.content[0].text).toContain('cursor1');
    expect(result.content[0].text).toContain('cursor2');
  });

  it('returns JSON format when requested', async () => {
    const mockResponse = {
      items: [
        {
          id: '40eae4c7-b157-4b49-a091-7e1099bba77e',
          status: 'fixed',
          category: 'poi_details',
          feedback: 'Test feedback',
          location: {
            place_name: 'Test Location',
            lon: -71.05,
            lat: 42.35
          },
          received_at: '2025-07-28T14:10:30.123Z',
          created_at: '2025-07-28T14:10:25.000Z',
          updated_at: '2025-07-28T14:10:30.123Z'
        }
      ],
      has_before: false,
      has_after: false
    };

    const { httpRequest } = setupHttpRequest({
      json: async () => mockResponse
    });

    const result = await new ListFeedbackTool({ httpRequest }).run({
      format: 'json_string'
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual(mockResponse);
  });

  it('handles fetch errors gracefully', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const result = await new ListFeedbackTool({ httpRequest }).run({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to list feedback');
    expect(result.content[0].text).toContain('404');
    expect(result.content[0].text).toContain('Not Found');
    assertHeadersSent(mockHttpRequest);
  });

  it('handles scope/permission errors with helpful message', async () => {
    const mockHeaders = new Map([['content-type', 'application/json']]);
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: {
        get: (name: string) => mockHeaders.get(name.toLowerCase())
      } as Headers,
      json: async () => ({
        message: 'This API requires a token with user-feedback:read scope.'
      })
    });

    const result = await new ListFeedbackTool({ httpRequest }).run({});

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');
    const errorText = (result.content[0] as { type: 'text'; text: string })
      .text;
    expect(errorText).toContain('user-feedback:read scope');
    expect(errorText).toContain('appropriate scopes');
    expect(errorText).toContain('MAPBOX_ACCESS_TOKEN');
    assertHeadersSent(mockHttpRequest);
  });

  it('handles invalid response schema gracefully', async () => {
    const { httpRequest } = setupHttpRequest({
      json: async () => ({
        invalid: 'response'
      })
    });

    const result = await new ListFeedbackTool({ httpRequest }).run({});

    // Should still return a result (graceful fallback)
    expect(result.isError).toBe(false);
  });
});
