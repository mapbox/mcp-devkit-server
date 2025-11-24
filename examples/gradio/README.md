# Mapbox MCP DevKit - Gradio Web UI Example

This example demonstrates how to build an interactive web UI with [Gradio](https://gradio.app/) that connects to the Mapbox MCP DevKit server. The UI provides a chat interface where users can interact with an AI agent that has access to Mapbox tools for creating styles, previewing maps, and working with geospatial data.

## Features

- 🗨️ **Chat Interface** - Interactive conversation with Claude 3.5 Haiku
- 🗺️ **Live Map Previews** - View map styles and GeoJSON data in embedded iframes
- 🎨 **Style Creation** - Create custom Mapbox styles through natural language
- 📍 **GeoJSON Visualization** - Preview GeoJSON data on interactive maps
- 🔄 **Style Comparison** - Compare different map styles side-by-side
- 🔑 **Token Management** - Generate public access tokens with URL restrictions

## Prerequisites

- **Python 3.10+**
- **Node.js 22+** (to build the MCP server)
- **Mapbox Access Token** with appropriate scopes
- **Anthropic API Key** for Claude

## Setup

### 1. Build the MCP Server

From the repository root:

```bash
npm install
npm run build
```

This creates the server at `dist/esm/index.js` that the Gradio app will connect to.

### 2. Install Python Dependencies

From this directory:

```bash
cd examples/gradio
pip install -r requirements.txt
```

Or using a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in this directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here
```

#### Required Mapbox Token Scopes

Your Mapbox token needs these scopes:

- `styles:read` - Read map styles
- `styles:write` - Create/update styles
- `styles:list` - List your styles
- `tokens:write` - Create public tokens

## Running the Application

```bash
python app.py
```

The Gradio interface will open at **http://localhost:7860**

## Usage Examples

Try these prompts in the chat interface:

### Create a Custom Style

```
Create a dark mode map style optimized for a food delivery app.
Emphasize restaurants, roads, and addresses while de-emphasizing parks.
```

### Preview GeoJSON Data

```
Show me a map of San Francisco with these points of interest:
- Golden Gate Bridge
- Fisherman's Wharf
- Alcatraz Island
```

### Compare Styles

```
Compare the Mapbox Light and Dark styles side-by-side at New York City.
Tell me which one is better for outdoor activities.
```

### Generate Access Tokens

```
Create a public access token for my production website at https://myapp.com
with read-only access to styles and tiles.
```

## How It Works

### Architecture

```
User Browser (Gradio UI)
    ↓
Python App (app.py)
    ↓
Anthropic Claude API (Agent)
    ↓
MCP Client (Python SDK)
    ↓
Mapbox MCP DevKit Server (Node.js)
    ↓
Mapbox APIs
```

### Key Components

1. **Gradio Interface** (`create_ui()`)
   - Chat interface with message history
   - HTML component for rendering map iframes
   - Clean, responsive layout

2. **MCP Client** (`initialize_mcp_client()`)
   - Connects to the local MCP server via stdio
   - Lists available tools
   - Filters out problematic tools (style_builder)

3. **Agent Loop** (`chat_with_agent()`)
   - Uses Anthropic's Claude 3.5 Haiku
   - Converts MCP tools to Anthropic format
   - Executes tool calls and collects results
   - Limited to 3 iterations to prevent retry loops

4. **Resource Rendering** (`extract_ui_resources()`)
   - Extracts MCP-UI resources from tool results
   - Converts `ui://mapbox/...` URIs to actual preview URLs
   - Renders as iframes in the Gradio UI

### MCP-UI Integration

The app supports [MCP-UI](https://mcpui.dev) for rich map visualizations:

- **Style Previews** - `preview_style_tool` returns interactive map iframes
- **GeoJSON Visualization** - `geojson_preview_tool` shows data on maps
- **Style Comparison** - `style_comparison_tool` displays side-by-side views

MCP-UI resources have a special structure:

- `uri`: Protocol identifier (e.g., `ui://mapbox/preview-style/...`)
- `text`: Actual URL with access token for the iframe

The app extracts the `text` field and renders it as an iframe.

## Comparison with Other Examples

| Example     | Type    | Framework        | UI             | Best For                 |
| ----------- | ------- | ---------------- | -------------- | ------------------------ |
| **Gradio**  | Web UI  | Anthropic SDK    | Chat + Iframes | Interactive exploration  |
| Mastra      | Web UI  | Mastra + Next.js | Chat + Iframes | Production web apps      |
| Pydantic AI | Console | Pydantic AI      | Terminal       | Type-safe scripts        |
| CrewAI      | Console | CrewAI           | Terminal       | Multi-agent workflows    |
| LangGraph   | Console | LangGraph        | Terminal       | Complex state management |

## Customization

### Change the AI Model

Edit `app.py` and modify the model in `chat_with_agent()`:

```python
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",  # or other models
    ...
)
```

### Adjust Max Iterations

Change the loop limit to allow more/fewer tool calls:

```python
for iteration in range(3):  # Change this number
```

### Customize the UI Theme

Gradio supports various themes:

```python
app = gr.Blocks(theme=gr.themes.Glass())  # or Base(), Monochrome(), etc.
```

### Add More Instructions

Modify `system_prompt` in `chat_with_agent()` to add domain-specific guidance.

## Troubleshooting

### "Server not found" Error

Make sure you built the MCP server first:

```bash
cd ../..  # Go to repo root
npm run build
```

### "MCP session not initialized"

The app may take a moment to connect. Wait for the "✅ Loaded X MCP tools" message.

### Tools Not Working

Check your Mapbox token scopes. You need `styles:read`, `styles:write`, `styles:list`, and `tokens:write`.

### Preview Not Loading

The agent needs to create a **public token** before previewing styles. Make sure it follows the workflow:

1. Create style
2. Create public token with `styles:read` and `styles:tiles`
3. Preview style with the public token

## Resources

- [Gradio Documentation](https://gradio.app/docs)
- [Anthropic API Reference](https://docs.anthropic.com/)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [Mapbox Style Specification](https://docs.mapbox.com/style-spec/)
- [MCP-UI Documentation](https://mcpui.dev)

## License

MIT - See repository root LICENSE file
