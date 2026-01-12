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
   - Note: If no halo color, check against both light (#f0f0f0) and dark (#333333) backgrounds

**Report accessibility results:**
- Total text layers checked
- Layers that pass WCAG ${wcagLevel}
- Layers that fail with specific issues
- Recommendations for failing layers

${
  !skipOptimization
    ? `## Step 5: Optimize the Style

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
    : '## Step 5: Style Optimization\n\nSkipped per user request.'
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
<List failing layers with recommendations>

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
