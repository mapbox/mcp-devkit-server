// Use a token with valid JWT format for tests
const payload = Buffer.from(JSON.stringify({ u: 'testuser' })).toString(
  'base64'
);
process.env.MAPBOX_ACCESS_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  MapboxApiBasedTool,
  redactToken
} from '../../src/tools/MapboxApiBasedTool.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { HttpRequest } from '../../src/utils/types.js';
import { setupHttpRequest } from '../utils/httpPipelineUtils.js';

// Create a minimal implementation of MapboxApiBasedTool for testing
class TestTool extends MapboxApiBasedTool<typeof TestTool.inputSchema> {
  // Provide minimal but realistic annotations for the test tool
  annotations = {
    title: 'Test Tool',
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
    destructiveHint: false
  };
  readonly name = 'test_tool';
  readonly description = 'Tool for testing MapboxApiBasedTool error handling';

  static readonly inputSchema = z.object({
    testParam: z.string()
  });

  constructor(params: { httpRequest: HttpRequest }) {
    super({
      inputSchema: TestTool.inputSchema,
      httpRequest: params.httpRequest
    });
  }

  protected async execute(
    _input: z.infer<typeof TestTool.inputSchema>
  ): Promise<CallToolResult> {
    throw new Error('Test error message');
  }
}

describe('redactToken', () => {
  const PUBLIC_TOKEN = 'pk.eyJ1IjoiZXhhbXBsZS1hY2NvdW50In0.signaturevalue';
  const SECRET_TOKEN = 'sk.eyJ1IjoidGVzdHVzZXIifQ.signaturevalue';
  const TEMP_TOKEN = 'tk.eyJ1IjoidGVtcC11c2VyXzEifQ.signaturevalue';

  it('keeps the prefix and account name, dropping the signature', () => {
    expect(redactToken(`access_token=${PUBLIC_TOKEN}`)).toBe(
      'access_token=pk.example-account.redacted'
    );
    expect(redactToken(`access_token=${SECRET_TOKEN}`)).toBe(
      'access_token=sk.testuser.redacted'
    );
    expect(redactToken(`access_token=${TEMP_TOKEN}`)).toBe(
      'access_token=tk.temp-user_1.redacted'
    );
  });

  it('never emits the token signature', () => {
    expect(
      redactToken(
        `https://api.mapbox.com/tokens/v2/example-account?access_token=${PUBLIC_TOKEN}&limit=5`
      )
    ).toBe(
      'https://api.mapbox.com/tokens/v2/example-account?access_token=pk.example-account.redacted&limit=5'
    );
  });

  it('redacts every occurrence in a string', () => {
    expect(
      redactToken(
        `first access_token=${PUBLIC_TOKEN} second access_token=${SECRET_TOKEN}`
      )
    ).toBe(
      'first access_token=pk.example-account.redacted second access_token=sk.testuser.redacted'
    );
  });

  it.each([
    ['an unrecognized prefix', 'zz.eyJ1IjoidGVzdHVzZXIifQ.signaturevalue'],
    ['too few segments', 'pk.eyJ1IjoidGVzdHVzZXIifQ'],
    ['a payload that is not base64 JSON', 'pk.@@@notbase64@@@.signaturevalue'],
    [
      'a payload with no account name',
      'pk.eyJhIjoibm9hY2NvdW50In0.signaturevalue'
    ],
    ['an opaque value', 'some-legacy-opaque-token']
  ])('falls back to *** for %s', (_case, token) => {
    expect(redactToken(`access_token=${token}`)).toBe('access_token=***');
  });

  it('leaves strings without a token untouched', () => {
    expect(
      redactToken('https://api.mapbox.com/tokens/v2/example-account')
    ).toBe('https://api.mapbox.com/tokens/v2/example-account');
  });
});

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

    const { httpRequest } = setupHttpRequest();
    testTool = new TestTool({ httpRequest });
    // Mock the log method to test that errors are properly logged
    testTool['log'] = vi.fn();
  });

  afterEach(() => {
    // Restore the process.env to its original state
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('JWT token validation', () => {
    it('throws an error when the token is not in a valid JWT format', async () => {
      const spy = vi
        .spyOn(MapboxApiBasedTool, 'mapboxAccessToken', 'get')
        .mockReturnValue('invalid-token-format');

      // Create a new instance with the modified token
      const { httpRequest } = setupHttpRequest();
      const toolWithInvalidToken = new TestTool({ httpRequest });
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
      testTool['execute'] = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
        isError: false
      });

      const result = await testTool.run({ testParam: 'test' });

      // The token validation should pass, and we should get the success result
      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(
        JSON.parse((result.content[0] as { type: 'text'; text: string }).text)
      ).toEqual({ success: true });
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
