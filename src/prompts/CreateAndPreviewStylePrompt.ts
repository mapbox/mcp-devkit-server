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
 * 3. Build the style specification (style_builder_tool, defaulting to the Standard base style)
 * 4. Create the map style (create_style_tool)
 * 5. Generate a preview link using the public token
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
        'Optional base style to start from. Defaults to "standard" (Mapbox\'s modern default). Only use a Classic style (e.g., "streets-v12", "outdoors-v12", "light-v11", "dark-v11") if explicitly requested.',
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

3. **Build the map style**
   - Use the style_builder_tool to generate the style specification
   - style_name: "${styleName}"
   - base_style: "${baseStyle}"`;

    if (styleDescription) {
      instructionText += `\n   - Interpret this description into appropriate \`layers\`/\`global_settings\` entries: "${styleDescription}". If there's nothing specific to customize, pass an empty \`layers\` array to use ${baseStyle} as-is.`;
    } else {
      instructionText += `\n   - No specific customizations requested — pass an empty \`layers\` array to use ${baseStyle} as-is.`;
    }

    instructionText += `\n   - The tool returns a complete Mapbox GL JS style specification

4. **Create the map style**
   - Use the create_style_tool to save the generated style to the Mapbox account
   - Style name: "${styleName}"
   - Include the complete style specification from step 3
   - Save the style ID from the response

5. **Generate preview link**
   - Use the preview_style_tool with the style ID you just created`;

    if (previewLocation) {
      instructionText += `\n   - Center the map on: ${previewLocation}`;
    }

    instructionText += `\n   - Set zoom level to: ${previewZoom}
   - The tool will automatically use the public token you created/found earlier

6. **Validate the style**
   - Automatically run validation using the prepare-style-for-production prompt
   - Pass the style ID from step 4 as the style_id_or_json parameter
   - This checks:
     * Expression syntax and correctness
     * Color contrast for accessibility (WCAG AA)
     * Style optimization opportunities
   - Validation is fast (offline processing only)

7. **Present complete results**
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
