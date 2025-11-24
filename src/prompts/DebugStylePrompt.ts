// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  PromptMessage,
  PromptArgument
} from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt } from './BasePrompt.js';

/**
 * Prompt that guides users through debugging map style issues
 */
export class DebugStylePrompt extends BasePrompt {
  readonly name = 'debug-style-issues';
  readonly title = 'Debug Style Issues';
  readonly description =
    'Systematically debug and troubleshoot issues with Mapbox map styles';

  readonly arguments: readonly PromptArgument[] = [
    {
      name: 'problem',
      description:
        'The issue you\'re experiencing (e.g., "style not loading", "missing layers", "wrong colors", "tiles not rendering")',
      required: true
    },
    {
      name: 'styleId',
      description:
        'The style ID having issues (e.g., "username/style-id" or "mapbox/streets-v12")',
      required: false
    }
  ] as const;

  protected generateMessages(args?: Record<string, string>): PromptMessage[] {
    const problem = args?.problem || 'style issues';
    const styleId = args?.styleId || 'the style';

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Debug and resolve issues with ${styleId ? `style: ${styleId}` : 'a Mapbox style'}.

## Problem Description

**Issue**: ${problem}
${styleId ? `**Style ID**: ${styleId}` : '**Style**: (will be identified during diagnosis)'}

## Systematic Debugging Process

### 1. Verify Style Existence and Access

First, confirm the style exists and is accessible:

- Use \`list_styles_tool\` to see all available styles
- Check if ${styleId ? styleId : 'your style'} appears in the list
- Verify the style ID format is correct: \`username/style-id\` or \`mapbox/style-name-v##\`

**Common Issues**:
- ❌ Typo in style ID
- ❌ Style belongs to different account
- ❌ Style was deleted
- ❌ Missing \`mapbox://styles/\` prefix in application code

### 2. Retrieve and Validate Style JSON

Get the full style specification:

- Use \`retrieve_style_tool\` with the style ID
- Examine the returned JSON structure
- Check for these critical elements:

\`\`\`json
{
  "version": 8,        // ✅ Must be 8
  "name": "...",       // ✅ Should have a name
  "sources": {...},    // ✅ Must have at least one source
  "layers": [...]      // ✅ Must have layers array
}
\`\`\`

**Common Issues**:
- ❌ Missing \`"version": 8\`
- ❌ Empty or malformed \`sources\` object
- ❌ Empty \`layers\` array
- ❌ Invalid source references in layers
- ❌ Syntax errors in style JSON

### 3. Validate Token Permissions

Check if your access token has the right scopes:

- Use \`list_tokens_tool\` to see available tokens
- Verify the token being used has these scopes:
  * \`styles:read\` - Required to access style
  * \`styles:tiles\` - Required to load tile data
- For browser/client apps, token must be public (\`pk.*\`)
- Secret tokens (\`sk.*\`) cannot be used in browser code

**Common Issues**:
- ❌ Token missing \`styles:tiles\` scope
- ❌ Using secret token in client-side code
- ❌ URL restrictions blocking your domain (for public tokens)
- ❌ Token expired or revoked

### 4. Check Source Configuration

Examine each source in the style:

**For Vector Tile Sources**:
\`\`\`json
{
  "type": "vector",
  "url": "mapbox://mapbox.mapbox-streets-v8"  // ✅ Correct format
}
\`\`\`

**For GeoJSON Sources**:
\`\`\`json
{
  "type": "geojson",
  "data": { ... }  // ✅ Valid GeoJSON object or URL
}
\`\`\`

**Common Issues**:
- ❌ Invalid source URL format
- ❌ Missing \`mapbox://\` protocol
- ❌ Incorrect tileset ID
- ❌ Malformed GeoJSON data
- ❌ CORS issues with external GeoJSON URLs

### 5. Validate Layer Configuration

For each layer, check:

**Layer Structure**:
\`\`\`json
{
  "id": "unique-layer-id",           // ✅ Must be unique
  "type": "fill|line|symbol|...",    // ✅ Valid type
  "source": "source-id",             // ✅ Must match a source
  "source-layer": "layer-name",      // ✅ For vector tiles only
  "paint": {...},                    // ✅ Valid paint properties
  "layout": {...}                    // ✅ Valid layout properties
}
\`\`\`

**Common Issues**:
- ❌ \`source\` doesn't match any defined source
- ❌ \`source-layer\` missing for vector tile sources
- ❌ \`source-layer\` used with GeoJSON source (should not have this)
- ❌ Invalid property values in \`paint\` or \`layout\`
- ❌ Layers rendering in wrong order
- ❌ Expressions with syntax errors

### 6. Test Style Rendering

Create a preview to see the actual rendering:

- First, ensure you have a public token with proper scopes
- Use \`create_token_tool\` if needed: \`{"scopes": ["styles:read", "styles:tiles"], "public": true}\`
- Use \`preview_style_tool\` with the style ID and token
- View the generated preview to see actual rendering issues

**Visual Debugging Checklist**:
- 🔍 Are tiles loading at all? (Check for 404 errors)
- 🔍 Are some zoom levels broken but others work?
- 🔍 Are specific layers missing?
- 🔍 Are colors/symbols wrong?
- 🔍 Are labels overlapping or misplaced?

### 7. Problem-Specific Solutions

**"Style not loading"**:
1. Verify token has \`styles:read\` and \`styles:tiles\`
2. Check browser console for 401/403 errors
3. Confirm style ID is correct
4. Test with a known-good style (e.g., \`mapbox/streets-v12\`)

**"Missing layers"**:
1. Check if layers exist in style JSON (use retrieve_style_tool)
2. Verify \`source-layer\` matches tileset layers
3. Check zoom range: \`minzoom\` and \`maxzoom\` properties
4. Verify paint opacity isn't set to 0

**"Wrong colors/styling"**:
1. Review paint properties for affected layers
2. Check for expression evaluation issues
3. Verify data-driven styling property values
4. Look for z-index/layer order issues

**"Tiles not rendering"**:
1. Verify source URL is correct
2. Check token has \`styles:tiles\` scope
3. Look for CORS errors (for external sources)
4. Test at different zoom levels

**"Performance issues"**:
1. Count total layers (>50 may be slow)
2. Check for complex expressions
3. Look for unnecessary duplicate layers
4. Consider simplifying geometries

### 8. Compare with Working Style

If still stuck, compare with a known-good style:

- Use \`style_comparison_tool\` to compare:
  * \`before\`: A working base style (e.g., \`mapbox/streets-v12\`)
  * \`after\`: Your problematic style
- This side-by-side view can reveal differences
- Look for what's missing or different

### 9. Update and Test

If you've identified the issue:

- Use \`update_style_tool\` to fix the style JSON
- Always include complete valid style specification
- Test the updated style with \`preview_style_tool\`
- Verify in your application

### 10. Prevention for Future

Best practices to avoid issues:

✅ Always start from a valid base style
✅ Make incremental changes and test frequently
✅ Use \`retrieve_style_tool\` before \`update_style_tool\`
✅ Keep backups of working style versions
✅ Validate JSON syntax before updating
✅ Test across multiple zoom levels
✅ Document custom layers and sources

## Quick Diagnostic Commands

Run these for fast diagnosis:

\`\`\`bash
# 1. List all your styles
list_styles_tool

# 2. Get the style JSON
retrieve_style_tool {"styleId": "${styleId || 'username/style-id'}"}

# 3. Check your tokens
list_tokens_tool

# 4. Preview the style
preview_style_tool {
  "styleId": "${styleId || 'username/style-id'}",
  "accessToken": "pk.your-token"
}
\`\`\`

## Additional Resources

Use these tools for documentation:
- \`mapbox_style_layers_resource\` - Valid layer types and properties
- \`mapbox_token_scopes_resource\` - Required token scopes

Proceed now with systematic debugging, starting from step 1 and working through until the issue is resolved.`
        }
      }
    ];
  }
}
