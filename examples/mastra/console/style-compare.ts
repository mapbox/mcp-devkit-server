#!/usr/bin/env tsx
/**
 * Mapbox MCP DevKit Server - Style Comparison Example
 *
 * This example demonstrates how to use the style comparison tool to
 * visually compare two Mapbox styles side-by-side.
 *
 * Prerequisites:
 * - Node.js 20.6+ with ESM support
 * - Environment variables set:
 *   - MAPBOX_ACCESS_TOKEN: Your Mapbox access token (with styles:read scope)
 *   - OPENAI_API_KEY: Your OpenAI API key
 */

import { Mastra } from '@mastra/core';
import { MCPClient } from '@mastra/mcp';
import { openai } from '@mastra/core/llm';

// MCP Client configuration
const mapboxMCP = new MCPClient({
  name: 'mapbox-devkit',
  command: 'node',
  args: ['../../../dist/esm/index.js'],
  env: {
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN!,
    ENABLE_MCP_UI: 'true' // Enable MCP-UI for visual comparison
  }
});

/**
 * Create agent with DevKit capabilities
 */
async function createAgent() {
  const mastra = new Mastra({
    mcpClients: { mapboxDevkit: mapboxMCP }
  });

  const tools = await mapboxMCP.listTools();

  const agent = mastra.createAgent({
    name: 'Style Comparator',
    model: openai({ model: 'gpt-4o' }),
    tools: tools.map((tool) => ({
      id: tool.name,
      description: tool.description,
      execute: async (params: any) => {
        const result = await mapboxMCP.callTool(tool.name, params);
        return result;
      }
    }))
  });

  return { agent, mastra };
}

/**
 * Example 1: Compare Mapbox built-in styles
 */
async function compareBuiltInStyles() {
  console.log('🎨 Comparing Built-in Styles: Streets vs Satellite\n');

  const { agent, mastra } = await createAgent();

  const response = await agent.generate([
    {
      role: 'user',
      content: `Compare these two Mapbox styles side-by-side:
- Left: mapbox/streets-v12
- Right: mapbox/satellite-streets-v12

Center the view on Warsaw at coordinates [21.0122, 52.2297] with zoom level 12.

Tell me the key differences between these styles and how they show Warsaw's Old Town.`
    }
  ]);

  console.log('📝 Analysis:', response.text);
  console.log(
    "\n💡 Tip: If you're using an MCP-UI client (like Goose), you'll see an interactive side-by-side comparison!\n"
  );

  await mastra.disconnect();
}

/**
 * Example 2: Compare custom style with a base style
 */
async function compareCustomWithBase() {
  console.log('\n🎨 Comparing Custom Style with Base Style\n');

  const { agent, mastra } = await createAgent();

  const response = await agent.generate([
    {
      role: 'user',
      content: `I want to compare my custom style with the base style it was derived from.
First, list my styles and find one that looks custom.
Then compare it side-by-side with mapbox/streets-v12 at zoom 11, centered on Kraków [19.9380, 50.0614].
Tell me what customizations were made.`
    }
  ]);

  console.log('📝 Analysis:', response.text);
  await mastra.disconnect();
}

/**
 * Example 3: Compare style versions
 */
async function compareStyleVersions() {
  console.log('\n🎨 Comparing Different Versions of a Style\n');

  const { agent, mastra } = await createAgent();

  const response = await agent.generate([
    {
      role: 'user',
      content: `Help me understand the evolution of Mapbox's street styles:
Compare mapbox/streets-v11 (left) with mapbox/streets-v12 (right)
at zoom level 13, centered on Wawel Castle in Kraków [19.9353, 50.0543].

What are the major improvements in v12, especially for European historic cities?`
    }
  ]);

  console.log('📝 Analysis:', response.text);
  await mastra.disconnect();
}

/**
 * Example 4: Multi-location comparison
 */
async function compareAtDifferentLocations() {
  console.log('\n🗺️  Comparing Styles at Different Locations\n');

  const { agent, mastra } = await createAgent();

  const locations = [
    {
      name: 'Warsaw',
      name_pl: 'Warszawa',
      coords: [21.0122, 52.2297],
      zoom: 12
    },
    { name: 'Kraków', coords: [19.938, 50.0614], zoom: 13 },
    { name: 'Gdańsk', coords: [18.6466, 54.352], zoom: 12 }
  ];

  for (const location of locations) {
    console.log(`\n📍 Comparing at ${location.name}...\n`);

    const response = await agent.generate([
      {
        role: 'user',
        content: `Compare mapbox/light-v11 and mapbox/dark-v11 at ${location.name}, Poland.
Use coordinates [${location.coords}] with zoom ${location.zoom}.
How do these styles handle the architecture and layout of ${location.name}?`
      }
    ]);

    console.log(`📝 ${location.name} Analysis:`, response.text);
  }

  await mastra.disconnect();
}

/**
 * Example 5: Compare with specific overlay
 */
async function compareWithOverlay() {
  console.log('\n\n🎯 Comparing Styles with Custom Overlay\n');

  const { agent, mastra } = await createAgent();

  // GeoJSON overlay for comparison - Kraków Old Town restaurants
  const restaurantData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Wierzynek',
          name_pl: 'Wierzynek',
          rating: 4.6,
          cuisine: 'Polish'
        },
        geometry: { type: 'Point', coordinates: [19.937, 50.0619] }
      },
      {
        type: 'Feature',
        properties: {
          name: 'Pod Aniołami',
          name_pl: 'Pod Aniołami',
          rating: 4.7,
          cuisine: 'Medieval Polish'
        },
        geometry: { type: 'Point', coordinates: [19.9345, 50.0616] }
      },
      {
        type: 'Feature',
        properties: { name: 'Starka', rating: 4.5, cuisine: 'Modern Polish' },
        geometry: { type: 'Point', coordinates: [19.9395, 50.0625] }
      }
    ]
  };

  const response = await agent.generate([
    {
      role: 'user',
      content: `I'm building a restaurant finder app for Kraków's Old Town and need to choose between:
- mapbox/light-v11 (left)
- mapbox/streets-v12 (right)

Compare them at Rynek Główny (Main Market Square) [19.9370, 50.0619], zoom 15.

Here's sample restaurant data for historic Kraków restaurants:
${JSON.stringify(restaurantData, null, 2)}

Which style would work better for highlighting restaurant locations in a historic city center? Consider the medieval architecture and cobblestone streets.`
    }
  ]);

  console.log('📝 Recommendation:', response.text);
  await mastra.disconnect();
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('\n🚀 Mapbox MCP DevKit - Style Comparison Examples\n');
    console.log('='.repeat(60));

    // Check environment variables
    if (!process.env.MAPBOX_ACCESS_TOKEN) {
      throw new Error('MAPBOX_ACCESS_TOKEN environment variable is required');
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    // Run examples
    await compareBuiltInStyles();
    await compareCustomWithBase();
    await compareStyleVersions();
    await compareAtDifferentLocations();
    await compareWithOverlay();

    console.log('\n\n✅ All comparison examples completed!\n');
    console.log('💡 Pro tip: Run these examples in an MCP-UI enabled client');
    console.log(
      '   (like Goose) to see the visual side-by-side comparisons!\n'
    );
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
