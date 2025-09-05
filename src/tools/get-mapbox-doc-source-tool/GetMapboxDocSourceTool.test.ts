import { GetMapboxDocSourceTool } from './GetMapboxDocSourceTool.js';

// Mock fetch for testing
global.fetch = jest.fn();

describe('GetMapboxDocSourceTool', () => {
  let tool: GetMapboxDocSourceTool;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    tool = new GetMapboxDocSourceTool();
    mockFetch.mockClear();
  });

  it('should have correct name and description', () => {
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

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockContent)
    } as Response);

    const result = await tool.run({});

    expect(mockFetch).toHaveBeenCalledWith('https://docs.mapbox.com/llms.txt');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    if (result.content[0].type === 'text') {
      expect(result.content[0].text).toBe(mockContent);
    }
    expect(result.isError).toBe(false);
  });

  it('should handle HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    } as Response);

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
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

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
    mockFetch.mockRejectedValueOnce('Unknown error');

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

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(mockContent)
    } as Response);

    const result = await tool.run({});

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
  });
});
