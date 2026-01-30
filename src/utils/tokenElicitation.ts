// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Token choice options for preview token elicitation
 */
export type TokenChoice = 'provide' | 'create' | 'auto';

/**
 * Result of token elicitation
 */
export interface ElicitedTokenInfo {
  choice: TokenChoice;
  token?: string;
  urlRestrictions?: string[];
  tokenNote?: string;
}

/**
 * Existing token info for display
 */
export interface ExistingTokenInfo {
  id: string;
  note: string;
  scopes: string[];
}

/**
 * Elicits preview token information from the user via MCP elicitation.
 * This keeps the token out of chat history for better security.
 *
 * @param server - MCP Server instance
 * @param existingTokens - List of user's existing public tokens
 * @returns Elicited token information based on user's choice
 */
export async function elicitPreviewToken(
  server: Server,
  existingTokens: ExistingTokenInfo[]
): Promise<ElicitedTokenInfo> {
  const hasExistingTokens = existingTokens.length > 0;
  const tokenList = hasExistingTokens
    ? existingTokens
        .map((t) => `- ${t.note || t.id}: ${t.scopes.join(', ')}`)
        .join('\n')
    : 'No existing public tokens found.';

  const result = await server.elicitInput({
    message: `Preview Token Setup

Preview URLs require a public token with styles:read scope. This token will be visible in the preview URL.

${hasExistingTokens ? 'Your existing public tokens:\n' + tokenList : tokenList}

For best security, consider using a URL-restricted token that only works on your domains.`,
    requestedSchema: {
      type: 'object',
      properties: {
        choice: {
          type: 'string',
          title: 'Token Option',
          description: 'How would you like to provide the preview token?',
          enum: ['provide', 'create', 'auto'],
          enumNames: [
            'I have a token to provide',
            'Create a new preview token with custom settings',
            'Auto-create a basic preview token for me'
          ]
        },
        token: {
          type: 'string',
          title: 'Your Token',
          description:
            'Paste your public Mapbox token here (must have styles:read scope)',
          minLength: 10
        },
        tokenNote: {
          type: 'string',
          title: 'Token Name (Optional)',
          description:
            'A descriptive name for your new token (e.g., "Preview Token - Production")',
          maxLength: 256
        },
        urlRestrictions: {
          type: 'string',
          title: 'URL Restrictions (Optional)',
          description:
            'Comma-separated URLs to restrict token usage (e.g., "https://yourdomain.com/*,https://staging.yourdomain.com/*")'
        }
      },
      required: ['choice']
    }
  });

  // Check if user accepted or declined
  if (result.action !== 'accept' || !result.content) {
    throw new Error('Token elicitation was cancelled or declined by user');
  }

  // Parse the result
  const choice = (result.content.choice as TokenChoice) || 'auto';
  const token = result.content.token as string | undefined;
  const tokenNote = result.content.tokenNote as string | undefined;
  const urlRestrictionsStr = result.content.urlRestrictions as
    | string
    | undefined;

  const urlRestrictions = urlRestrictionsStr
    ? urlRestrictionsStr
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
    : undefined;

  return {
    choice,
    token,
    urlRestrictions,
    tokenNote
  };
}

/**
 * Session-level storage for preview token preferences.
 * In a real implementation, this could be stored in a database or cache.
 */
class PreviewTokenStorage {
  private tokenCache = new Map<string, string>();

  /**
   * Store a preview token for a specific username
   */
  set(username: string, token: string): void {
    this.tokenCache.set(username, token);
  }

  /**
   * Get stored preview token for a username
   */
  get(username: string): string | undefined {
    return this.tokenCache.get(username);
  }

  /**
   * Clear stored token for a username
   */
  clear(username: string): void {
    this.tokenCache.delete(username);
  }

  /**
   * Clear all stored tokens
   */
  clearAll(): void {
    this.tokenCache.clear();
  }
}

/**
 * Global preview token storage instance
 */
export const previewTokenStorage = new PreviewTokenStorage();
