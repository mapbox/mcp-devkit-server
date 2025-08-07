// Use a token with valid JWT format for tests
const payload = Buffer.from(JSON.stringify({ u: 'testuser' })).toString(
  'base64'
);
process.env.MAPBOX_ACCESS_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

import { z } from 'zod';
import { MapboxApiBasedTool } from './MapboxApiBasedTool';

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
    testTool = new TestTool();
    // Mock the log method to test that errors are properly logged
    testTool['log'] = jest.fn();
  });

  afterEach(() => {
    // Restore the process.env to its original state
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  describe('getUserNameFromToken', () => {
    it('extracts username from valid token', () => {
      const testPayload = Buffer.from(
        JSON.stringify({ u: 'myusername' })
      ).toString('base64');
      const originalToken = MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN;

      try {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: `eyJhbGciOiJIUzI1NiJ9.${testPayload}.signature`,
          writable: true,
          configurable: true
        });

        const username = MapboxApiBasedTool.getUserNameFromToken();
        expect(username).toBe('myusername');
      } finally {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: originalToken,
          writable: true,
          configurable: true
        });
      }
    });

    it('throws error when token is not set', () => {
      const originalToken = MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN;

      try {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: undefined,
          writable: true,
          configurable: true
        });

        expect(() => MapboxApiBasedTool.getUserNameFromToken()).toThrow(
          'No access token provided. Please set MAPBOX_ACCESS_TOKEN environment variable or pass it as an argument.'
        );
      } finally {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: originalToken,
          writable: true,
          configurable: true
        });
      }
    });

    it('throws error when token has invalid format', () => {
      const originalToken = MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN;

      try {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: 'invalid-token-format',
          writable: true,
          configurable: true
        });

        expect(() => MapboxApiBasedTool.getUserNameFromToken()).toThrow(
          'MAPBOX_ACCESS_TOKEN is not in valid JWT format'
        );
      } finally {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: originalToken,
          writable: true,
          configurable: true
        });
      }
    });

    it('throws error when payload does not contain username', () => {
      const invalidPayload = Buffer.from(
        JSON.stringify({ sub: 'test' })
      ).toString('base64');
      const originalToken = MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN;

      try {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: `eyJhbGciOiJIUzI1NiJ9.${invalidPayload}.signature`,
          writable: true,
          configurable: true
        });

        expect(() => MapboxApiBasedTool.getUserNameFromToken()).toThrow(
          'MAPBOX_ACCESS_TOKEN does not contain username in payload'
        );
      } finally {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: originalToken,
          writable: true,
          configurable: true
        });
      }
    });
  });

  describe('JWT token validation', () => {
    it('throws an error when the token is not in a valid JWT format', async () => {
      // Test the private isValidJwtFormat method directly
      const originalToken = MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN;

      try {
        // Temporarily modify the static property for testing
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: 'invalid-token-format',
          writable: true,
          configurable: true
        });

        // Create a new instance with the modified token
        const toolWithInvalidToken = new TestTool();
        // Mock the log method separately for this instance
        toolWithInvalidToken['log'] = jest.fn();

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
      } finally {
        // Restore the original value
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: originalToken,
          writable: true,
          configurable: true
        });
      }
    });

    it('accepts a token with valid JWT format', async () => {
      // Set a valid JWT format token (header.payload.signature)
      const validPayload = Buffer.from(
        JSON.stringify({ u: 'testuser' })
      ).toString('base64');
      process.env.MAPBOX_ACCESS_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${validPayload}.signature`;

      // Override execute to return a success result instead of throwing an error
      testTool['execute'] = jest.fn().mockResolvedValue({ success: true });

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
    it('extracts username from valid token', () => {
      const username = MapboxApiBasedTool.getUserNameFromToken();
      expect(username).toBe('testuser');
    });

    it('throws error for invalid JWT format', () => {
      const originalToken = MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN;

      try {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: 'invalid-token',
          writable: true,
          configurable: true
        });

        expect(() => {
          MapboxApiBasedTool.getUserNameFromToken();
        }).toThrow('MAPBOX_ACCESS_TOKEN is not in valid JWT format');
      } finally {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: originalToken,
          writable: true,
          configurable: true
        });
      }
    });

    it('throws error when username field is missing', () => {
      const tokenWithoutUsername =
        'eyJhbGciOiJIUzI1NiJ9.eyJhIjoidGVzdC1hcGkifQ.signature';
      const originalToken = MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN;

      try {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: tokenWithoutUsername,
          writable: true,
          configurable: true
        });

        expect(() => {
          MapboxApiBasedTool.getUserNameFromToken();
        }).toThrow('MAPBOX_ACCESS_TOKEN does not contain username in payload');
      } finally {
        Object.defineProperty(MapboxApiBasedTool, 'MAPBOX_ACCESS_TOKEN', {
          value: originalToken,
          writable: true,
          configurable: true
        });
      }
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
      testTool['execute'] = jest.fn().mockImplementation(() => {
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
