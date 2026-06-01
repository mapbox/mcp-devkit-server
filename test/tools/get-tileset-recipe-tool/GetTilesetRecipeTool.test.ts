// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { setupHttpRequest } from '../../utils/httpPipelineUtils.js';
import { GetTilesetRecipeTool } from '../../../src/tools/get-tileset-recipe-tool/GetTilesetRecipeTool.js';

process.env.MAPBOX_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwidSI6InRlc3R1c2VyIn0.signature';

const fakeRecipe = {
  version: 1,
  layers: {
    points: {
      source: 'mapbox://tileset-source/testuser/points',
      minzoom: 0,
      maxzoom: 5
    }
  }
};

describe('GetTilesetRecipeTool', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fetches a recipe by tileset id', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      json: async () => fakeRecipe
    } as Response);

    const tool = new GetTilesetRecipeTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({ tileset_id: 'testuser.abc' });

    expect(result.isError).toBe(false);
    const calledUrl = mockHttpRequest.mock.calls[0][0] as string;
    expect(calledUrl).toContain('tilesets/v1/testuser.abc/recipe');
  });

  it('rejects malformed tileset_id', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest();
    const tool = new GetTilesetRecipeTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({ tileset_id: 'nope' });

    expect(result.isError).toBe(true);
    expect(mockHttpRequest).not.toHaveBeenCalled();
  });
});
