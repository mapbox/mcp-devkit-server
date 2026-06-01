// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { setupHttpRequest } from '../../utils/httpPipelineUtils.js';
import { GetTilesetStatusTool } from '../../../src/tools/get-tileset-status-tool/GetTilesetStatusTool.js';

process.env.MAPBOX_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwidSI6InRlc3R1c2VyIn0.signature';

describe('GetTilesetStatusTool', () => {
  afterEach(() => vi.restoreAllMocks());

  it('hits the /status endpoint when only tileset_id is given', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      json: async () => ({ status: 'success', jobs: [] })
    } as Response);

    const tool = new GetTilesetStatusTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({ tileset_id: 'testuser.abc' });

    expect(result.isError).toBe(false);
    const calledUrl = mockHttpRequest.mock.calls[0][0] as string;
    expect(calledUrl).toContain('tilesets/v1/testuser.abc/status');
    expect(calledUrl).not.toContain('/jobs/');
  });

  it('hits the /jobs/{job_id} endpoint when job_id is provided', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      json: async () => ({ id: 'job123', stage: 'processing' })
    } as Response);

    const tool = new GetTilesetStatusTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({
      tileset_id: 'testuser.abc',
      job_id: 'job123'
    });

    expect(result.isError).toBe(false);
    const calledUrl = mockHttpRequest.mock.calls[0][0] as string;
    expect(calledUrl).toContain('tilesets/v1/testuser.abc/jobs/job123');
    const summary = (result.content[0] as { type: 'text'; text: string }).text;
    expect(summary).toContain('processing');
  });

  it('rejects malformed tileset_id', async () => {
    const { httpRequest, mockHttpRequest } = setupHttpRequest();
    const tool = new GetTilesetStatusTool({ httpRequest });
    tool['log'] = vi.fn();

    const result = await tool.run({ tileset_id: 'bogus' });

    expect(result.isError).toBe(true);
    expect(mockHttpRequest).not.toHaveBeenCalled();
  });
});
