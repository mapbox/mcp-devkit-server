#!/usr/bin/env node --env-file=.env
/**
 * Mapbox MCP DevKit Server - Mastra Console Examples
 *
 * This example demonstrates how to use Mastra agents with the Mapbox DevKit
 * to create, modify, and preview map styles.
 *
 * Prerequisites:
 * - Node.js 20.6+ with ESM support
 * - Create a .env file with:
 *   MAPBOX_ACCESS_TOKEN=your_token_here
 *   ANTHROPIC_API_KEY=your_api_key_here
 *
 * Run with:
 *   node --env-file=.env examples/mastra/console/index.ts
 */

import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';

// MCP Client configuration for Mapbox DevKit
// Option 1: Local build (development)
const mcpClient = new MCPClient({
  id: 'mapbox-mcp-client',
  servers: {
    mapbox: {
      command: 'node',
      args: ['../../../dist/esm/index.js'],
      env: {
        MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || '',
        ENABLE_MCP_UI: 'true'
      }
    }
  }
});

// Option 2: Published npm package (uncomment to use)
// const mcpClient = new MCPClient({
//   id: 'mapbox-mcp-client',
//   servers: {
//     mapbox: {
//       command: 'npx',
//       args: ['-y', '@mapbox/mcp-devkit-server'],
//       env: {
//         MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || '',
//         ENABLE_MCP_UI: 'true'
//       }
//     }
//   }
// });

/**
 * Create a Mastra agent with Mapbox DevKit capabilities
 */
async function createMapboxAgent() {
  // List all available tools from the DevKit
  const tools = await mcpClient.listTools();
  const toolCount = Object.keys(tools).length;

  console.log(`\n📦 Loaded ${toolCount} Mapbox DevKit tools\n`);

  const agent = new Agent({
    name: 'Mapbox Style Designer',
    instructions: `You are a helpful assistant with access to Mapbox DevKit tools.

    You can help users:
    - Create and manage custom map styles
    - Compare different map styles side-by-side
    - Preview and analyze GeoJSON data on maps
    - Generate access tokens with specific permissions
    - Get bounding boxes for countries and locations
    - Convert between coordinate systems

    When creating styles, ALWAYS include "version": 8 in the style object.
    After creating a style, create a public token and preview the style.
    Be friendly, informative, and use tools to provide accurate responses.`,
    model: 'anthropic/claude-3-5-haiku-20241022',
    tools: tools
  });

  return agent;
}

/**
 * Example 1: List existing styles
 */
async function listStyles() {
  console.log('🎨 Example 1: List My Styles');
  console.log('='.repeat(50));

  const agent = await createMapboxAgent();

  const response = await agent.generate(
    'List all my map styles and tell me what types of styles I have.'
  );

  console.log('\n📝 Response:', response.text);
}

/**
 * Example 2: Create a new custom style
 */
async function createCustomStyle() {
  console.log('\n\n🎨 Example 2: Create Custom Style');
  console.log('='.repeat(50));

  const agent = await createMapboxAgent();

  const response =
    await agent.generate(`Create a new map style called "warsaw-night-mode" that:
- Uses a dark color scheme suitable for nighttime exploring
- Highlights historic landmarks and monuments in amber (Polish heritage color)
- Shows the Vistula River in a deep blue
- Has high contrast for viewing Warsaw's architecture
- Is based on Mapbox Streets v12

After creating it, give me the style ID.`);

  console.log('\n📝 Response:', response.text);
}

/**
 * Example 3: Preview a style with GeoJSON overlay
 */
async function previewStyleWithGeoJSON() {
  console.log('\n\n🗺️  Example 3: Preview Style with GeoJSON');
  console.log('='.repeat(50));

  const agent = await createMapboxAgent();

  const geoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Palace of Culture and Science',
          name_pl: 'Pałac Kultury i Nauki',
          type: 'landmark'
        },
        geometry: {
          type: 'Point',
          coordinates: [21.0061, 52.2319]
        }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Royal Castle',
          name_pl: 'Zamek Królewski',
          type: 'historic'
        },
        geometry: {
          type: 'Point',
          coordinates: [21.0137, 52.248]
        }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Łazienki Park',
          type: 'park'
        },
        geometry: {
          type: 'Point',
          coordinates: [21.0356, 52.2156]
        }
      }
    ]
  };

  const response =
    await agent.generate(`I have some GeoJSON data for Warsaw landmarks:
${JSON.stringify(geoJSON, null, 2)}

Show me this data on a map and tell me what you see.`);

  console.log('\n📝 Response:', response.text);
}

/**
 * Example 4: Create a public token for a specific style
 */
async function createPublicToken() {
  console.log('\n\n🔑 Example 4: Create Public Token');
  console.log('='.repeat(50));

  const agent = await createMapboxAgent();

  const response =
    await agent.generate(`Create a public access token for my Warsaw tourism website with these properties:
- Name: "Warsaw Tourism Portal Token"
- Scopes: styles:read and styles:tiles
- URL restrictions: https://visitwarsaw.pl and https://*.visitwarsaw.pl
- Explain what this token can and cannot do.`);

  console.log('\n📝 Response:', response.text);
}

/**
 * Example 5: Get bounding box for a country
 */
async function getCountryBounds() {
  console.log('\n\n🌍 Example 5: Country Bounding Box');
  console.log('='.repeat(50));

  const agent = await createMapboxAgent();

  const response = await agent.generate(
    'What is the bounding box for Poland? Give me the coordinates and explain how to use them.'
  );

  console.log('\n📝 Response:', response.text);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('\n🚀 Mapbox MCP DevKit - Mastra Console Examples\n');

    // Check required environment variables
    if (!process.env.MAPBOX_ACCESS_TOKEN) {
      throw new Error('MAPBOX_ACCESS_TOKEN environment variable is required');
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    // Run examples
    await listStyles();
    await createCustomStyle();
    await previewStyleWithGeoJSON();
    await createPublicToken();
    await getCountryBounds();

    console.log('\n\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
