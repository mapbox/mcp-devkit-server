// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { setupHttpRequest } from '../../utils/httpPipelineUtils.js';
import { ListTilesetsTool } from '../../../src/tools/list-tilesets-tool/ListTilesetsTool.js';

const tokenPayload = Buffer.from(JSON.stringify({ u: 'testuser' })).toString(
  'base64'
);
process.env.MAPBOX_ACCESS_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${tokenPayload}.signature`;

type TextContent = { type: 'text'; text: string };

const fakeTilesets = [
  {
    id: 'testuser.abc',
    name: 'Example Tileset',
    type: 'vector',
    visibility: 'private',
    created: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'testuser.def',
    name: 'Other Tileset',
    type: 'raster',
    visibility: 'public',
    created: '2026-02-01T00:00:00.000Z'
  }
];

describe('ListTilesetsTool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns tilesets for the authenticated user', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      headers: new Headers(),
      json: async () => fakeTilesets
    } as Response);

    const tool = new ListTilesetsTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({});

    expect(result.isError).toBe(false);
    expect(mockHttpRequest).toHaveBeenCalledTimes(1);
    const calledUrl = mockHttpRequest.mock.calls[0][0] as string;
    expect(calledUrl).toContain('tilesets/v1/testuser');

    const payload = JSON.parse((result.content[1] as TextContent).text);
    expect(payload.tilesets).toHaveLength(2);
  });

  it('forwards filter + pagination params', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      headers: new Headers(),
      json: async () => []
    } as Response);

    const tool = new ListTilesetsTool({ httpRequest });
    tool['log'] = vi.fn();

    await tool.run({
      type: 'vector',
      visibility: 'private',
      sortby: 'created',
      limit: 50,
      start: 'testuser.xyz'
    });

    const calledUrl = mockHttpRequest.mock.calls[0][0] as string;
    expect(calledUrl).toContain('type=vector');
    expect(calledUrl).toContain('visibility=private');
    expect(calledUrl).toContain('sortby=created');
    expect(calledUrl).toContain('limit=50');
    expect(calledUrl).toContain('start=testuser.xyz');
  });

  it('extracts next_start from Link header for pagination', async () => {
    const headers = new Headers({
      Link: '<https://api.mapbox.com/tilesets/v1/testuser?start=testuser.next>; rel="next"'
    });

    const { httpRequest } = setupHttpRequest({
      headers,
      json: async () => fakeTilesets
    } as Response);

    const tool = new ListTilesetsTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({});

    const structured = (
      result as unknown as {
        structuredContent?: { next_start?: string };
      }
    ).structuredContent;
    expect(structured?.next_start).toBe('testuser.next');
  });

  it('surfaces non-2xx responses as errors', async () => {
    const { httpRequest } = setupHttpRequest({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers(),
      json: async () => ({ message: 'Insufficient scope' }),
      text: async () => '{"message":"Insufficient scope"}'
    } as Response);

    const tool = new ListTilesetsTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({});
    expect(result.isError).toBe(true);
  });
});
