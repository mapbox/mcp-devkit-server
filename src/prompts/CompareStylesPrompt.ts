// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  PromptMessage,
  PromptArgument
} from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt } from './BasePrompt.js';

/**
 * Prompt that guides users through comparing two map styles side-by-side
 */
export class CompareStylesPrompt extends BasePrompt {
  readonly name = 'compare-styles-at-location';
  readonly title = 'Compare Styles at Location';
  readonly description =
    'Compare two Mapbox map styles side-by-side at a specific location to understand their visual differences';

  readonly arguments: readonly PromptArgument[] = [
    {
      name: 'style1',
      description:
        'First style to compare (e.g., "mapbox/streets-v12", "username/my-style")',
      required: true
    },
    {
      name: 'style2',
      description:
        'Second style to compare (e.g., "mapbox/dark-v11", "username/my-custom-style")',
      required: true
    },
    {
      name: 'location',
      description:
        'Location to center the comparison (e.g., "Warsaw", "New York", "Tokyo", or coordinates like "52.2297,21.0122")',
      required: false
    },
    {
      name: 'zoom',
      description: 'Zoom level for the comparison (typically 10-15)',
      required: false
    }
  ] as const;

  protected generateMessages(args?: Record<string, string>): PromptMessage[] {
    const style1 = args?.style1 || 'mapbox/streets-v12';
    const style2 = args?.style2 || 'mapbox/dark-v11';
    const location = args?.location || 'a relevant location';
    const zoom = args?.zoom || '12';

    // Parse location to coordinates if it looks like lat,lng
    const coordMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    let locationInstruction = '';

    if (coordMatch) {
      const [, lat, lng] = coordMatch;
      locationInstruction = `at coordinates [${lng}, ${lat}] (note: longitude first, then latitude)`;
    } else {
      locationInstruction = `at ${location}. First, use the \`bounding_box_tool\` to find appropriate coordinates for this location.`;
    }

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Compare two Mapbox map styles side-by-side to understand their visual differences and determine which is better suited for your needs.

## Comparison Details

**Style 1 (Left)**: ${style1}
**Style 2 (Right)**: ${style2}
**Location**: ${location}
**Zoom Level**: ${zoom}

## Comparison Steps

1. **Get a Public Access Token**:
   - Use \`list_tokens_tool\` to find an existing public token
   - Or use \`create_token_tool\` to create a temporary one with scopes: \`["styles:read", "styles:tiles"]\`
   - Ensure \`public: true\` (secret tokens cannot be used in browser-based comparisons)

2. **Determine the Comparison Location**:
   - Target location: ${locationInstruction}
   - Recommended zoom level: ${zoom}

3. **Generate the Comparison**:
   - Use \`style_comparison_tool\` with:
     * \`before\`: ${style1}
     * \`after\`: ${style2}
     * \`accessToken\`: the public token from step 1
     * \`latitude\` and \`longitude\`: coordinates from step 2
     * \`zoom\`: ${zoom}
   - This will generate an interactive side-by-side comparison

4. **Analyze the Differences**:
   Consider and describe:
   - **Visual Style**: Color schemes, typography, iconography
   - **Feature Emphasis**: What types of features are highlighted (roads, buildings, POIs, terrain)
   - **Readability**: Label clarity, contrast, zoom-level optimization
   - **Use Cases**: Which style is better for different application types
   - **Performance**: Complexity and rendering considerations
   - **Accessibility**: Color contrast and readability for different users

5. **Provide a Recommendation**:
   - Suggest which style is better for specific use cases
   - Explain the trade-offs between the two styles
   - Mention any customizations that could improve either style

## Key Differences to Look For

- **Streets vs Dark**: Light vs dark color schemes, daytime vs nighttime use
- **Streets vs Satellite**: Vector vs raster, simplified vs photographic
- **Streets vs Outdoors**: Urban vs nature focus, trail visibility
- **Light vs Standard**: Minimalist vs detailed, background vs foreground use
- **Custom vs Base**: Specific optimizations, brand alignment, feature customization

Please proceed with the comparison now, following all the steps above and providing a detailed analysis.`
        }
      }
    ];
  }
}
