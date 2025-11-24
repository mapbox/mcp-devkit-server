// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  PromptMessage,
  PromptArgument
} from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt } from './BasePrompt.js';

/**
 * Prompt that guides users through creating a custom map style for a specific use case
 */
export class CreateStylePrompt extends BasePrompt {
  readonly name = 'create-style-for-usecase';
  readonly title = 'Create Style for Use Case';
  readonly description =
    'Guide for creating a custom Mapbox map style optimized for a specific application use case';

  readonly arguments: readonly PromptArgument[] = [
    {
      name: 'useCase',
      description:
        'The application use case (e.g., "food delivery app", "running tracker", "real estate listings", "tourism guide")',
      required: true
    },
    {
      name: 'colorScheme',
      description:
        'Preferred color scheme: "light", "dark", or describe a custom scheme',
      required: false
    },
    {
      name: 'location',
      description:
        'Target location or region (e.g., "Warsaw", "New York", "global")',
      required: false
    }
  ] as const;

  protected generateMessages(args?: Record<string, string>): PromptMessage[] {
    const useCase = args?.useCase || 'general purpose application';
    const colorScheme = args?.colorScheme || 'appropriate for the use case';
    const location = args?.location
      ? ` in ${args.location}`
      : ' for your target audience';

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a custom Mapbox map style optimized for a ${useCase}${location}.

## Requirements

**Use Case**: ${useCase}
**Color Scheme**: ${colorScheme}
**Target Location**: ${location.replace(' in ', '')}

## Implementation Steps

1. **Design the Style**:
   - Use the \`create_style_tool\` to create a new style
   - Base it on an appropriate Mapbox template (e.g., mapbox/streets-v12, mapbox/light-v11, mapbox/dark-v11)
   - Ensure the style object includes:
     * \`"version": 8\` as the first property
     * A descriptive \`name\` field
     * Appropriate \`sources\` and \`layers\` for the use case

2. **Optimize for the Use Case**:
   - For **food/restaurant apps**: Emphasize POIs, restaurants, cafes, clear labels
   - For **fitness/running apps**: Highlight parks, trails, terrain, clear paths
   - For **real estate apps**: Focus on neighborhoods, transportation, amenities
   - For **tourism apps**: Showcase landmarks, attractions, cultural sites
   - For **delivery/logistics**: Prioritize clear streets, addresses, routing

3. **Apply Color Scheme**:
   - Use ${colorScheme} colors throughout
   - Ensure good contrast and readability
   - Consider time-of-day usage patterns

4. **Create a Preview Token**:
   - After creating the style, use \`create_token_tool\` to generate a temporary public token
   - Scopes needed: \`["styles:read", "styles:tiles"]\`
   - Set \`public: true\`
   - Add a note like "Temporary preview token for [style-name]"

5. **Preview the Style**:
   - Use \`preview_style_tool\` with the new token to generate a preview
   - Center on ${location.replace(' in ', '') || 'an appropriate location'}
   - Use zoom level appropriate for the use case (typically 12-15 for urban, 8-10 for regional)

6. **Provide Integration Instructions**:
   - Give the user the style ID in the format: \`username/style-id\`
   - Provide Mapbox GL JS code snippet for integration
   - Explain how to use the style in their application

## Best Practices

- Always include \`"version": 8\` in the style specification
- Use descriptive layer names that indicate their purpose
- Test the style at multiple zoom levels
- Consider accessibility (color contrast, label readability)
- Document any custom features or layers

Please proceed with creating this style now, following all the steps above.`
        }
      }
    ];
  }
}
