// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { setupHttpRequest } from '../../utils/httpPipelineUtils.js';
import { GetTilesetTool } from '../../../src/tools/get-tileset-tool/GetTilesetTool.js';

process.env.MAPBOX_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwidSI6InRlc3R1c2VyIn0.signature';

const fakeTileset = {
  id: 'testuser.abc',
  name: 'Example Tileset',
  type: 'vector',
  visibility: 'private',
  bounds: [-180, -85, 180, 85]
};

describe('GetTilesetTool', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fetches a tileset by id', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      json: async () => fakeTileset
    } as Response);

    const tool = new GetTilesetTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({ tileset_id: 'testuser.abc' });

    expect(result.isError).toBe(false);
    const calledUrl = mockHttpRequest.mock.calls[0][0] as string;
    expect(calledUrl).toContain('tilesets/v1/testuser.abc');
  });

  it('rejects malformed tileset_id', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest();
    const tool = new GetTilesetTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({ tileset_id: 'not-a-real-id' });

    expect(result.isError).toBe(true);
    expect(mockHttpRequest).not.toHaveBeenCalled();
  });
});
