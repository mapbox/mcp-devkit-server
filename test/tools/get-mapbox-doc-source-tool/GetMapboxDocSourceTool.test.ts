// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, expect, it } from 'vitest';
import { GetMapboxDocSourceTool } from '../../../src/tools/get-mapbox-doc-source-tool/GetMapboxDocSourceTool.js';
import { setupHttpRequest } from '../../utils/httpPipelineUtils.js';

describe('GetMapboxDocSourceTool', () => {
  it('should have correct name and description', () => {
    const { httpRequest } = setupHttpRequest();
    const tool = new GetMapboxDocSourceTool({ httpRequest });

    expect(tool.name).toBe('get_latest_mapbox_docs_tool');
    expect(tool.description).toContain(
      'Get the latest official Mapbox documentation'
    );
    expect(tool.description).toContain('Always up-to-date');
    expect(tool.description).toContain('instead of web search');
  });

  it('should successfully fetch documentation content', async () => {
    const mockContent = `# Mapbox Documentation
    
This is the Mapbox developer documentation for LLMs.

## Web SDKs
- Mapbox GL JS for interactive maps
- Mobile SDKs for iOS and Android

## APIs  
- Geocoding API for address search
- Directions API for routing`;
    const { httpRequest, mockHttpRequest } = setupHttpRequest({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockContent)
    });

    const tool = new GetMapboxDocSourceTool({ httpRequest });
    const result = await tool.run({});

    expect(mockHttpRequest).toHaveBeenCalledWith(
      'https://docs.mapbox.com/llms.txt',
      {
        headers: {
          'User-Agent': 'TestServer/1.0.0 (default, no-tag, abcdef)'
        }
      }
    );
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    if (result.content[0].type === 'text') {
      expect(result.content[0].text).toBe(mockContent);
    }
    expect(result.isError).toBe(false);
  });

  it('should handle HTTP errors', async () => {
    const { httpRequest } = setupHttpRequest({
      ok: false,
      status: 404
    });

    const tool = new GetMapboxDocSourceTool({ httpRequest });

    const result = await tool.run({});

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');

    if (result.content[0].type === 'text') {
      expect(result.content[0].text).toContain(
        'Failed to fetch Mapbox documentation'
      );
      expect(result.content[0].text).toContain('HTTP error! status: 404');
    }
  });

  it('should handle network errors', async () => {
    const { httpRequest } = setupHttpRequest({
      text: () => Promise.reject(new Error('Network error'))
    });

    const tool = new GetMapboxDocSourceTool({ httpRequest });
    const result = await tool.run({});

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');

    if (result.content[0].type === 'text') {
      expect(result.content[0].text).toContain(
        'Failed to fetch Mapbox documentation'
      );
      expect(result.content[0].text).toContain('Network error');
    }
  });

  it('should handle unknown errors', async () => {
    const { httpRequest } = setupHttpRequest({
      text: () => Promise.reject(new Error('Unknown error occurred'))
    });

    const tool = new GetMapboxDocSourceTool({ httpRequest });
    const result = await tool.run({});

    expect(result.isError).toBe(true);
    expect(result.content[0].type).toBe('text');

    if (result.content[0].type === 'text') {
      expect(result.content[0].text).toContain(
        'Failed to fetch Mapbox documentation'
      );
      expect(result.content[0].text).toContain('Unknown error occurred');
    }
  });

  it('should work with empty input object', async () => {
    const mockContent = 'Test documentation content';

    const { httpRequest } = setupHttpRequest({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockContent)
    });

    const tool = new GetMapboxDocSourceTool({ httpRequest });

    const result = await tool.run({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });
});
