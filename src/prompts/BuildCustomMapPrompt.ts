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
   - Use the style_builder_tool to create the themed map style, expressing "${stylePrompt}"
   - The tool takes structured input, not a description: \`base_style\`, a \`layers\` array, and the
     config surface for whichever base you choose. Translate the theme into those parameters.
   - **Keep \`base_style: "standard"\`.** Most of a theme is expressible through
     \`standard_config\` alone, which is cheaper than authoring layers and survives basemap updates:
     * \`theme\`: \`"faded"\` or \`"monochrome"\` — most of the way to any muted or minimal look
     * \`lightPreset\`: \`"day"\`/\`"dawn"\`/\`"dusk"\`/\`"night"\` — **this is how a theme goes dark.**
       Never switch to \`dark-v11\` or hand-author dark colors; the preset relights the whole scene
     * \`color*\` overrides: \`colorWater\`, \`colorGreenspace\`, \`colorRoads\`, \`colorPlaceLabels\`
       and the rest — this is how a theme gets its palette onto the basemap
     * \`show*\` toggles: turn off what the theme doesn't want. On Standard this is the *only* way
       to hide a basemap feature — omitting a layer hides nothing, because the import still draws it
   - Add custom \`layers\` only for what the config cannot reach. Each one needs an explicit
     \`slot\`, and fill/line/circle layers need emissive strength \`1\` or they vanish at
     \`dusk\`/\`night\`. The tool sets emissive strength for you and reports the slot it inferred.
   - Only use a Classic base (\`streets-v12\`, \`dark-v11\`, …) if the user explicitly asks for a
     classic style. There you author every layer yourself: no \`slot\`, no \`lightPreset\`, no
     config surface — appearance comes from \`global_settings\` and the order of \`layers\`.

2. **Review the generated style**
   - The style_builder_tool will return a complete Mapbox GL JS style specification
   - Review the style to ensure it matches the intended theme
   - Note any specific customizations made (colors, layers emphasized, etc.)
   - Read the tool's auto-corrections: they name the slot it inferred, and the config property to
     use when you asked for a layer that only overdraws the basemap

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

5. **Validate the style**
   - Automatically run validation using the prepare-style-for-production prompt
   - Pass the style ID from step 3 as the style_id_or_json parameter
   - This checks:
     * Expression syntax (especially important for AI-generated styles)
     * Color contrast for accessibility (WCAG AA)
     * Style optimization opportunities
   - Validation is fast (offline processing only)

6. **Present complete results**
   - Show the user:
     * A summary of the theme and customizations applied
     * The style ID for future reference
     * The preview URL to view the map
     * Validation results summary:
       - ✅ Issues found or "Style is production-ready"
       - Expression validation status (critical for generated styles)
       - Accessibility compliance (WCAG AA)
       - Optimization recommendations
     * Suggestions for further customization if desired
   - Note: Validation warnings can be ignored for experimental maps

**Theme interpretation tips** (each one starts as \`standard_config\`, not as layers):
- "Dark cyberpunk": \`lightPreset: "night"\` for the dark scene, then neon \`colorRoads\` /
  \`colorPlaceLabels\` (cyan, magenta, purple) for the high-contrast accents
- "Nature-focused": \`colorGreenspace\` and \`colorWater\` in earth tones, and
  \`showPointOfInterestLabels: false\` to soften the urban clutter
- "Minimal monochrome": \`theme: "monochrome"\` does most of it; add \`showTransitLabels: false\`
  and \`show3dObjects: false\` for the clean-lines part
- "Retro 80s neon": \`lightPreset: "dusk"\` with saturated \`color*\` overrides — and if you add
  custom glow layers, they need emissive strength \`1\` or the dusk scene swallows them`;

    if (emphasis) {
      instructionText += `\n- Custom emphasis on "${emphasis}": Ensure these features are visually prominent`;
    }

    instructionText += `\n\n**Important notes:**
- Translating a theme into style parameters is a judgement call and may need refinement
- Validation runs automatically to catch any issues in generated expressions
- You can iterate on the style by making additional calls to style_builder_tool
- If the initial result doesn't match expectations, adjust the config properties before reaching
  for more layers — a theme that needs many custom layers usually needs a different \`theme\` or
  \`lightPreset\` instead
- **Preview a dark or dusk theme at its own light preset.** A missing emissive strength looks
  correct by day and invisible at night, so a day-time review never catches it
- Consider the map's use case when choosing zoom levels and preview locations
- For experimental maps, validation warnings can be addressed later`;

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
