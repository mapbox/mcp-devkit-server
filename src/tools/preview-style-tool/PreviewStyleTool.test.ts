// Use a token with valid JWT format for tests
process.env.MAPBOX_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIiwiYSI6InRlc3QtYXBpIn0.signature';

import { ListTokensTool } from '../list-tokens-tool/ListTokensTool.js';
import { PreviewStyleTool } from './PreviewStyleTool.js';

describe('PreviewStyleTool', () => {
  let mockListTokensTool: jest.SpyInstance;

  beforeEach(() => {
    // Mock the ListTokensTool.run method
    mockListTokensTool = jest
      .spyOn(ListTokensTool.prototype, 'run')
      .mockResolvedValue({
        isError: false,
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              tokens: [
                {
                  id: 'cktest123',
                  note: 'Public token for testing',
                  usage: 'pk',
                  token:
                    'pk.eyJhbGciOiJIUzI1NiJ9.eyJ1IjoidGVzdC11c2VyIn0.public_token',
                  scopes: ['styles:read', 'fonts:read']
                }
              ],
              count: 1
            })
          }
        ]
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      const tool = new PreviewStyleTool();
      expect(tool.name).toBe('preview_style_tool');
      expect(tool.description).toBe(
        'Generate preview URL for a Mapbox style using an existing public token'
      );
    });

    it('should have correct input schema', () => {
      const { PreviewStyleSchema } = require('./PreviewStyleTool.schema.ts');
      expect(PreviewStyleSchema).toBeDefined();
    });
  });

  it('fetches public token and returns preview URL', async () => {
    const result = await new PreviewStyleTool().run({ styleId: 'test-style' });

    expect(result.isError).toBe(false);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        '/styles/v1/test-user/test-style.html?access_token=pk.'
      )
    });

    // Verify that ListTokensTool was called with correct parameters
    expect(mockListTokensTool).toHaveBeenCalledWith({
      usage: 'pk'
    });
  });

  it('includes styleId in URL', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'my-custom-style'
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('/styles/v1/test-user/my-custom-style.html')
    });
  });

  it('includes title parameter when provided', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style',
      title: true
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/title=true/)
    });
  });

  it('includes zoomwheel parameter when provided', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style',
      zoomwheel: false
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/zoomwheel=false/)
    });
  });

  it('includes fresh parameter for secure access', async () => {
    const result = await new PreviewStyleTool().run({
      styleId: 'test-style'
    });

    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringMatching(/fresh=true/)
    });
  });

  it('handles token listing failure', async () => {
    mockListTokensTool.mockResolvedValueOnce({
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Token listing failed'
        }
      ]
    });

    const result = await new PreviewStyleTool().run({ styleId: 'test-style' });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Failed to retrieve public tokens')
    });
  });

  it('handles no public tokens found', async () => {
    mockListTokensTool.mockResolvedValueOnce({
      isError: false,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            tokens: [],
            count: 0
          })
        }
      ]
    });

    const result = await new PreviewStyleTool().run({ styleId: 'test-style' });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('No public tokens found')
    });
  });

  it('returns URL on success', async () => {
    const result = await new PreviewStyleTool().run({ styleId: 'test-style' });

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining(
        'https://api.mapbox.com/styles/v1/test-user/test-style.html?access_token=pk.'
      )
    });

    // Verify fresh parameter is included
    expect(result.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('fresh=true')
    });
  });
});
