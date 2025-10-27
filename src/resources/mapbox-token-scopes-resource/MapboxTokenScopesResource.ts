// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { BaseResource } from '../BaseResource.js';

/**
 * Resource providing Mapbox token scope reference documentation
 * Helps users and AI understand what each token scope allows
 */
export class MapboxTokenScopesResource extends BaseResource {
  readonly name = 'Mapbox Token Scopes Reference';
  readonly uri = 'resource://mapbox-token-scopes';
  readonly description =
    'Reference guide for Mapbox access token scopes and their permissions. Use this to understand what each scope allows and which scopes are needed for different operations.';
  readonly mimeType = 'text/markdown';

  public async readCallback(uri: URL, _extra: unknown) {
    const markdown = this.generateMarkdown();

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: this.mimeType,
          text: markdown
        }
      ]
    };
  }

  private generateMarkdown(): string {
    return `# Mapbox Token Scopes Reference

This guide explains the available scopes for Mapbox access tokens and what operations they enable.

## Token Types

### Public Tokens
Public tokens are used in client-side applications (web browsers, mobile apps). They have limited scopes for security.

### Secret Tokens
Secret tokens are used server-side and have broader permissions including write operations.

## Public Token Scopes

These scopes can be used with public tokens created via the \`create_token_tool\`:

### \`styles:tiles\`
- **Purpose**: Access map tiles from your styles
- **Required for**: Rendering maps with Mapbox GL JS, Mobile SDKs, or Static Images API
- **Use case**: Production map display in applications
- **Security**: Safe for public use, only allows reading pre-rendered tiles

### \`styles:read\`
- **Purpose**: Read style JSON definitions
- **Required for**: Retrieving style configurations via the Styles API
- **Use case**: Style inspection, analysis, and management
- **Note**: Does not allow modifying styles (requires secret token)

### \`fonts:read\`
- **Purpose**: Access font glyphs for map labels
- **Required for**: Rendering text and labels on maps
- **Use case**: Map rendering with custom or default fonts
- **Note**: Required whenever maps display text labels

### \`datasets:read\`
- **Purpose**: Read from Mapbox Datasets API
- **Required for**: Accessing features from uploaded datasets
- **Use case**: Reading custom geographic data, querying dataset features
- **Note**: Does not allow modifying datasets (requires secret token)

### \`vision:read\`
- **Purpose**: Access Mapbox Vision API
- **Required for**: Computer vision features in navigation and AR applications
- **Use case**: Advanced navigation, object detection, AR overlays
- **Note**: Specialized scope for Vision SDK users

## Secret Token Scopes

Secret tokens (like \`MAPBOX_ACCESS_TOKEN\` environment variable) typically have these scopes:

### \`styles:write\`
- **Purpose**: Create, update, and delete styles
- **Required for**: \`create_style_tool\`, \`update_style_tool\`, \`delete_style_tool\`
- **Security**: Keep secret, never expose in client-side code

### \`styles:list\`
- **Purpose**: List all styles in an account
- **Required for**: \`list_styles_tool\`
- **Security**: Keep secret, reveals account information

### \`tokens:read\`
- **Purpose**: List and read token information
- **Required for**: \`list_tokens_tool\`
- **Security**: Keep secret, reveals account tokens
- **Note**: When listing tokens, the actual token value is only returned for public tokens; secret token values are omitted for security (only metadata like id, scopes, and creation date is shown)

### \`tokens:write\`
- **Purpose**: Create, update, and delete tokens
- **Required for**: \`create_token_tool\`
- **Security**: Keep secret, allows managing access tokens

## Common Scope Combinations

### For Map Display (Public Token)
\`\`\`
["styles:tiles", "fonts:read"]
\`\`\`
Minimal scopes for rendering a map with labels.

### For Map Display with Custom Data (Public Token)
\`\`\`
["styles:tiles", "fonts:read", "datasets:read"]
\`\`\`
Allows displaying maps with data from Mapbox Datasets.

### For Development Tools (Public Token)
\`\`\`
["styles:tiles", "styles:read", "fonts:read"]
\`\`\`
Allows rendering maps and inspecting style configurations.

### For Server-Side Operations (Secret Token)
Secret tokens typically have comprehensive scopes:
\`\`\`
["styles:read", "styles:write", "styles:list", "fonts:read", "datasets:read", "tokens:read", "tokens:write"]
\`\`\`

## Best Practices

1. **Use Public Tokens in Client Applications**: Never expose secret tokens in browsers or mobile apps
2. **Minimal Scopes**: Only grant the scopes needed for your specific use case
3. **URL Restrictions**: Use \`allowedUrls\` parameter when creating public tokens to restrict usage to your domains
4. **Token Expiration**: Set expiration dates for temporary access tokens
5. **Rotate Regularly**: Periodically rotate secret tokens used in production

## Token Management Tools

- **\`create_token_tool\`**: Create new public tokens with specific scopes
- **\`list_tokens_tool\`**: List all tokens in your account
- **\`list_styles_tool\`**: List styles (requires \`styles:list\` scope)
- **\`create_style_tool\`**: Create styles (requires \`styles:write\` scope)

## More Information

- [Mapbox Access Tokens Documentation](https://docs.mapbox.com/help/getting-started/access-tokens/)
- [Mapbox Token API Reference](https://docs.mapbox.com/api/accounts/tokens/)
`;
  }
}
