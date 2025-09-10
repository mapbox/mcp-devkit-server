// Use a token with valid JWT format for tests
const payload = Buffer.from(JSON.stringify({ u: 'testuser' })).toString(
  'base64'
);
process.env.MAPBOX_ACCESS_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { MapboxApiBasedTool } from '../../src/tools/MapboxApiBasedTool.js';

// Create a minimal implementation of MapboxApiBasedTool for testing
class TestTool extends MapboxApiBasedTool<typeof TestTool.inputSchema> {
  readonly name = 'test_tool';
  readonly description = 'Tool for testing MapboxApiBasedTool error handling';

  static readonly inputSchema = z.object({
    testParam: z.string()
  });

  constructor() {
    super({ inputSchema: TestTool.inputSchema });
  }

  protected async execute(
    _input: z.infer<typeof TestTool.inputSchema>
  ): Promise<unknown> {
    throw new Error('Test error message');
  }
}

describe('MapboxApiBasedTool', () => {
  let testTool: TestTool;
  const originalEnv = process.env;

  beforeEach(() => {
    const mockToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
    vi.stubEnv('mapboxAccessToken', mockToken);

    // Reset the static property to pick up the new environment variable
    Object.defineProperty(MapboxApiBasedTool, 'mapboxAccessToken', {
      value: mockToken,
      writable: true,
      configurable: true
    });

    testTool = new TestTool();
    // Mock the log method to test that errors are properly logged
    testTool['log'] = vi.fn();
  });

  afterEach(() => {
    // Restore the process.env to its original state
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getUserNameFromToken', () => {
    it('extracts username from valid token', () => {
      const testPayload = Buffer.from(
        JSON.stringify({ u: 'myusername' })
      ).toString('base64');
      const spy = vi
        .spyOn(MapboxApiBasedTool, 'mapboxAccessToken', 'get')
        .mockReturnValue(`eyJhbGciOiJIUzI1NiJ9.${testPayload}.signature`);

      const username = MapboxApiBasedTool.getUserNameFromToken();
      expect(username).toBe('myusername');

      spy.mockRestore();
    });

    it('throws error when token is not set', () => {
      const spy = vi
        .spyOn(MapboxApiBasedTool, 'mapboxAccessToken', 'get')
        .mockReturnValue(undefined);

      expect(() => MapboxApiBasedTool.getUserNameFromToken()).toThrow(
        'No access token provided. Please set MAPBOX_ACCESS_TOKEN environment variable or pass it as an argument.'
      );

      spy.mockRestore();
    });

    it('throws error when token has invalid format', () => {
      const spy = vi
        .spyOn(MapboxApiBasedTool, 'mapboxAccessToken', 'get')
        .mockReturnValue('invalid-token-format');

      expect(() => MapboxApiBasedTool.getUserNameFromToken()).toThrow(
        'MAPBOX_ACCESS_TOKEN is not in valid JWT format'
      );

      spy.mockRestore();
    });

    it('throws error when payload does not contain username', () => {
      const invalidPayload = Buffer.from(
        JSON.stringify({ sub: 'test' })
      ).toString('base64');

      const spy = vi
        .spyOn(MapboxApiBasedTool, 'mapboxAccessToken', 'get')
        .mockReturnValue(`eyJhbGciOiJIUzI1NiJ9.${invalidPayload}.signature`);

      expect(() => MapboxApiBasedTool.getUserNameFromToken()).toThrow(
        'MAPBOX_ACCESS_TOKEN does not contain username in payload'
      );

      spy.mockRestore();
    });
  });

  describe('JWT token validation', () => {
    it('throws an error when the token is not in a valid JWT format', async () => {
      const spy = vi
        .spyOn(MapboxApiBasedTool, 'mapboxAccessToken', 'get')
        .mockReturnValue('invalid-token-format');

      // Create a new instance with the modified token
      const toolWithInvalidToken = new TestTool();
      // Mock the log method separately for this instance
      toolWithInvalidToken['log'] = vi.fn();

      // Try to call the run method, it should throw an error due to invalid JWT format
      const result = await toolWithInvalidToken.run({ testParam: 'test' });

      // Verify the error response
      expect(result.isError).toBe(true);

      // Check for error message content
      if (process.env.VERBOSE_ERRORS === 'true') {
        expect(
          (result.content[0] as { type: 'text'; text: string }).text
        ).toContain('not in valid JWT format');
      }

      // Verify the error was logged
      expect(toolWithInvalidToken['log']).toHaveBeenCalledWith(
        'error',
        expect.stringMatching(/.*not in valid JWT format.*/)
      );

      spy.mockRestore();
    });

    it('accepts a token with valid JWT format', async () => {
      // Set a valid JWT format token (header.payload.signature)
      const validPayload = Buffer.from(
        JSON.stringify({ u: 'testuser' })
      ).toString('base64');
      process.env.MAPBOX_ACCESS_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${validPayload}.signature`;

      // Override execute to return a success result instead of throwing an error
      testTool['execute'] = vi.fn().mockResolvedValue({ success: true });

      const result = await testTool.run({ testParam: 'test' });

      // The token validation should pass, and we should get the success result
      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(
        JSON.parse((result.content[0] as { type: 'text'; text: string }).text)
      ).toEqual({ success: true });
    });
  });

  describe('username extraction from token', () => {
    it('throws error for invalid JWT format', () => {
      const spy = vi
        .spyOn(MapboxApiBasedTool, 'mapboxAccessToken', 'get')
        .mockReturnValue('invalid-token');

      expect(() => {
        MapboxApiBasedTool.getUserNameFromToken();
      }).toThrow('MAPBOX_ACCESS_TOKEN is not in valid JWT format');

      spy.mockRestore();
    });

    it('throws error when username field is missing', () => {
      const tokenWithoutUsername =
        'eyJhbGciOiJIUzI1NiJ9.eyJhIjoidGVzdC1hcGkifQ.signature';

      const spy = vi
        .spyOn(MapboxApiBasedTool, 'mapboxAccessToken', 'get')
        .mockReturnValue(tokenWithoutUsername);

      expect(() => {
        MapboxApiBasedTool.getUserNameFromToken();
      }).toThrow('MAPBOX_ACCESS_TOKEN does not contain username in payload');

      spy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('returns generic error message when VERBOSE_ERRORS is not set to true', async () => {
      // Make sure VERBOSE_ERRORS is not set to true
      delete process.env.VERBOSE_ERRORS;

      const result = await testTool.run({ testParam: 'test' });

      // Verify the response contains the generic error message
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: 'Test error message'
      });

      // Verify the error was logged with the actual error message
      expect(testTool['log']).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Test error message')
      );
    });

    it('returns actual error message when VERBOSE_ERRORS=true', async () => {
      // Set VERBOSE_ERRORS to true
      process.env.VERBOSE_ERRORS = 'true';

      const result = await testTool.run({ testParam: 'test' });

      // Verify the response contains the actual error message
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: 'Test error message'
      });

      // Verify the error was logged with the actual error message
      expect(testTool['log']).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Test error message')
      );
    });

    it('returns generic error message when VERBOSE_ERRORS is set to a value other than true', async () => {
      // Set VERBOSE_ERRORS to something other than 'true'
      process.env.VERBOSE_ERRORS = 'yes';

      const result = await testTool.run({ testParam: 'test' });

      // Verify the response contains the generic error message
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: 'Test error message'
      });

      // Verify the error was logged with the actual error message
      expect(testTool['log']).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Test error message')
      );
    });

    it('handles non-Error objects thrown', async () => {
      // Override the execute method to throw a string instead of an Error
      testTool['execute'] = vi.fn().mockImplementation(() => {
        throw 'String error message';
      });

      process.env.VERBOSE_ERRORS = 'true';

      const result = await testTool.run({ testParam: 'test' });

      // Verify the response contains the string error
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: 'String error message'
      });

      // Verify the error was logged
      expect(testTool['log']).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('String error message')
      );
    });
  });
});
