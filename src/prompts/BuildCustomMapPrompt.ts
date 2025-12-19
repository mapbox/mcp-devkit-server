// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt, type PromptArgument } from './BasePrompt.js';

/**
 * Prompt for using conversational AI to build a custom styled map
 *
 * This prompt leverages the style_builder_tool to create themed map styles through
 * natural language descriptions, then creates the style and generates a preview.
 */
export class BuildCustomMapPrompt extends BasePrompt {
  readonly name = 'build-custom-map';
  readonly description =
    'Use conversational AI to build a custom styled map based on a theme description. Supports themes like "dark cyberpunk", "nature-focused", "minimal monochrome" and can emphasize specific features.';

  readonly arguments: ReadonlyArray<PromptArgument> = [
    {
      name: 'theme',
      description:
        'Theme description for the map (e.g., "dark cyberpunk", "nature-focused", "minimal monochrome", "retro 80s neon")',
      required: true
    },
    {
      name: 'emphasis',
      description:
        'Optional features to emphasize (e.g., "parks and green spaces", "transit lines", "water bodies", "roads and highways")',
      required: false
    },
    {
      name: 'preview_location',
      description:
        'Optional location to center the preview map (e.g., "New York City", "Tokyo", or coordinates "-122.4,37.8")',
      required: false
    },
    {
      name: 'preview_zoom',
      description: 'Optional zoom level for the preview (0-22, default: 12)',
      required: false
    }
  ];

  getMessages(args: Record<string, string>): PromptMessage[] {
    const theme = args['theme'];
    const emphasis = args['emphasis'];
    const previewLocation = args['preview_location'];
    const previewZoom = args['preview_zoom'] || '12';

    let stylePrompt = `Create a custom map with a ${theme} theme`;
    if (emphasis) {
      stylePrompt += `, emphasizing ${emphasis}`;
    }
    stylePrompt += '.';

    let instructionText = `Build a custom Mapbox map style with the theme: "${theme}"

Follow these steps to create and preview the styled map:

1. **Use the Style Builder**
   - Use the style_builder_tool to create the themed map style
   - Provide this prompt: "${stylePrompt}"
   - The Style Builder will use AI to interpret your theme and create appropriate:
     * Color schemes matching the theme
     * Layer visibility and styling
     * Typography and symbols
     * Overall aesthetic

2. **Review the generated style**
   - The style_builder_tool will return a complete Mapbox GL JS style specification
   - Review the style to ensure it matches the intended theme
   - Note any specific customizations made (colors, layers emphasized, etc.)

3. **Create the style**
   - Use create_style_tool to save the generated style to your Mapbox account
   - Provide a descriptive name like "Custom ${theme} Map"
   - Include the complete style specification from step 1
   - Save the style ID from the response

4. **Generate preview link**
   - Use preview_style_tool with the newly created style ID`;

    if (previewLocation) {
      instructionText += `\n   - Center the preview on: ${previewLocation}`;
    } else {
      instructionText += `\n   - Use an appropriate location that showcases the theme well`;
    }

    instructionText += `\n   - Set zoom level to: ${previewZoom}
   - The preview will use an existing public token automatically

5. **Present results**
   - Show the user:
     * A summary of the theme and customizations applied
     * The style ID for future reference
     * The preview URL to view the map
     * Suggestions for further customization if desired

**Theme interpretation tips:**
- "Dark cyberpunk": Dark backgrounds, neon colors (cyan, magenta, purple), high contrast
- "Nature-focused": Earth tones, emphasize parks/forests/water, soften urban features
- "Minimal monochrome": Grayscale palette, simplified geometry, clean lines
- "Retro 80s neon": Bright colors, high saturation, bold typography`;

    if (emphasis) {
      instructionText += `\n- Custom emphasis on "${emphasis}": Ensure these features are visually prominent`;
    }

    instructionText += `\n\n**Important notes:**
- The style_builder_tool is powered by AI and may need refinement
- You can iterate on the style by making additional calls to style_builder_tool
- If the initial result doesn't match expectations, try refining the theme description
- Consider the map's use case when choosing zoom levels and preview locations`;

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
