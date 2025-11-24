import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';

// Create MCP Client with Mapbox DevKit server
export const mcpClient = new MCPClient({
  id: 'mapbox-mcp-client',
  servers: {
    mapbox: {
      // Use local build from repository root
      command: 'node',
      args: ['../../../dist/esm/index.js'],
      env: {
        MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || '',
        ENABLE_MCP_UI: 'true'
      }
    }
  }
});

// Create the agent with MCP tools
export async function createMapboxAgent() {
  const allTools = await mcpClient.listTools();

  // Filter out mapbox_style_builder_tool - it causes retry loops with complex schema
  // Try both possible naming conventions
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mapbox_mapbox_style_builder_tool,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mapbox_style_builder_tool,
    ...tools
  } = allTools;

  return new Agent({
    name: 'Mapbox DevKit Assistant',
    instructions: `You are a helpful assistant with access to Mapbox DevKit tools.

    You can help users:
    - Create and manage custom map styles using Mapbox templates
    - Compare different map styles side-by-side
    - Preview and analyze GeoJSON data on maps
    - Generate access tokens with specific permissions
    - Get bounding boxes for countries and locations
    - Convert between coordinate systems

    When users ask about maps, styles, or geospatial data:
    - Use the available tools to provide accurate, visual responses
    - **For creating styles**: Use create_style_tool. The tool expects TWO parameters:
      1. "name": A descriptive name string
      2. "style": A complete Mapbox Style Specification object

      CRITICAL: The style object MUST have "version": 8 as the FIRST property. Example:

      create_style_tool({
        "name": "My Dark Style",
        "style": {
          "version": 8,
          "name": "My Dark Style",
          "sources": {"mapbox": {"type": "vector", "url": "mapbox://mapbox.mapbox-streets-v8"}},
          "layers": [{"id": "background", "type": "background", "paint": {"background-color": "#111"}}]
        }
      })

      Without "version": 8 at the top of the style object, the API will reject it.
    - **IMPORTANT**: After creating a style, follow these steps IN ORDER:
      1. Create a temporary public token using create_token_tool with scopes: ["styles:read", "styles:tiles"], public: true, note: "Temporary token for style preview"
      2. Use preview_style_tool with the newly created token to show an interactive map preview
      3. **ALWAYS provide integration information** after successfully creating a style:
         - Display the Style ID (e.g., "username/style-id")
         - Display the Style Name
         - Provide a code snippet showing how to use it in Mapbox GL JS (use the actual style ID in the code):

           new mapboxgl.Map({
             container: 'map',
             style: 'mapbox://styles/YOUR_STYLE_ID',
             center: [21.0122, 52.2297], // Warsaw coordinates
             zoom: 12
           })

         This helps users integrate the style into their applications.
    - When showing GeoJSON, use the geojson_preview_tool to visualize the data
    - Always provide clear, helpful explanations of what you're doing
    - **CRITICAL**: If ANY tool call fails, STOP immediately. Do NOT retry. Explain the error to the user.

    Be friendly, informative, and proactive in suggesting relevant tools.`,
    model: 'anthropic/claude-3-5-haiku-20241022',
    tools: tools
  });
}
