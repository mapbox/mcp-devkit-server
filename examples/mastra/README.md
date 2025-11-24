# Mastra Examples - Mapbox MCP DevKit

TypeScript examples demonstrating how to integrate [Mastra](https://mastra.ai) with the Mapbox MCP DevKit Server.

## What is Mastra?

Mastra is a TypeScript framework for building production-ready AI agents with:

- Native MCP (Model Context Protocol) support
- Support for 40+ LLM providers (OpenAI, Anthropic, etc.)
- Type-safe tool calling
- Enterprise-grade features

**Best for**: TypeScript/Node.js developers building production applications.

## Examples

### [Console Examples](./console/)

Command-line examples demonstrating:

- Style creation and management
- Style comparison
- GeoJSON visualization
- Token management
- DevKit tool capabilities

**Run it**:

```bash
cd console
npm install
npm start
```

### [Web UI](./web-ui/)

Next.js web application with chat interface and map previews (Coming Soon).

## Quick Start

1. **Install Node.js 20.6+**

2. **Get your Mapbox token**: https://account.mapbox.com/access-tokens/
   - Required scopes: `styles:read`, `styles:write`, `styles:tiles`, `styles:list`, `tokens:read`, `tokens:write`

3. **Get an LLM API key**: OpenAI, Anthropic, or other Mastra-supported provider

4. **Set environment variables**:

   ```bash
   export MAPBOX_ACCESS_TOKEN="your_mapbox_token"
   export OPENAI_API_KEY="your_openai_key"
   ```

5. **Run an example**:
   ```bash
   cd console
   npm install
   npm start
   ```

## Key Features

### MCP Integration

Mastra's native MCP support makes it easy to integrate DevKit tools:

```typescript
import { Mastra } from '@mastra/core';
import { MCPClient } from '@mastra/mcp';

const mapboxMCP = new MCPClient({
  name: 'mapbox-devkit',
  command: 'npx',
  args: ['-y', '@mapbox/mcp-devkit-server'],
  env: {
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN!
  }
});

const mastra = new Mastra({
  mcpClients: { mapboxDevkit: mapboxMCP }
});
```

### Type Safety

Mastra provides TypeScript types for all interactions:

```typescript
const tools = await mapboxMCP.listTools();
const result = await mapboxMCP.callTool('list_styles_tool', {});
```

### Multi-Provider Support

Easy to switch between LLM providers:

```typescript
import { openai, anthropic } from '@mastra/core/llm';

// Use OpenAI
const agent = mastra.createAgent({
  model: openai({ model: 'gpt-4o' })
});

// Or Anthropic
const agent = mastra.createAgent({
  model: anthropic({ model: 'claude-3-5-sonnet-20241022' })
});
```

## Use Cases

### Style Designer Agent

Create an agent that helps design custom map styles:

```typescript
const response = await agent.generate([
  {
    role: 'user',
    content:
      'Create a Warsaw night mode style with amber-colored landmarks representing Polish heritage'
  }
]);
```

### Style Comparator

Compare different styles to make informed decisions:

```typescript
const response = await agent.generate([
  {
    role: 'user',
    content:
      "Compare mapbox/light-v11 and mapbox/dark-v11 styles in Warsaw's Old Town"
  }
]);
```

### GeoJSON Analyst

Analyze and visualize spatial data:

```typescript
const response = await agent.generate([
  {
    role: 'user',
    content: `Show this GeoJSON data on a map: ${JSON.stringify(data)}`
  }
]);
```

## DevKit Tools Available

The Mapbox DevKit provides 25+ tools for map development:

**Style Management**:

- `list_styles_tool` - List your styles
- `create_style_tool` - Create new styles
- `retrieve_style_tool` - Get style details
- `update_style_tool` - Modify styles
- `delete_style_tool` - Remove styles
- `preview_style_tool` - Preview with public token
- `style_comparison_tool` - Compare styles side-by-side

**GeoJSON**:

- `geojson_preview_tool` - Visualize GeoJSON data

**Tokens**:

- `create_token_tool` - Create access tokens
- `list_tokens_tool` - List your tokens

**Utilities**:

- `bounding_box_tool` - Get bounding boxes
- `coordinate_conversion_tool` - Convert coordinates
- `tilequery_tool` - Query map tiles
- And more...

## Advantages of Mastra

**vs Raw MCP**:

- Higher-level abstractions
- Built-in agent capabilities
- Multi-provider support
- TypeScript types throughout

**vs LangChain**:

- Simpler API
- Better TypeScript support
- Native MCP integration
- Lighter weight

**vs CrewAI**:

- TypeScript instead of Python
- Better for Node.js/Next.js apps
- Type safety

## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [MCP Protocol](https://spec.modelcontextprotocol.io/)
- [Mapbox DevKit Docs](../../README.md)

## Next Steps

1. Try the [console examples](./console/)
2. Build your own agent for a specific use case
3. Integrate into a Next.js app (see [web-ui](./web-ui/))
4. Explore other frameworks ([Pydantic AI](../pydantic-ai/), etc.)
