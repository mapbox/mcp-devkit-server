// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt, type PromptArgument } from './BasePrompt.js';

/**
 * Prompt for preparing a Mapbox style for production deployment
 *
 * This prompt orchestrates multiple quality validation tools to:
 * 1. Validate all expressions in the style
 * 2. Validate GeoJSON sources (if any)
 * 3. Check color contrast for text layers
 * 4. Optimize the style
 * 5. Generate a comprehensive quality report
 */
export class PrepareStyleForProductionPrompt extends BasePrompt {
  readonly name = 'prepare-style-for-production';
  readonly description =
    'Comprehensive quality validation workflow for Mapbox styles before production deployment. Validates expressions, checks accessibility compliance, optimizes performance, and generates a deployment-ready quality report.';

  readonly arguments: ReadonlyArray<PromptArgument> = [
    {
      name: 'style_id_or_json',
      description:
        'Either a Mapbox style ID (e.g., "username/style-id") or a complete style JSON string',
      required: true
    },
    {
      name: 'skip_optimization',
      description: 'Set to "true" to skip style optimization (default: false)',
      required: false
    },
    {
      name: 'wcag_level',
      description:
        'WCAG compliance level to check: "AA" or "AAA" (default: AA)',
      required: false
    }
  ];

  getMessages(args: Record<string, string>): PromptMessage[] {
    const styleInput = args['style_id_or_json'];
    const skipOptimization = args['skip_optimization'] === 'true';
    const wcagLevel = args['wcag_level'] || 'AA';

    const instructionText = `Prepare a Mapbox style for production deployment by running comprehensive quality checks.

**Style to validate:** ${styleInput}

Follow this quality validation workflow carefully:

## Step 1: Load the Style

${
  styleInput.includes('{')
    ? '- The style appears to be JSON, parse it directly'
    : '- Use retrieve_style_tool to fetch the style from Mapbox\n- Save the complete style JSON for validation'
}

## Step 2: Validate All Expressions

Mapbox styles use expressions in multiple places. Check each one:

1. **Validate filter expressions:**
   - Iterate through all layers in the style
   - For each layer with a "filter" property, use validate_expression_tool
   - Parameters: { expression: <filter>, context: "filter" }
   - Track any validation errors

2. **Validate paint property expressions:**
   - For each layer, check all paint properties
   - Identify properties with expression values (arrays starting with an operator)
   - Validate each expression: { expression: <value>, context: "paint" }
   - Track any validation errors

3. **Validate layout property expressions:**
   - For each layer, check all layout properties
   - Identify properties with expression values
   - Validate each expression: { expression: <value>, context: "layout" }
   - Track any validation errors

**Report expression validation results:**
- Total expressions validated
- Number of valid expressions
- Number of invalid expressions with details
- Any type mismatches or operator errors

## Step 3: Validate GeoJSON Sources (if any)

Check for GeoJSON data sources:

1. **Identify GeoJSON sources:**
   - Look through style.sources
   - Find any sources with type: "geojson"

2. **Validate each GeoJSON source:**
   - If source has inline "data" property, validate it
   - Use validate_geojson_tool with the GeoJSON data
   - If source uses "url", note that it should be validated when loaded
   - Track validation results

**Report GeoJSON validation results:**
- Number of GeoJSON sources found
- Validation status for each source
- Any coordinate or structure errors

## Step 4: Check Color Contrast for Text Layers

Ensure text is readable (WCAG ${wcagLevel} compliance):

1. **Identify text layers:**
   - Find all layers with type: "symbol"
   - Check if they have text-field in layout properties

2. **Extract colors for each text layer:**
   - Foreground: Get "text-color" from paint properties (default: #000000)
   - Background: Get "text-halo-color" if present, otherwise note background is map tiles
   - Handle expression-based colors (evaluate or use typical values)

3. **Check contrast for each text layer:**
   - Use check_color_contrast_tool
   - Parameters: {
       foregroundColor: <text-color>,
       backgroundColor: <halo-color or typical tile color>,
       level: "${wcagLevel}",
       fontSize: "normal" or "large" based on text-size
     }
   - Note: If no halo color, check against the actual basemap the text sits on:
     * For a style importing Standard, the background depends on \`config.lightPreset\`: check against
       a light surface (#f0f0f0) for \`day\`/\`dawn\`, a dark one (#333333) for \`night\`/\`dusk\`. Check the
       one preset the style ships; if the app switches presets at runtime the text must pass against
       **both** — a color tuned only for \`day\` will fail at \`night\`.
     * For a Classic style, check against its \`background\` layer color.

**Report accessibility results:**
- Total text layers checked
- Layers that pass WCAG ${wcagLevel}
- Layers that fail with specific issues
- Recommendations for failing layers
- Which light preset(s) the check was performed against

## Step 5: Check Standard Style Layer Placement and Lighting

Skip this step if the style has no \`imports\` array — slots and emissive strength only apply to
styles built on Mapbox Standard. Where it does import Standard, these checks catch failures that
expression validation and contrast checking cannot see: the style is valid JSON and still renders
wrongly.

1. **Every custom layer needs an explicit \`slot\`:**
   - List every layer in the style's own \`layers\` array (not the imported basemap's layers)
   - Flag any layer with no \`slot\`. This is a defect, not a preference: it draws above **every**
     basemap layer including street labels, so data covers the labels that make the map readable
   - Check the slot is plausible for what the layer is:
     * \`bottom\` — choropleths, rasters, terrain (below roads)
     * \`middle\` — data overlays, zone fills, heatmaps, routes, custom POI layers
     * \`top\` — markers, active selections
   - A large \`fill\` layer in \`top\` is a likely mistake: it will cover the POI labels

2. **Fill, line and circle layers need emissive strength:**
   - For each custom \`fill\`, \`line\` or \`circle\` layer, check for
     \`fill-emissive-strength\` / \`line-emissive-strength\` / \`circle-emissive-strength\`
   - Flag any missing or \`0\`. They default to \`0\`, letting the scene light the layer, so it falls
     into shadow and goes nearly invisible under the \`dusk\` and \`night\` presets
   - The most common way a map that looked correct in review ships broken: it's invisible only at
     certain times of day, so day-time testing never catches it
   - Do **not** flag: \`symbol\` layers (icon/text emissive strength already default to \`1\`),
     \`fill-extrusion\` (real 3D, should be lit by the scene), or \`heatmap\` (no such property)

3. **Routes need occlusion opacity:**
   - For \`line\` layers representing a route or path, check for \`line-occlusion-opacity\`
   - Its default of \`0\` completely hides the part of the line behind 3D buildings

4. **Verify at the dark preset:**
   - If \`preview_style_tool\` is available, preview with \`lightPreset\` set to \`night\`
   - Confirm custom data layers are visible and legible, not just present in the JSON

**Report layer placement results:**
- Custom layers checked
- Layers missing \`slot\` (with the slot each one should have)
- Layers missing emissive strength
- Any layer whose slot looks wrong for its type

${
  !skipOptimization
    ? `## Step 6: Optimize the Style

Run optimization to improve performance and reduce file size:

1. **Run optimize_style_tool:**
   - Input the complete style JSON
   - Let it run all default optimizations
   - Save the optimized style

2. **Review optimization results:**
   - Note size reduction percentage
   - List specific optimizations applied
   - Verify no functionality was lost

**Report optimization results:**
- Original size vs optimized size
- Percentage reduction
- Optimizations applied (unused sources, duplicate layers, etc.)
- Recommendation to use optimized version`
    : '## Step 6: Style Optimization\n\nSkipped per user request.'
}

## Final Step: Generate Quality Report

Create a comprehensive deployment checklist:

\`\`\`markdown
# Production Quality Report

## Style Information
- Style: ${styleInput}
- Validation Date: <current date>
- WCAG Level: ${wcagLevel}

## Expression Validation
✓/✗ All expressions valid
- Total expressions: <count>
- Valid: <count>
- Invalid: <count>
<List any errors>

## GeoJSON Validation
✓/✗ All GeoJSON sources valid
- Sources checked: <count>
- Valid: <count>
- Invalid: <count>
<List any errors>

## Accessibility (WCAG ${wcagLevel})
✓/✗ All text layers meet contrast requirements
- Text layers: <count>
- Passing: <count>
- Failing: <count>
- Checked against light preset(s): <presets>
<List failing layers with recommendations>

## Standard Layer Placement and Lighting
<Omit this section entirely if the style does not import Standard>
✓/✗ All custom layers have an explicit slot
- Custom layers: <count>
- Missing slot: <count>
✓/✗ All fill/line/circle layers set emissive strength
- Missing emissive strength: <count>
<List each affected layer, the property it needs, and why>

${
  !skipOptimization
    ? `## Optimization
✓ Style optimized
- Size reduction: <percentage>
- Optimizations: <list>
`
    : ''
}

## Deployment Readiness
<Overall assessment: READY / NEEDS FIXES>

## Action Items
<List any required fixes before deployment>
\`\`\`

## Important Notes

- **Expression validation** catches runtime errors before deployment
- **GeoJSON validation** ensures data integrity
- **Color contrast** ensures readability for all users
- **Optimization** improves load times and performance
- **Fix all validation errors** before deploying to production
- **Test the ${!skipOptimization ? 'optimized' : 'validated'} style** in a staging environment
- **Document any changes** made during this process

## If Issues Are Found

For each type of issue, provide specific guidance:

**Expression errors:**
- Show the invalid expression and error message
- Suggest corrected version if possible
- Link to Mapbox expression documentation

**GeoJSON errors:**
- Identify the specific coordinate or structure problem
- Suggest fix (e.g., close polygon rings, fix coordinate order)
- Offer to fix automatically if appropriate

**Contrast failures:**
- Show current ratio vs required ratio
- Suggest color adjustments to meet WCAG ${wcagLevel}
- Offer to calculate suitable colors if requested

**After all fixes:**
- Re-run validation to confirm issues resolved
- Generate updated quality report
- Provide final deployment-ready style

Execute these steps systematically and provide clear, actionable feedback at each stage.`;

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
