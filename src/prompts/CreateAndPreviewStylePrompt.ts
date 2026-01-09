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
        'Optional base style to start from (e.g., "streets-v12", "outdoors-v12", "light-v11", "dark-v11")',
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
    const baseStyle = args['base_style'] || 'streets-v12';
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
   - You can start with a basic style like:
     \`\`\`json
     {
       "version": 8,
       "name": "${styleName}",
       "sources": {
         "mapbox": {
           "type": "vector",
           "url": "mapbox://mapbox.mapbox-streets-v8"
         }
       },
       "layers": [
         {
           "id": "background",
           "type": "background",
           "paint": { "background-color": "#f0f0f0" }
         }
       ]
     }
     \`\`\`
   - Save the style ID from the response

4. **Generate preview link**
   - Use the preview_style_tool with the style ID you just created`;

    if (previewLocation) {
      instructionText += `\n   - Center the map on: ${previewLocation}`;
    }

    instructionText += `\n   - Set zoom level to: ${previewZoom}
   - The tool will automatically use the public token you created/found earlier

5. **Present results**
   - Show the user:
     * The created style ID
     * The preview URL (they can click to open in browser)
     * Instructions to share or embed the preview

6. **Validate the style (recommended for production)**
   - After presenting the preview, ask the user:
     * "Would you like to validate this style for production readiness? This will check expressions, accessibility, and optimize the style."
   - If yes:
     * Use the prepare-style-for-production prompt
     * Pass the style ID from step 3 as the style_id_or_json parameter
   - If no:
     * Note: "You can validate later by running the prepare-style-for-production prompt when needed"
   - For quick prototypes or demos, validation can be skipped

**Important notes:**
- The preview_style_tool will automatically fetch and use an available public token
- Make sure the style is created successfully before generating the preview
- If any step fails, provide clear error messages and suggest fixes
- For production deployment, always validate styles to catch issues early`;

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
