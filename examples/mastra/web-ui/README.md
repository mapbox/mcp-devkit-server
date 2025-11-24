# Mastra Web UI - Interactive Chat with MCP-UI Maps

A Next.js web application demonstrating real-time chat with interactive map visualizations using Mastra, the Mapbox MCP DevKit Server, and MCP-UI.

## Features

- 🗨️ **Interactive Chat Interface** - Natural language conversations with AI
- 💡 **Sample Prompts** - Click to try pre-built examples for common tasks
- 🗺️ **Embedded Map Visualizations** - MCP-UI iframes display maps directly in chat
- 🎨 **Style Management** - Create, compare, and modify Mapbox styles
- 📍 **GeoJSON Preview** - Visualize spatial data on interactive maps
- ⚡ **Real-time Updates** - Instant responses with streaming support
- 🌓 **Dark Mode Support** - Automatic light/dark theme switching

## What Gets Displayed

When you interact with Mapbox tools, the chat displays:

- **Style Comparisons** - Side-by-side iframe comparison of two map styles
- **GeoJSON Previews** - Interactive maps showing your spatial data
- **Style Previews** - Visual representations of custom styles
- **Static Maps** - Map images for quick reference

All visualizations are embedded directly in the chat using MCP-UI's iframe protocol.

## Prerequisites

- **Node.js 18+** - Required for Next.js
- **npm 8+** - For package installation
- **Mapbox Access Token** - Get from https://account.mapbox.com/access-tokens/
  - Required scopes: `styles:read`, `styles:write`, `styles:tiles`, `styles:list`
- **Anthropic API Key** - Get from https://console.anthropic.com/settings/keys

**Note**: This example uses:

- Mastra 1.0 beta (follows the same pattern as the [public MCP server](https://github.com/mapbox/mcp-server))
- Claude 3.5 Sonnet (better support for complex tool schemas than OpenAI)

Required versions:

- `@mastra/core@^1.0.0-beta.2`
- `@mastra/mcp@^1.0.0-beta.1`
- `@anthropic-ai/sdk@^0.32.0`

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your tokens:

```bash
MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Getting Started

When you first open the app, you'll see **sample prompts** organized by category:

- **Style Creation** - Create custom map styles for different use cases
- **Style Comparison** - Compare Mapbox built-in styles side-by-side
- **GeoJSON & Maps** - Visualize spatial data and create maps
- **Utilities** - Get bounding boxes, convert coordinates, create tokens

Click any prompt to automatically run it, or type your own question!

## Usage Examples

### Create a Custom Style

```
User: Create a dark mode map style optimized for a running app
```

The AI will:

1. Use the `create_style_tool` to create a new style
2. Automatically use the `preview_style_tool` to generate a visual preview
3. Display both the style details and an embedded map preview in chat

### Compare Styles

```
User: Compare mapbox/light-v11 and mapbox/dark-v11 styles in San Francisco
```

The AI will:

1. Use the `style_comparison_tool`
2. Embed an iframe showing both styles side-by-side
3. Explain the differences

### Visualize GeoJSON

```
User: Show me a map with these restaurant locations:
{
  "type": "FeatureCollection",
  "features": [...]
}
```

The AI will:

1. Use the `geojson_preview_tool`
2. Display an interactive map with your data
3. Provide insights about the spatial distribution

### List Your Styles

```
User: What map styles do I have?
```

The AI will:

1. Use the `list_styles_tool`
2. Show a formatted list of your styles
3. Offer to preview or modify them

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts       # Chat API endpoint
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   └── globals.css            # Global styles
├── components/
│   ├── Chat.tsx               # Main chat component
│   ├── ChatMessage.tsx        # Message display
│   ├── ChatInput.tsx          # Input field
│   ├── SamplePrompts.tsx      # Clickable sample prompts
│   └── MCPResource.tsx        # MCP-UI resource renderer
└── lib/
    └── mastra.ts              # Mastra configuration
```

## How It Works

This example uses the same architecture as the public MCP server:

### 1. MCP Client Connects to DevKit Server

```typescript
const mcpClient = new MCPClient({
  servers: {
    mapbox: {
      command: 'node',
      args: ['../../../dist/esm/index.js'],
      env: { MAPBOX_ACCESS_TOKEN, ENABLE_MCP_UI: 'true' }
    }
  }
});
```

### 2. Mastra Agent Gets MCP Tools

```typescript
const tools = await mcpClient.listTools();

const agent = new Agent({
  name: 'Mapbox DevKit Assistant',
  instructions: '...',
  model: 'openai/gpt-4o',
  tools: tools // MCP tools passed to agent
});
```

### 3. Agent Handles Chat & Tool Calls

```typescript
const response = await agent.generate(userMessage, {
  conversationHistory: previousMessages
});
// Agent automatically decides when to use tools
```

### 4. MCP-UI Resources Rendered as Iframes

When tools return UI resources:

```json
{
  "type": "resource",
  "resource": {
    "uri": "ui://style-comparison/abc123",
    "mimeType": "text/html"
  }
}
```

The `MCPResource` component renders them as iframes:

```tsx
<iframe src={resource.uri} />
```

## Available Tools

The Mastra agent has access to these Mapbox DevKit tools:

### Style Management

- `list_styles_tool` - List all your styles
- `create_style_tool` - Create new styles
- `retrieve_style_tool` - Get style details
- `update_style_tool` - Modify existing styles
- `delete_style_tool` - Remove styles
- `style_comparison_tool` - Compare two styles (MCP-UI)
- `preview_style_tool` - Preview a style (MCP-UI)

### GeoJSON & Visualization

- `geojson_preview_tool` - Visualize GeoJSON data (MCP-UI)

### Utilities

- `create_token_tool` - Generate access tokens
- `bounding_box_tool` - Get location bounding boxes
- `coordinate_conversion_tool` - Convert coordinates

## Customization

### Change the AI Model

This example uses Claude 3.5 Sonnet by default. To change models, edit `src/lib/mastra.ts`:

```typescript
model: 'anthropic/claude-3-5-sonnet-20241022', // Current default (Oct 2024)

// Other Claude 3.5 Sonnet versions:
// 'anthropic/claude-3-5-sonnet-20240620'  // June 2024
// 'anthropic/claude-3-7-sonnet-20250219'  // Feb 2025
// 'anthropic/claude-3-7-sonnet-latest'    // Latest 3.7

// Other Claude models:
// 'anthropic/claude-3-5-haiku-20241022'   // Fast, cost-effective
// 'anthropic/claude-3-opus-20240229'      // Most capable

// Or switch to OpenAI (but may have tool schema limitations):
// 'openai/gpt-4o'
// 'openai/gpt-4-turbo'
```

See [Mastra's Anthropic models page](https://mastra.ai/models/providers/anthropic) for all available models.

**Why Claude?** Claude's function calling has better support for complex JSON schemas, including the `mapbox_style_builder_tool` which OpenAI's API rejects.

### Customize the System Prompt

Modify the instructions in `src/lib/mastra.ts`:

```typescript
return new Agent({
  name: 'Mapbox DevKit Assistant',
  instructions: `You are a specialized map design assistant...`,
  model: 'anthropic/claude-3-5-sonnet-20241022',
  tools: tools
});
```

### Add More MCP Servers

Add additional MCP servers in `src/lib/mastra.ts`:

```typescript
export const mcpClient = new MCPClient({
  id: 'multi-mcp-client',
  servers: {
    mapbox: {
      command: 'node',
      args: ['../../../dist/esm/index.js'],
      env: {
        /* ... */
      }
    },
    myCustomServer: {
      command: 'npx',
      args: ['-y', 'my-custom-mcp-server'],
      env: {
        /* ... */
      }
    }
  }
});
```

### Style the UI

- Edit `src/app/globals.css` for global styles
- Modify `tailwind.config.ts` for theme customization
- Update components for different layouts

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import to Vercel: https://vercel.com/new
3. Add environment variables in Vercel dashboard:
   - `MAPBOX_ACCESS_TOKEN`
   - `ANTHROPIC_API_KEY`
4. Deploy

### Self-Hosted

```bash
npm run build
npm start
```

Set environment variables before starting:

```bash
export MAPBOX_ACCESS_TOKEN="pk...."
export ANTHROPIC_API_KEY="sk-ant-...."
npm start
```

## Troubleshooting

### "No matching version found for @mastra/core"

The Mastra packages are in beta. Make sure you have the correct versions:

```bash
npm install @mastra/core@1.0.0-beta.2 @mastra/mcp@1.0.0-beta.1
```

If issues persist, clear npm cache:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "MAPBOX_ACCESS_TOKEN is required"

Make sure your `.env.local` file exists and contains a valid Mapbox token.

### "Failed to connect to MCP server"

Check that `@mapbox/mcp-devkit-server` is accessible:

```bash
npx @mapbox/mcp-devkit-server --version
```

### Maps Not Displaying

1. Check browser console for errors
2. Verify CSP settings allow iframes
3. Ensure ENABLE_MCP_UI=true in MCP config
4. Check that UI resources are being returned by tools

### API Route Errors

Enable verbose error logging in `src/app/api/chat/route.ts`:

```typescript
catch (error: any) {
  console.error('Detailed error:', error);
  // ... error handling
}
```

## Development Tips

### Hot Reload

Next.js automatically reloads when you edit files. Changes to:

- Components → Instant reload
- API routes → Server restart required
- Configuration → Server restart required

### Debug Mode

Add console logs in `src/app/api/chat/route.ts` to see:

- Tool calls
- LLM responses
- Resource parsing

### Testing Tools Directly

Test MCP tools without the UI:

```bash
cd ../console
npm start
```

## Performance Considerations

- **Streaming Responses**: Consider implementing streaming for faster perceived performance
- **Image Optimization**: Next.js automatically optimizes images
- **Bundle Size**: Current setup is ~500KB gzipped (excluding dependencies)
- **MCP Connection**: Each chat request creates a new MCP connection (consider connection pooling for production)

## Security Notes

- **API Keys**: Never commit `.env.local` to version control
- **Iframe Sandboxing**: Iframes use `sandbox` attribute for security
- **CORS**: Mapbox API domains are allowed in `next.config.js`
- **User Input**: Messages are passed to LLM - consider rate limiting in production

## Browser Compatibility

Tested and working on:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires:

- JavaScript enabled
- Iframe support
- WebGL support (for interactive maps)

## Related Examples

- [Console Examples](../console/) - CLI-based Mastra examples
- [Pydantic AI Examples](../../pydantic-ai/) - Python type-safe agents
- [CrewAI Examples](../../crewai/) - Multi-agent collaboration
- [LangGraph Examples](../../langgraph/) - Stateful workflows

## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [MCP-UI Specification](https://mcpui.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [Mapbox Styles API](https://docs.mapbox.com/api/maps/styles/)

## Contributing

Found a bug or want to improve this example?

- Open an issue: https://github.com/mapbox/mcp-devkit-server/issues
- Submit a PR: https://github.com/mapbox/mcp-devkit-server/pulls

## License

This example follows the same license as the Mapbox MCP DevKit Server.
