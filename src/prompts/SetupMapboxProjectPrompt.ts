// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt, type PromptArgument } from './BasePrompt.js';

/**
 * Prompt for setting up a new Mapbox project from scratch
 *
 * This prompt orchestrates multiple tools to:
 * 1. Create production and development tokens with appropriate scopes
 * 2. Set up URL restrictions for security
 * 3. Create an initial map style
 * 4. Generate preview and test the integration
 * 5. Provide implementation guidance
 */
export class SetupMapboxProjectPrompt extends BasePrompt {
  readonly name = 'setup-mapbox-project';
  readonly description =
    'Complete setup workflow for a new Mapbox project. Creates tokens with proper security settings, initializes a map style, and provides integration guidance.';

  readonly arguments: ReadonlyArray<PromptArgument> = [
    {
      name: 'project_name',
      description: 'Name of the project or application',
      required: true
    },
    {
      name: 'project_type',
      description:
        'Type of project: "web", "mobile", "backend", or "fullstack" (default: "web")',
      required: false
    },
    {
      name: 'production_domain',
      description:
        'Production domain for URL restrictions (e.g., "myapp.com"). Required for web/fullstack projects.',
      required: false
    },
    {
      name: 'style_theme',
      description:
        'Initial style theme: "light", "dark", "streets", "outdoors", "satellite" (default: "light"). These are looks, not base styles — all but "satellite" are configurations of Mapbox Standard.',
      required: false
    }
  ];

  getMessages(args: Record<string, string>): PromptMessage[] {
    const projectName = args['project_name'];
    const projectType = args['project_type'] || 'web';
    const productionDomain = args['production_domain'];
    const styleTheme = args['style_theme'] || 'light';

    let instructionText = `Set up a complete Mapbox project for "${projectName}" (${projectType} application).

Follow these steps carefully to ensure secure and proper configuration:

## Step 1: Create Development Token

Create a public token for local development:
- Use create_token_tool with these parameters:
  * note: "${projectName} - Development"
  * scopes: ["styles:read", "fonts:read"]
  * allowedUrls: ["http://localhost:*", "http://127.0.0.1:*"]
- Save the token value and note the token ID

`;

    if (projectType === 'web' || projectType === 'fullstack') {
      if (productionDomain) {
        instructionText += `## Step 2: Create Production Token

Create a public token for production with URL restrictions:
- Use create_token_tool with these parameters:
  * note: "${projectName} - Production"
  * scopes: ["styles:read", "fonts:read"]
  * allowedUrls: ["https://${productionDomain}/*", "https://www.${productionDomain}/*"]
- Save the token value and note the token ID

`;
      } else {
        instructionText += `## Step 2: Create Production Token

⚠️ Production domain not provided. Create a public token without URL restrictions (less secure):
- Use create_token_tool with these parameters:
  * note: "${projectName} - Production (No URL Restrictions)"
  * scopes: ["styles:read", "fonts:read"]
- **IMPORTANT**: Add URL restrictions later using update_token_tool once the domain is known
- Save the token value and note the token ID

`;
      }
    } else if (projectType === 'mobile') {
      instructionText += `## Step 2: Create Mobile Token

Create a public token for mobile app:
- Use create_token_tool with these parameters:
  * note: "${projectName} - Mobile"
  * scopes: ["styles:read", "fonts:read", "vision:read"]
- **Note**: Mobile apps can't use URL restrictions, so monitor usage carefully
- Save the token value and note the token ID

`;
    }

    if (projectType === 'backend' || projectType === 'fullstack') {
      instructionText += `## Step 3: Create Secret Token for Backend

Create a secret token for server-side operations:
- Use create_token_tool with these parameters:
  * note: "${projectName} - Backend (SECRET)"
  * scopes: ["styles:read", "styles:write", "styles:list"]
- ⚠️ **CRITICAL**: This is a SECRET token - never expose in client code
- Store in environment variables or secret manager
- Save the token value and note the token ID

`;
    }

    const stepNumber = projectType === 'backend' ? 4 : 3;
    // "light", "dark" and the rest read like Classic style names, and treating them that way is
    // how a project starts life on dark-v11 when it wanted Standard at lightPreset "night".
    const themeRecipes: Record<string, string> = {
      light:
        'base_style: "standard", standard_config: { lightPreset: "day" } — the default look',
      dark: 'base_style: "standard", standard_config: { lightPreset: "night" }. **Not `dark-v11`**: the preset relights the whole scene, and the app can switch it at runtime without reloading the style',
      streets:
        'base_style: "standard", standard_config: { theme: "default", showRoadLabels: true } — Standard already is a streets map',
      outdoors:
        'base_style: "standard", standard_config: { theme: "default", showPedestrianRoads: true }, plus terrain in the app if the project needs it',
      satellite:
        'base_style: "satellite-streets-v12" — the one theme that is genuinely a different base rather than a configuration, because style_builder_tool cannot add a raster imagery source to a Standard style (custom_sources takes GeoJSON and vector tilesets only). It is a Classic base, so you author every vector layer you want over the imagery. If the project wants imagery under an otherwise-Standard map, reference mapbox://styles/mapbox/standard-satellite in the app instead of building a style here'
    };
    const themeRecipe =
      themeRecipes[styleTheme] ??
      `base_style: "standard", with standard_config chosen to match "${styleTheme}"`;

    instructionText += `## Step ${stepNumber}: Create Initial Map Style

Create a starter map style for the project:
- Use style_builder_tool with structured parameters (it takes \`base_style\`, \`layers\` and a config
  object — not a free-text description):
  * For a "${styleTheme}" look: ${themeRecipe}
  * \`base_style: "standard"\` is the right default. A "${styleTheme}" theme is a *configuration* of
    Mapbox Standard, not a different base style — reach for \`standard_config\` first and add custom
    \`layers\` only for data Standard doesn't carry
  * Any custom layer needs an explicit \`slot\`, and fill/line/circle layers need emissive strength
    \`1\` so they stay visible if the app ever switches to the dusk or night preset
- Then use create_style_tool with:
  * name: "${projectName} - ${styleTheme.charAt(0).toUpperCase() + styleTheme.slice(1)}"
  * Use the style JSON generated by style_builder_tool
- Save the style ID from the response

`;

    const nextStep = stepNumber + 1;
    instructionText += `## Step ${nextStep}: Generate Preview

Create a shareable preview of the map:
- Use preview_style_tool with the style ID you just created
- Use zoom level 12 and let it pick a nice default location
- The preview will automatically use your public token
- Save the preview URL

## Step ${nextStep + 1}: Provide Integration Instructions

Present the user with a complete setup summary:

\`\`\`
🎉 Mapbox Project Setup Complete!

Project: ${projectName}
Type: ${projectType}

📋 Tokens Created:
`;

    if (projectType === 'web' || projectType === 'fullstack') {
      instructionText += `- Development Token: [show token] (localhost only)
- Production Token: [show token] ${productionDomain ? `(${productionDomain} only)` : '(⚠️ no URL restrictions)'}
`;
    }

    if (projectType === 'mobile') {
      instructionText += `- Mobile Token: [show token]
`;
    }

    if (projectType === 'backend' || projectType === 'fullstack') {
      instructionText += `- Backend Secret Token: [show token] ⚠️ KEEP SECRET
`;
    }

    instructionText += `
🗺️ Map Style:
- Style ID: [show style ID]
- Theme: ${styleTheme}
- Preview: [show preview URL]

📦 Next Steps:
`;

    if (projectType === 'web' || projectType === 'fullstack') {
      instructionText += `
1. Install Mapbox GL JS:
   npm install mapbox-gl

2. Add to your HTML:
   <script src='https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.js'></script>
   <link href='https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css' rel='stylesheet' />

3. Initialize the map:
   mapboxgl.accessToken = 'YOUR_TOKEN_HERE'; // Use dev token for localhost, prod token for production
   const map = new mapboxgl.Map({
     container: 'map',
     style: 'mapbox://styles/YOUR_USERNAME/YOUR_STYLE_ID',
     center: [-74.5, 40],
     zoom: 9
   });
`;
    }

    if (projectType === 'mobile') {
      instructionText += `
1. Install Mapbox Maps SDK for your platform:
   - iOS: https://docs.mapbox.com/ios/maps/guides/install/
   - Android: https://docs.mapbox.com/android/maps/guides/install/

2. Configure your token in the app
3. Load the style using your style ID
`;
    }

    if (projectType === 'backend') {
      instructionText += `
1. Store your secret token in environment variables:
   export MAPBOX_ACCESS_TOKEN='YOUR_SECRET_TOKEN'

2. Use the Mapbox APIs for server-side operations:
   - Styles API: https://docs.mapbox.com/api/maps/styles/
   - Static Images: https://docs.mapbox.com/api/maps/static-images/
`;
    }

    instructionText += `
🔒 Security Reminders:
- ✅ Public tokens (pk.*) are safe in client code with URL restrictions
- ❌ NEVER expose secret tokens (sk.*) in client code or version control
- 🔄 Rotate tokens every 90 days for production
- 📊 Monitor token usage in your Mapbox dashboard
\`\`\`

**Important Security Notes:**
`;

    if (
      !productionDomain &&
      (projectType === 'web' || projectType === 'fullstack')
    ) {
      instructionText += `
⚠️ Your production token has NO URL RESTRICTIONS. To secure it:
1. Use list_tokens_tool to find the production token ID
2. Use update_token_tool to add allowedUrls once your domain is ready
`;
    }

    if (projectType === 'backend' || projectType === 'fullstack') {
      instructionText += `
⚠️ Your secret token has full API access. To protect it:
1. Store in environment variables (.env file)
2. Add .env to .gitignore
3. Use a secret manager (AWS Secrets Manager, HashiCorp Vault) for production
4. Never commit tokens to version control
`;
    }

    instructionText += `

📋 **Validate the Style**

Automatically validate the created style:
- Use the prepare-style-for-production prompt with the style ID created above
- This checks:
  * Expression syntax and correctness
  * Color contrast for accessibility (WCAG AA)
  * Style optimization opportunities
- Validation is fast (offline processing only)
- Include validation results in the final summary

🎉 **Setup Complete!**

Present the complete setup summary:
- All tokens created with proper security restrictions
- Map style created and validated
- Preview URL for testing
- Validation results (any issues or "✅ Production-ready")
- Next steps for integration

The user can now start building their map application with confidence that their setup follows best practices.`;

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
