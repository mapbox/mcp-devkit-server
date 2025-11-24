// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  PromptMessage,
  PromptArgument
} from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt } from './BasePrompt.js';

/**
 * Prompt that guides users through creating secure production-ready access tokens
 */
export class SetupProductionTokenPrompt extends BasePrompt {
  readonly name = 'setup-production-token';
  readonly title = 'Setup Production Access Token';
  readonly description =
    'Create a properly scoped and restricted access token for production use with appropriate security measures';

  readonly arguments: readonly PromptArgument[] = [
    {
      name: 'website',
      description: 'Your website URL (e.g., "https://example.com")',
      required: true
    },
    {
      name: 'purpose',
      description:
        'Token purpose (e.g., "production web app", "mobile app", "public demo")',
      required: true
    },
    {
      name: 'scopes',
      description:
        'Comma-separated list of required scopes (e.g., "styles:read,styles:tiles" for read-only style access)',
      required: false
    }
  ] as const;

  protected generateMessages(args?: Record<string, string>): PromptMessage[] {
    const website = args?.website || 'your website';
    const purpose = args?.purpose || 'production application';
    const scopes = args?.scopes || 'styles:read,styles:tiles';

    // Prepare token configuration example
    const scopesArray = scopes.split(',').map((s) => s.trim());
    const scopesJson = scopesArray.map((s) => `"${s}"`).join(', ');
    const isWebsite = website.includes('http');
    const wildcard = website.replace(/^https?:\/\//, 'https://*.');

    let tokenConfigExample = `{
     "note": "Production - ${purpose} - ${website}",
     "scopes": [${scopesJson}],
     "public": ${isWebsite ? 'true' : 'false'}`;

    if (isWebsite) {
      tokenConfigExample += `,
     "allowedUrls": ["${website}", "${wildcard}"]`;
    } else {
      tokenConfigExample += `
     // No URL restrictions for secret tokens`;
    }

    tokenConfigExample += `
   }`;

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a secure, properly configured production access token for ${purpose}.

## Token Configuration

**Website**: ${website}
**Purpose**: ${purpose}
**Required Scopes**: ${scopes}

## Security Best Practices

Before creating the token, understand these critical security principles:

### 🔒 Public vs Secret Tokens

- **Public tokens (\`pk.*\`)**: Safe for client-side code (websites, mobile apps)
  * Must have URL restrictions
  * Limited to read-only scopes
  * Can be exposed in browser/app code
  * Cannot perform write operations

- **Secret tokens (\`sk.*\`)**: Server-side only
  * Full access to your account
  * Must NEVER be exposed in client code
  * Used for backend API operations
  * Should be stored in environment variables

### 🛡️ Principle of Least Privilege

Only grant the minimum scopes needed:
- **Read-only access**: \`styles:read\`, \`styles:tiles\` (most common for production)
- **Read-write access**: Add \`styles:write\` only if you need to modify styles
- **Token management**: \`tokens:read\`, \`tokens:write\` only for backend admin tools

## Token Creation Steps

1. **Review Current Tokens**:
   - Use \`list_tokens_tool\` to see existing tokens
   - Check if you already have a suitable token
   - Identify any tokens that should be revoked

2. **Determine Token Type**:
   - For ${purpose}:
     * ${isWebsite ? '✅ Use PUBLIC token (pk.*) - this is client-side' : 'Determine if this needs public or secret token'}
     * ${isWebsite ? '✅ Add URL restrictions' : '⚠️  If server-side, use SECRET token (sk.*)'}

3. **Create the Token**:
   Use \`create_token_tool\` with these parameters:

   \`\`\`json
   ${tokenConfigExample}
   \`\`\`

4. **Document the Token**:
   - Save the token value securely
   - For public tokens: Add to your application's environment variables
   - For secret tokens: Add to your backend's secure environment (never commit to git)
   - Document the token's purpose and restrictions in your team's documentation

5. **Verify Token Configuration**:
   - Use \`list_tokens_tool\` to confirm the token was created correctly
   - Check that scopes match requirements
   - Verify URL restrictions are set (for public tokens)
   - Confirm the token note is descriptive

6. **Integration Instructions**:

   **For Web Applications**:
   \`\`\`javascript
   mapboxgl.accessToken = 'pk.YOUR_TOKEN_HERE';

   const map = new mapboxgl.Map({
     container: 'map',
     style: 'mapbox://styles/your-username/your-style-id',
     center: [lng, lat],
     zoom: 12
   });
   \`\`\`

   **For Mobile Apps (React Native)**:
   \`\`\`javascript
   import MapboxGL from '@rnmapbox/maps';

   MapboxGL.setAccessToken('pk.YOUR_TOKEN_HERE');
   \`\`\`

   **For Backend/Server-Side**:
   \`\`\`javascript
   // Load from environment variable
   const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN;

   // Use in API requests
   const response = await fetch('https://api.mapbox.com/...', {
     headers: { 'Authorization': \`Bearer \${MAPBOX_TOKEN}\` }
   });
   \`\`\`

## Security Checklist

Before deploying to production:
- ✅ Token has minimum necessary scopes
- ✅ Public tokens have URL restrictions set
- ✅ Secret tokens are stored in environment variables (not in code)
- ✅ Token note clearly describes its purpose
- ✅ Old/unused tokens are revoked
- ✅ Token rotation plan is documented
- ✅ Team members know how to access tokens securely

## Common Scope Combinations

- **Public website with custom styles**: \`["styles:read", "styles:tiles"]\`
- **Backend tile server**: \`["styles:read", "styles:tiles", "styles:list"]\` (secret token)
- **Admin dashboard**: \`["styles:read", "styles:write", "styles:list", "tokens:read"]\` (secret token)
- **Mobile app**: \`["styles:read", "styles:tiles"]\` (public token with app URL restrictions)

## Token Lifecycle Management

1. **Regular Rotation**: Rotate tokens every 6-12 months
2. **Revoke Compromised Tokens**: If a secret token is exposed, revoke immediately
3. **Monitor Usage**: Check token usage in Mapbox dashboard
4. **Documentation**: Keep a secure record of which tokens are used where

Please proceed with creating the production token now, following these security best practices.`
        }
      }
    ];
  }
}
