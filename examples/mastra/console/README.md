# Mastra Console Examples - Mapbox MCP DevKit

TypeScript console examples demonstrating how to use [Mastra](https://mastra.ai) with the Mapbox MCP DevKit Server for style creation, comparison, and management.

## Prerequisites

- Node.js 20.6+ (with ESM support)
- Mapbox access token with required scopes
- OpenAI API key (or other LLM provider)

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set environment variables**:

   ```bash
   export MAPBOX_ACCESS_TOKEN="your_mapbox_token"
   export OPENAI_API_KEY="your_openai_key"
   ```

3. **Build the DevKit server** (if using local build):
   ```bash
   cd ../../../
   npm run build
   ```

## Examples

### Basic Examples (`index.ts`)

Demonstrates core DevKit capabilities:

```bash
npm start
```

**What it does**:

- Lists your existing map styles
- Creates a custom "Warsaw night mode" style with Polish heritage colors
- Previews GeoJSON data on a map centered on Warsaw
- Creates a public access token with URL restrictions
- Gets bounding boxes for Poland and other countries

**Example output**:

```
🚀 Mapbox MCP DevKit - Mastra Console Examples

🎨 Example 1: List My Styles
==================================================
📦 Loaded 25 Mapbox DevKit tools

📝 Response: You have 5 map styles:
1. my-custom-streets (modified 2 days ago)
2. dark-theme-v2 (modified 1 week ago)
...
```

### Style Comparison (`style-compare.ts`)

Demonstrates visual style comparison with MCP-UI:

```bash
npm run compare
```

**What it does**:

- Compares Mapbox built-in styles (Streets vs Satellite) in Warsaw
- Compares custom styles with base styles around Polish landmarks
- Compares different style versions (v11 vs v12) at Kraków's Wawel Castle
- Compares styles at different Polish locations (Warsaw, Kraków, Gdańsk)
- Evaluates styles for specific use cases (e.g., Polish restaurant finder)

**Example output**:

```
🎨 Comparing Built-in Styles: Streets vs Satellite

📝 Analysis: The main differences between these styles:
- Streets-v12 emphasizes road networks and labels
- Satellite-streets overlays street data on satellite imagery
- Streets is better for navigation, Satellite for geographic context
...

💡 Tip: If you're using an MCP-UI client (like Goose),
   you'll see an interactive side-by-side comparison!
```

## Available DevKit Tools

The examples demonstrate these key tools:

| Tool                         | Purpose              | Example Use                            |
| ---------------------------- | -------------------- | -------------------------------------- |
| `list_styles_tool`           | List all your styles | "Show me my map styles"                |
| `create_style_tool`          | Create a new style   | "Create a dark mode style"             |
| `retrieve_style_tool`        | Get style details    | "Show me the JSON for my style"        |
| `style_comparison_tool`      | Compare two styles   | "Compare Streets with my custom style" |
| `geojson_preview_tool`       | Preview GeoJSON      | "Show this GeoJSON on a map"           |
| `create_token_tool`          | Create access tokens | "Create a public token for my site"    |
| `list_tokens_tool`           | List your tokens     | "Show me all my tokens"                |
| `bounding_box_tool`          | Get country bounds   | "What's the bbox for Poland?"          |
| `coordinate_conversion_tool` | Convert coordinates  | "Convert lat/lng to tile coords"       |

## Customization

### Using Different LLM Providers

The examples use OpenAI by default, but Mastra supports 40+ providers:

```typescript
import { anthropic } from '@mastra/core/llm';

const agent = mastra.createAgent({
  name: 'Style Designer',
  model: anthropic({ model: 'claude-3-5-sonnet-20241022' })
  // ...
});
```

### Using Published Package

Instead of the local build, use the published package:

```typescript
const mapboxMCP = new MCPClient({
  name: 'mapbox-devkit',
  command: 'npx',
  args: ['-y', '@mapbox/mcp-devkit-server'],
  env: {
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN!
  }
});
```

### Custom Prompts

Modify the agent prompts to suit your needs:

```typescript
const response = await agent.generate([
  {
    role: 'user',
    content: 'Your custom prompt here'
  }
]);
```

## MCP-UI Support

These examples support MCP-UI for rich, visual outputs. When using an MCP-UI enabled client (like [Goose](https://block.github.io/goose/)):

- **Style comparisons** show side-by-side iframe views
- **GeoJSON previews** display interactive maps
- **Style previews** show embeddable style viewers

To enable MCP-UI:

```typescript
const mapboxMCP = new MCPClient({
  // ...
  env: {
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN!,
    ENABLE_MCP_UI: 'true' // Enable MCP-UI
  }
});
```

## Troubleshooting

### "MAPBOX_ACCESS_TOKEN is required"

Make sure you've set the environment variable:

```bash
export MAPBOX_ACCESS_TOKEN="your_token_here"
```

### "Token lacks required scopes"

Your token needs these scopes:

- `styles:read`
- `styles:write`
- `styles:tiles`
- `styles:list`
- `tokens:read`
- `tokens:write`

Create a new token at https://account.mapbox.com/access-tokens/

### "Cannot find module '@mastra/core'"

Install dependencies:

```bash
npm install
```

## Next Steps

- Explore the [Web UI example](../web-ui/) for a chat interface with map previews
- Try the [Pydantic AI examples](../../pydantic-ai/) for Python-based workflows
- Read the [DevKit documentation](../../../README.md) for all available tools
- Check out [MCP-UI documentation](https://mcpui.dev) for interactive features

## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Mapbox Styles API](https://docs.mapbox.com/api/maps/styles/)
- [MCP Protocol Spec](https://spec.modelcontextprotocol.io/)
- [DevKit Server GitHub](https://github.com/mapbox/mcp-devkit-server)
