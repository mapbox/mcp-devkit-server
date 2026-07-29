// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt, type PromptArgument } from './BasePrompt.js';

/**
 * Prompt for systematically debugging Mapbox integration issues
 *
 * This prompt guides users through a comprehensive troubleshooting workflow:
 * 1. Verify token validity and scopes
 * 2. Check style configuration and existence
 * 3. Validate GeoJSON if applicable
 * 4. Test API endpoints
 * 5. Review error messages and provide solutions
 */
export class DebugMapboxIntegrationPrompt extends BasePrompt {
  readonly name = 'debug-mapbox-integration';
  readonly description =
    'Systematic troubleshooting workflow for Mapbox integration issues. Diagnoses token problems, style errors, API issues, and provides actionable solutions.';

  readonly arguments: ReadonlyArray<PromptArgument> = [
    {
      name: 'issue_description',
      description:
        'Description of the problem (e.g., "map not loading", "401 error")',
      required: true
    },
    {
      name: 'error_message',
      description: 'Exact error message from console or logs, if available',
      required: false
    },
    {
      name: 'style_id',
      description: 'Mapbox style ID being used, if applicable',
      required: false
    },
    {
      name: 'environment',
      description:
        'Where the issue occurs: "development", "production", "staging"',
      required: false
    }
  ];

  getMessages(args: Record<string, string>): PromptMessage[] {
    const issueDescription = args['issue_description'];
    const errorMessage = args['error_message'];
    const styleId = args['style_id'];
    const environment = args['environment'] || 'development';

    let instructionText = `Debug Mapbox integration issue: "${issueDescription}"
${errorMessage ? `\nError message: "${errorMessage}"` : ''}
${styleId ? `Style ID: ${styleId}` : ''}
Environment: ${environment}

Let's systematically diagnose and fix this issue.

## Phase 1: Token Verification

First, verify that tokens are properly configured:

1. **List all tokens**
   - Use list_tokens_tool to see all available tokens
   - Check the output carefully

2. **Analyze token issues**
   Look for common problems:
   - ❌ **No tokens exist**: Need to create tokens first
   - ❌ **Wrong token type**: Using secret token (sk.*) in client code
   - ❌ **Missing scopes**: Token doesn't have required scopes for the operation
   - ❌ **URL restrictions**: Token is restricted to different URLs than where it's being used
   - ❌ **Revoked token**: Token may have been revoked

3. **Check required scopes**
   Based on the issue, verify the token has the correct scopes:
`;

    if (errorMessage && errorMessage.includes('401')) {
      instructionText += `   - **401 Unauthorized** typically means:
     * Token is invalid or revoked
     * Token is missing required scopes
     * Token is not set correctly (check: mapboxgl.accessToken = '...')
`;
    } else if (errorMessage && errorMessage.includes('403')) {
      instructionText += `   - **403 Forbidden** typically means:
     * Token lacks required scope for this operation
     * URL restriction blocks this domain
     * Rate limit exceeded
`;
    } else {
      instructionText += `   - Displaying maps: needs \`styles:read\`, \`fonts:read\`
   - Creating styles: needs \`styles:write\`
   - Listing styles: needs \`styles:list\`
   - Managing tokens: needs \`tokens:read\` or \`tokens:write\`
`;
    }

    if (styleId) {
      instructionText += `
## Phase 2: Style Verification

Since a style ID was provided, let's verify it exists and is valid:

1. **List user's styles**
   - Use list_styles_tool to see all available styles
   - Check if "${styleId}" appears in the list

2. **Analyze style issues**
   - ❌ **Style not found**: Style ID may be incorrect or from different account
   - ❌ **Style from wrong account**: Using someone else's private style
   - ❌ **Malformed style ID**: Should be in format "mapbox://styles/username/style-id"

`;
    } else {
      instructionText += `
## Phase 2: Style Verification

No style ID provided. If the issue involves a specific style:
1. Ask the user for the style ID they're trying to use
2. Use list_styles_tool to verify it exists
3. Check the style configuration

`;
    }

    instructionText += `## Phase 3: Common Error Pattern Matching

Analyze the error and provide specific solutions:

`;

    if (errorMessage) {
      instructionText += `Based on the error message "${errorMessage}", check for:

`;

      if (
        errorMessage.toLowerCase().includes('401') ||
        errorMessage.toLowerCase().includes('unauthorized')
      ) {
        instructionText += `### 401 Unauthorized Solutions:
1. **Token not set**: Verify \`mapboxgl.accessToken = 'your-token'\` is called before creating the map
2. **Invalid token**: The token may be malformed, revoked, or expired
3. **Check token validity**: Use list_tokens_tool to verify the token exists
4. **Environment variable**: If using env vars, ensure MAPBOX_ACCESS_TOKEN is set correctly

`;
      }

      if (
        errorMessage.toLowerCase().includes('403') ||
        errorMessage.toLowerCase().includes('forbidden')
      ) {
        instructionText += `### 403 Forbidden Solutions:
1. **URL restriction**: Token is restricted to different URLs
   - Development: Check token allows http://localhost:*
   - Production: Check token allows your domain
2. **Missing scope**: Token needs additional scopes
   - Use list_tokens_tool to check current scopes
   - Use update_token_tool to add required scopes
3. **Rate limit**: Check if you've exceeded API rate limits

`;
      }

      if (
        errorMessage.toLowerCase().includes('style') ||
        errorMessage.toLowerCase().includes('404')
      ) {
        instructionText += `### Style Not Found Solutions:
1. **Wrong style URL**: Verify format is "mapbox://styles/username/style-id"
2. **Private style**: Ensure token has access to this style
3. **Style deleted**: Check if style still exists using list_styles_tool
4. **Typo in style ID**: Double-check the style ID spelling

`;
      }

      if (
        errorMessage.toLowerCase().includes('source') ||
        errorMessage.toLowerCase().includes('layer')
      ) {
        instructionText += `### Layer/Source Error Solutions:
1. **Source not defined**: Ensure source is added before layers that reference it
2. **Invalid layer type**: Check layer type matches source geometry
3. **Missing required property**: Verify all required layer properties are set
4. **Check style spec**: Read \`resource://mapbox-style-layers\` for layer requirements
5. **\`beforeId\` targeting a basemap layer fails on Standard**: those layer names belong to the
   import and are not addressable from your style. Use \`slot\` instead — see Phase 3b

`;
      }
    } else {
      instructionText += `### General debugging steps:

**If map isn't displaying:**
1. Check browser console for errors
2. Verify container div exists: \`<div id="map"></div>\`
3. Ensure container has dimensions set in CSS: \`#map { height: 400px; }\`
4. Confirm token is set before map initialization
5. Check network tab for failed API requests

**If map loads but looks wrong:**
1. Verify style ID is correct
2. Check if custom layers are properly configured
3. Ensure zoom/center coordinates are valid
4. Review layer order and visibility — on a style that imports Standard this means \`slot\`, not
   array order or \`beforeId\`; see Phase 3b

**If getting rate limit errors:**
1. Check token usage in Mapbox dashboard
2. Consider implementing request caching
3. Review rate limit documentation
4. Upgrade plan if needed

`;
    }

    instructionText += `## Phase 3b: Standard-Specific Rendering Failures

Check whether the style has an \`imports\` array (use retrieve_style_tool if you have the style ID).
**Skip this phase entirely if it does not** — none of it applies to a Classic style, where you order
layers yourself and nothing is lit.

Where the style does import Standard, these are the failures that throw no error and log nothing:
the style is valid, the layer is in the JSON, and the map still looks wrong.

1. **"My layer isn't visible"** — check emissive strength first
   - \`fill-\`, \`line-\` and \`circle-emissive-strength\` default to \`0\`, so the lit scene shades
     the layer into shadow. Under \`lightPreset: "dusk"\` or \`"night"\` it goes nearly invisible
   - Set them to \`1\` on every custom fill, line and circle layer
   - Tell-tale: it looks right by day and disappears at night. If the app switches presets by clock
     time, this reproduces only in the evening
   - \`symbol\` layers are fine (icon/text emissive strength already default to \`1\`);
     \`fill-extrusion\` is real 3D and should be lit; \`heatmap\` has no such property

2. **"My layer covers the street labels"** — the layer has no \`slot\`
   - No \`slot\` is not neutral placement: the layer draws above **every** basemap layer, labels
     included
   - \`bottom\` (below roads) for choropleths and rasters, \`middle\` (above roads, behind labels and
     3D buildings) for data overlays, \`top\` (above POI labels) for markers

3. **"Part of my route disappears"** — \`line-occlusion-opacity\` defaults to \`0\`, which hides the
   stretch running behind a 3D building. Set it to \`1\`

4. **"I hid a basemap layer and it's still there"** — on Standard you cannot remove a layer that
   belongs to the import. Use the \`show*\` config properties
   (\`showPointOfInterestLabels\`, \`showPlaceLabels\`, \`showRoadLabels\`, \`show3dObjects\`, …)

5. **"Dark mode only half applied"** — \`lightPreset: "night"\` relights the basemap but does **not**
   recolor your own layers; they keep the paint colors you gave them. That is what emissive strength
   is for. Hand-authoring dark colors instead of using the preset produces exactly this split

6. **"\`setPaintProperty\` on a basemap layer does nothing"** — the layer belongs to the import.
   Use \`setConfigProperty('basemap', 'colorWater', …)\` / \`setStyleImportConfigProperty\` instead

Reproduce at the preset the app actually ships, and at \`night\` as well — items 1 and 3 are
invisible in a day-time review.

## Phase 4: Testing & Validation

Run these diagnostic checks:

1. **Test token directly**
   - Use the token to list_styles_tool or list_tokens_tool
   - If these calls fail, the token itself is the issue

2. **Generate test preview**
   - If a style exists, use preview_style_tool to generate a working preview
   - Compare the working preview with the broken implementation

3. **Check documentation**
   - Read \`resource://mapbox-style-layers\` for style JSON issues
   - Read \`resource://mapbox-token-scopes\` for token scope questions
   - Read \`resource://mapbox-streets-v8-fields\` for data layer questions

## Phase 5: Solution Summary

After completing diagnostics, provide:

1. **Root cause identified**: Clearly state what the problem is
2. **Immediate fix**: Step-by-step instructions to resolve the issue
3. **Prevention**: How to avoid this issue in the future
4. **Additional resources**: Relevant documentation links

## Phase 6: Verification

After applying fixes:

1. **Retest the integration**
   - Clear browser cache if testing in development
   - Check console for any new errors
   - Verify map loads and displays correctly

2. **Monitor for issues**
   - Watch for similar errors in production
   - Set up error tracking (Sentry, etc.)
   - Review Mapbox dashboard for usage patterns

---

Begin the diagnostic process now. Run each phase systematically and present findings clearly to the user.`;

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: instructionText
        }
      }
    ];
  }
}
