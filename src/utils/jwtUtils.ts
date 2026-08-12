// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import process from 'node:process';

export function mapboxAccessToken() {
  return process.env.MAPBOX_ACCESS_TOKEN;
}

export function mapboxApiEndpoint() {
  return process.env.MAPBOX_API_ENDPOINT || 'https://api.mapbox.com/';
}

/**
 * Extracts the username from the Mapbox access token's `u` claim, WITHOUT verifying
 * the token's signature — this only base64-decodes the JWT payload.
 *
 * The returned value is only as trustworthy as whatever already validated this
 * token (e.g. the Mapbox API itself rejecting the token value if it's forged, or an
 * upstream gateway that verifies bearers before this code ever sees them). Do not
 * use this result alone for authorization decisions or as a cache key for anything
 * sensitive — hash the raw token instead if you need a value tied to the specific
 * credential presented (see `cacheKeyFor` in `tokenElicitation.ts` for why).
 *
 * @throws Error if the token is not set, invalid, or doesn't contain username
 */
export function getUserNameFromToken(accessToken?: string): string {
  const token = accessToken || mapboxAccessToken();
  if (!token) {
    throw new Error(
      'No access token provided. Please set MAPBOX_ACCESS_TOKEN environment variable or pass it as an argument.'
    );
  }

  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
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
