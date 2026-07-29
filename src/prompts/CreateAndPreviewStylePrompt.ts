// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt, type PromptArgument } from './BasePrompt.js';

/**
 * Prompt for creating a new map style and immediately generating a shareable preview link
 *
 * This prompt orchestrates multiple tools to:
 * 1. Check for an existing public token with styles:read scope
 * 2. Create a new public token if needed
 * 3. Create the map style
 * 4. Generate a preview link using the public token
 */
export class CreateAndPreviewStylePrompt extends BasePrompt {
  readonly name = 'create-and-preview-style';
  readonly description =
    'Create a new Mapbox map style and generate a shareable preview link. Automatically handles token management by checking for or creating a public token with the required scopes.';

  readonly arguments: ReadonlyArray<PromptArgument> = [
    {
      name: 'style_name',
      description: 'Name for the new map style',
      required: true
    },
    {
      name: 'style_description',
      description: 'Optional description of the style theme or purpose',
      required: false
    },
    {
      name: 'base_style',
      description:
        'Optional base style to start from. Defaults to "standard" (Mapbox Standard), the right choice for almost every new style. Pass a Classic style ("streets-v12", "outdoors-v12", "light-v11", "dark-v11") only when the user explicitly asks for one. For a dark map, keep "standard" and set lightPreset to "night" instead of passing "dark-v11".',
      required: false
    },
    {
      name: 'preview_location',
      description:
        'Optional location to center the preview map (e.g., "San Francisco" or "-122.4,37.8")',
      required: false
    },
    {
      name: 'preview_zoom',
      description: 'Optional zoom level for the preview (0-22, default: 12)',
      required: false
    }
  ];

  getMessages(args: Record<string, string>): PromptMessage[] {
    const styleName = args['style_name'];
    const styleDescription = args['style_description'];
    const baseStyle = args['base_style'] || 'standard';
    const previewLocation = args['preview_location'];
    const previewZoom = args['preview_zoom'] || '12';

    let instructionText = `Create a new Mapbox map style named "${styleName}" and generate a shareable preview link.

Follow these steps carefully:

1. **Check for existing public token**
   - Use the list_tokens_tool with usage="pk" to list all public tokens
   - Look for a token that has the "styles:read" scope
   - If you find one, note its token value for later use

2. **Create public token if needed**
   - If no public token with "styles:read" scope exists, create one using create_token_tool
   - Use these parameters:
     * note: "Public token for style previews"
     * scopes: ["styles:read"]
   - Save the token value from the response

3. **Create the map style**
   - Use the create_style_tool to create the new style
   - Style name: "${styleName}"`;

    if (styleDescription) {
      instructionText += `\n   - Description: "${styleDescription}"`;
    }

    instructionText += `\n   - Base the style on Mapbox ${baseStyle}
   - Build the style JSON with \`style_builder_tool\` (base_style: "${baseStyle}") rather than
     hand-authoring it.`;

    // The two targets are configured through different surfaces, so guidance for one is at best
    // noise on the other: slots and lightPreset do nothing on Classic, and a hand-authored
    // background layer sits on top of the basemap on Standard.
    if (baseStyle === 'standard') {
      instructionText += ` Don't hand-write a \`background\` layer and a raw streets-v8
     source — on Standard the basemap arrives through the import, and a hand-rolled background
     sits on top of it.
   - Reach for appearance changes in this order:
     1. \`standard_config\` (theme, lightPreset, show/hide toggles, color overrides)
     2. custom layers in an explicit \`slot\`, only for data the basemap doesn't already carry
   - A Standard style starts out as an import, not a layer list:
     \`\`\`json
     {
       "version": 8,
       "name": "${styleName}",
       "imports": [
         {
           "id": "basemap",
           "url": "mapbox://styles/mapbox/standard",
           "config": { "theme": "default", "lightPreset": "day" }
         }
       ],
       "sources": {},
       "layers": []
     }
     \`\`\`
   - For a dark map, set \`config.lightPreset\` to \`"night"\`. Don't switch to \`dark-v11\` or
     hand-author dark colors — the preset relights the whole basemap coherently.
   - Every custom layer needs an explicit \`slot\`, and fill/line/circle layers need
     emissive strength \`1\`, or they go nearly invisible under the dusk/night presets.
   - To hide something the basemap draws, use the \`standard_config\` \`show*\` toggle. Leaving
     the layer out of your own \`layers\` array hides nothing — the import still draws it.`;
    } else {
      instructionText += `
   - This is a **Classic** style, so the Standard advice does not apply here. \`slot\` is
     rejected, there is no \`imports\` array and no \`lightPreset\`: a Classic style is a layer
     stack you order yourself over a \`background\` layer.
   - \`base_style: "${baseStyle}"\` is not a style import and does **not** reproduce that style —
     the builder authors the stack, and the base name only decides light vs dark and whether
     satellite imagery goes underneath. **Every feature you want drawn must be listed in
     \`layers\`**; ask for water, landuse, roads, buildings and labels explicitly or the map will be
     nearly empty. If the user wanted the real \`${baseStyle}\`, reference
     \`mapbox://styles/mapbox/${baseStyle}\` in their map directly instead of building a new style.
   - Appearance is set through \`global_settings\` (\`background_color\`, \`label_color\`, \`mode\`),
     not \`standard_config\`, which is rejected on Classic.
   - Layer order is the order of the \`layers\` array: polygons first, then lines, then labels.
   - Consider whether Standard would serve better before continuing. Standard is configured rather
     than authored, needs no per-feature layer list, and gets basemap updates for free — for a dark
     map in particular, \`base_style: "standard"\` with \`lightPreset: "night"\` is less work and
     more coherent than a hand-authored Classic stack.`;
    }

    instructionText += `
   - Save the style ID from the response

4. **Generate preview link**
   - Use the preview_style_tool with the style ID you just created`;

    if (previewLocation) {
      instructionText += `\n   - Center the map on: ${previewLocation}`;
    }

    instructionText += `\n   - Set zoom level to: ${previewZoom}
   - The tool will automatically use the public token you created/found earlier

5. **Validate the style**
   - Automatically run validation using the prepare-style-for-production prompt
   - Pass the style ID from step 3 as the style_id_or_json parameter
   - This checks:
     * Expression syntax and correctness
     * Color contrast for accessibility (WCAG AA)
     * Style optimization opportunities
   - Validation is fast (offline processing only)

6. **Present complete results**
   - Show the user:
     * The created style ID
     * The preview URL (they can click to open in browser)
     * Validation results summary:
       - ✅ Issues found or "Style is production-ready"
       - Expression validation status
       - Accessibility compliance (WCAG AA)
       - Optimization recommendations
     * Instructions to share or embed the preview
   - Note: Validation warnings can be ignored for quick prototypes

**Important notes:**
- The preview_style_tool will automatically fetch and use an available public token
- Make sure the style is created successfully before generating the preview
- Validation runs automatically to catch issues early (offline, fast)
- If any step fails, provide clear error messages and suggest fixes
- For quick prototypes, validation warnings can be addressed later`;

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
