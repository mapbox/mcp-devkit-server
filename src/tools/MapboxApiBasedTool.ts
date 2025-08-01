import { z, ZodTypeAny } from 'zod';
import { BaseTool, OutputSchema } from './BaseTool.js';

export abstract class MapboxApiBasedTool<
  InputSchema extends ZodTypeAny
> extends BaseTool<InputSchema> {
  static readonly MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
  static readonly MAPBOX_API_ENDPOINT =
    process.env.MAPBOX_API_ENDPOINT || 'https://api.mapbox.com/';

  constructor(params: { inputSchema: InputSchema }) {
    super(params);
  }

  /**
   * Extracts the username from the Mapbox access token.
   * Mapbox tokens are JWT tokens where the payload contains the username.
   * @throws Error if the token is not set, invalid, or doesn't contain username
   */
  static getUserNameFromToken(): string {
    if (!MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN) {
      throw new Error('MAPBOX_ACCESS_TOKEN is not set');
    }

    try {
      // JWT format: header.payload.signature
      const parts = MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN.split('.');
      if (parts.length !== 3) {
        throw new Error('MAPBOX_ACCESS_TOKEN is not in valid JWT format');
      }

      // Decode the payload (second part)
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );

      // The username is stored in the 'u' field
      if (!payload.u) {
        throw new Error(
          'MAPBOX_ACCESS_TOKEN does not contain username in payload'
        );
      }

      return payload.u;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to parse MAPBOX_ACCESS_TOKEN');
    }
  }

  /**
   * Validates if a string has the format of a JWT token (header.payload.signature)
   * Docs: https://docs.mapbox.com/api/accounts/tokens/#token-format
   * @param token The token string to validate
   * @returns boolean indicating if the token has valid JWT format
   */
  private isValidJwtFormat(token: string): boolean {
    // JWT consists of three parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Check that all parts are non-empty
    return parts.every((part) => part.length > 0);
  }

  /**
   * Validates Mapbox token and runs the tool logic.
   */
  async run(rawInput: unknown): Promise<z.infer<typeof OutputSchema>> {
    try {
      if (!MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN) {
        throw new Error('MAPBOX_ACCESS_TOKEN is not set');
      }

      // Validate that the token has the correct JWT format
      if (!this.isValidJwtFormat(MapboxApiBasedTool.MAPBOX_ACCESS_TOKEN)) {
        throw new Error('MAPBOX_ACCESS_TOKEN is not in valid JWT format');
      }

      // Call parent run method which handles the rest
      return await super.run(rawInput);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.log(
        'error',
        `${this.name}: Error during execution: ${errorMessage}`
      );

      return {
        content: [
          {
            type: 'text',
            text: errorMessage || 'Internal error has occurred.'
          }
        ],
        isError: true
      };
    }
  }
}
