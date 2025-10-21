// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jwtUtils from '../../src/utils/jwtUtils.js';

describe('jwtUtils', () => {
  describe('getUserNameFromToken', () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    it('extracts username from valid token', () => {
      const testPayload = Buffer.from(
        JSON.stringify({ u: 'myusername' })
      ).toString('base64');

      vi.stubEnv(
        'MAPBOX_ACCESS_TOKEN',
        `eyJhbGciOiJIUzI1NiJ9.${testPayload}.signature`
      );

      const username = jwtUtils.getUserNameFromToken();
      expect(username).toBe('myusername');
    });

    it('throws error when token is not set', () => {
      vi.stubEnv('MAPBOX_ACCESS_TOKEN', '');

      expect(() => jwtUtils.getUserNameFromToken()).toThrow(
        'No access token provided. Please set MAPBOX_ACCESS_TOKEN environment variable or pass it as an argument.'
      );
    });

    it('throws error when token has invalid format', () => {
      vi.stubEnv('MAPBOX_ACCESS_TOKEN', 'invalid-token-format');

      expect(() => jwtUtils.getUserNameFromToken()).toThrow(
        'MAPBOX_ACCESS_TOKEN is not in valid JWT format'
      );
    });

    it('throws error when payload does not contain username', () => {
      const invalidPayload = Buffer.from(
        JSON.stringify({ sub: 'test' })
      ).toString('base64');

      vi.stubEnv(
        'MAPBOX_ACCESS_TOKEN',
        `eyJhbGciOiJIUzI1NiJ9.${invalidPayload}.signature`
      );

      expect(() => jwtUtils.getUserNameFromToken()).toThrow(
        'MAPBOX_ACCESS_TOKEN does not contain username in payload'
      );
    });
  });

  describe('username extraction from token', () => {
    it('throws error for invalid JWT format', () => {
      vi.stubEnv('MAPBOX_ACCESS_TOKEN', 'invalid-token');

      expect(() => {
        jwtUtils.getUserNameFromToken();
      }).toThrow('MAPBOX_ACCESS_TOKEN is not in valid JWT format');
    });

    it('throws error when username field is missing', () => {
      const tokenWithoutUsername =
        'eyJhbGciOiJIUzI1NiJ9.eyJhIjoidGVzdC1hcGkifQ.signature';

      vi.stubEnv('MAPBOX_ACCESS_TOKEN', tokenWithoutUsername);

      expect(() => {
        jwtUtils.getUserNameFromToken();
      }).toThrow('MAPBOX_ACCESS_TOKEN does not contain username in payload');
    });
  });
});
