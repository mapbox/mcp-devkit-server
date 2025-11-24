# Mapbox MCP DevKit Server - Examples

This directory contains example implementations showing how to integrate the Mapbox MCP DevKit Server with popular AI agent frameworks. These examples demonstrate style creation, comparison, GeoJSON visualization, and other DevKit capabilities.

## Available Examples

### [Mastra](./mastra/) (TypeScript)

Production-ready TypeScript applications with modern tooling.

- **Best for**: Enterprise TypeScript applications, Next.js projects
- **Features**: Type safety, native MCP integration, 40+ LLM providers
- **Examples**:
  - Console demos for style creation and comparison
  - Web UI with real-time chat and map previews

### [Gradio](./gradio/) (Python)

Interactive web UI with Python using Gradio and Claude.

- **Best for**: Quick prototyping, Python developers wanting a web UI
- **Features**: Simple setup, interactive chat, embedded map previews, Anthropic SDK
- **Examples**: Web UI with chat interface and live map iframes

### [Pydantic AI](./pydantic-ai/) (Python)

Type-safe Python framework with validation and structured outputs.

- **Best for**: Python developers prioritizing type safety and validation
- **Features**: Modern Pythonic interface, structured outputs, production patterns
- **Examples**: Style builder with validation, GeoJSON analysis

### [CrewAI](./crewai/) (Python)

Multi-agent collaboration framework with role-based agents.

- **Best for**: Complex workflows requiring multiple specialized agents
- **Features**: Role-based agents, task delegation, sequential/hierarchical processes
- **Examples**: Multi-agent style design crew, GeoJSON analysis team

### [LangGraph](./langgraph/) (Python)

Stateful workflow framework with graph-based orchestration.

- **Best for**: Complex workflows with conditional routing and state management
- **Features**: State persistence, conditional routing, cyclic graphs, checkpointing
- **Examples**: Iterative style creation, conditional GeoJSON workflows

## Quick Start

All examples require:

1. **Mapbox Access Token**: Get one from https://account.mapbox.com/access-tokens/
   - Required scopes: `styles:read`, `styles:write`, `styles:tiles`, `styles:list`, `tokens:read`, `tokens:write`

2. **LLM API Key**: OpenAI, Anthropic, or other provider supported by your framework

3. **Environment Setup**:
   ```bash
   export MAPBOX_ACCESS_TOKEN="your_token_here"
   export OPENAI_API_KEY="your_api_key_here"  # or ANTHROPIC_API_KEY, etc.
   ```

## Use Cases Demonstrated

### Style Design & Management

- **Create custom map styles**: "Build a dark mode style for a running app"
- **Compare styles side-by-side**: "Compare my custom style with Mapbox Streets"
- **Modify existing styles**: "Add restaurant and cafe layers to this style"
- **Style validation**: "Check if this style JSON is valid"

### GeoJSON Visualization

- **Preview GeoJSON data**: "Show me this GeoJSON on a map"
- **Analyze spatial data**: "What's interesting about this GeoJSON dataset?"
- **Generate GeoJSON**: "Create GeoJSON for a route between Warsaw and Kraków"

### Token & Resource Management

- **Create scoped tokens**: "Create a public token for my website"
- **List and manage styles**: "Show me all my map styles"
- **Access Mapbox documentation**: "How do I use the tilequery API?"

## Framework Selection Guide

| Framework       | Language   | UI Type       | Best For                  | Complexity  | MCP-UI Support |
| --------------- | ---------- | ------------- | ------------------------- | ----------- | -------------- |
| **Mastra**      | TypeScript | Web (Next.js) | Production apps, Next.js  | Medium      | ✅ Yes         |
| **Gradio**      | Python     | Web (Gradio)  | Quick prototypes, demos   | Low         | ✅ Yes         |
| **Pydantic AI** | Python     | Console       | Type-safe Python apps     | Low-Medium  | ✅ Yes         |
| **CrewAI**      | Python     | Console       | Multi-agent collaboration | Medium-High | ✅ Yes         |
| **LangGraph**   | Python     | Console       | Stateful workflows, loops | Medium-High | ✅ Yes         |

## DevKit-Specific Features

Unlike the public MCP server (which focuses on geocoding, directions, and search), the DevKit server provides:

- **Style Creation & Editing**: Full Mapbox Studio-like capabilities via API
- **Token Management**: Create and manage access tokens programmatically
- **GeoJSON Tools**: Preview and analyze GeoJSON data with maps
- **Style Comparison**: Side-by-side visual comparison with MCP-UI
- **Mapbox Documentation**: Integrated access to API references
- **Bounding Box Tools**: Country and location bounding boxes
- **Coordinate Conversion**: Lat/lng to tile coordinates and vice versa

## Example Workflows

### 1. Style Designer Agent

```typescript
// Agent that helps design custom map styles
"Create a style for a delivery app that highlights restaurants,
uses a light color scheme, and has good contrast for daytime viewing"
```

### 2. GeoJSON Analyst

```python
# Agent that analyzes spatial data
"Here's GeoJSON data from our sensors. Show it on a map and
tell me which areas have the highest concentration of readings"
```

### 3. Style Comparator

```typescript
// Compare different style versions
'Compare my-style-v1 with my-style-v2 and show me the differences';
```

### 4. Multi-Agent Style Design (CrewAI)

```python
# Three agents collaborate: Designer, Validator, Writer
"Create a style for a running app. Have the designer create it,
the validator review it, and the writer document it."
```

### 5. Stateful GeoJSON Workflow (LangGraph)

```python
# Workflow with conditional routing based on data type
"Analyze this GeoJSON. Route to specialized analysis based on
whether it's points, lines, or polygons. Then create visualizations
and generate a report."
```

## Running Examples

Each example directory contains its own README with specific setup instructions. Generally:

**TypeScript/Mastra**:

```bash
cd examples/mastra/console
npm install
npm start
```

**Python/Gradio**:

```bash
cd examples/gradio
pip install -r requirements.txt
python app.py
```

**Python/Pydantic AI**:

```bash
cd examples/pydantic-ai
pip install -r requirements.txt
python style_builder.py
```

**Python/CrewAI**:

```bash
cd examples/crewai
pip install -r requirements.txt
python style_designer_crew.py
```

**Python/LangGraph**:

```bash
cd examples/langgraph
pip install -r requirements.txt
python style_workflow.py
```

## Additional Resources

- [DevKit Server Documentation](../README.md)
- [Tool Configuration Guide](../TOOL_CONFIGURATION.md)
- [Claude Code Integration](../docs/claude-code-integration.md)
- [MCP-UI Documentation](https://mcpui.dev)

## Contributing

Found a bug or want to add an example? Please open an issue or PR on the [GitHub repository](https://github.com/mapbox/mcp-devkit-server).
