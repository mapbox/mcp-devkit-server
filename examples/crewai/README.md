# CrewAI Examples - Mapbox MCP DevKit

Python examples demonstrating how to use [CrewAI](https://www.crewai.com) with the Mapbox MCP DevKit Server for multi-agent collaboration on geospatial tasks.

## What is CrewAI?

CrewAI is a Python framework for building AI agent teams that work together:

- **Role-Based Agents**: Each agent has a specific role, goal, and backstory
- **Collaborative Workflows**: Agents can delegate tasks and share context
- **Sequential or Hierarchical**: Support for different crew processes
- **Task Management**: Structured task definitions with expected outputs

**Best for**: Complex workflows requiring multiple specialized agents collaborating on a shared goal.

## Examples

### `style_designer_crew.py`

Multi-agent crew for comprehensive style design:

- **Style Designer Agent**: Creates custom Mapbox styles
- **Quality Validator Agent**: Reviews styles for best practices
- **Documentation Writer Agent**: Generates usage documentation

**Scenarios**:

1. Delivery App Style - Emphasizes navigation and addresses
2. Running App Style - Highlights trails and parks

### `geojson_analysis_crew.py`

Multi-agent crew for spatial data analysis:

- **Spatial Data Analyst**: Analyzes patterns and data quality
- **Map Visualization Expert**: Creates effective visualizations
- **Geospatial Report Writer**: Produces comprehensive reports

**Scenarios**:

1. Delivery Network Analysis - Route optimization and coverage
2. Retail Location Analysis - Store performance and expansion planning

## Setup

### 1. Install Python 3.10-3.13

Check your version:

```bash
python --version  # Should be 3.10, 3.11, 3.12, or 3.13
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Set Environment Variables

```bash
export MAPBOX_ACCESS_TOKEN="your_mapbox_token"
export OPENAI_API_KEY="your_openai_key"
```

**Mapbox Token Scopes Required**:

- `styles:read`
- `styles:write`
- `styles:tiles`
- `styles:list`
- `tokens:read`
- `tokens:write`

Get a token at: https://account.mapbox.com/access-tokens/

### 4. Run Examples

```bash
# Style designer crew
python style_designer_crew.py

# GeoJSON analysis crew
python geojson_analysis_crew.py
```

## Key Features

### Multi-Agent Collaboration

CrewAI enables agents to work together on complex tasks:

```python
crew = Crew(
    agents=[
        create_style_designer_agent(),
        create_quality_validator_agent(),
        create_documentation_writer_agent()
    ],
    tasks=[
        create_design_task(requirements),
        create_validation_task(),
        create_documentation_task()
    ],
    process=Process.sequential,  # Tasks run one after another
    verbose=True
)

result = crew.kickoff()
```

### Specialized Agent Roles

Each agent has a specific role and expertise:

```python
Agent(
    role="Mapbox Style Designer",
    goal="Create beautiful, functional map styles that meet user requirements",
    backstory="""You are an expert cartographer and designer with years of
    experience creating map styles. You understand color theory, visual hierarchy,
    and how to make maps that are both beautiful and functional.""",
    tools=[list_styles_tool, create_style_tool, retrieve_style_tool],
    verbose=True,
    allow_delegation=False
)
```

### Task Chaining

Tasks can build on previous results:

```python
# Task 1: Designer creates style
create_design_task(requirements)

# Task 2: Validator reviews the created style
# (automatically receives context from Task 1)
create_validation_task()

# Task 3: Writer documents the validated style
# (receives context from both previous tasks)
create_documentation_task()
```

### MCP Tool Integration

Wrap MCP tools as CrewAI tools:

```python
from crewai_tools import tool

@tool("List Styles")
def list_styles_tool() -> str:
    """List all Mapbox styles for the authenticated user."""
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(
        mcp_tools.call_tool("list_styles_tool", {})
    )
    return result
```

## Example Workflows

### Workflow 1: Collaborative Style Design

```python
requirements = """
Create a map style for a food delivery application with:
- Light color scheme for daytime visibility
- High contrast between roads and background
- Emphasis on restaurants and addresses
- De-emphasize parks and water bodies
"""

# Three agents collaborate:
# 1. Designer creates the style based on requirements
# 2. Validator checks quality and provides feedback
# 3. Writer documents the final style with examples

result = await run_style_designer_crew(requirements)
```

### Workflow 2: Spatial Data Analysis Pipeline

```python
# Analyze delivery network data with three agents:
# 1. Analyst examines patterns and coverage
# 2. Visualization expert creates map previews
# 3. Report writer synthesizes findings

result = await run_geojson_crew(
    DELIVERY_NETWORK,
    "Analyze our delivery network efficiency. Identify coverage gaps, "
    "route optimization opportunities, and capacity constraints."
)
```

## Advantages of CrewAI

### vs Single-Agent Systems

- ✅ Specialized expertise per agent
- ✅ Better task decomposition
- ✅ More thorough analysis through multiple perspectives
- ✅ Built-in quality review process

### vs LangChain

- ✅ Higher-level abstractions for agent teams
- ✅ Simpler task delegation
- ✅ Better role-based organization
- ✅ More intuitive API for multi-agent scenarios

### vs Pydantic AI

- ✅ Better for complex, multi-step workflows
- ✅ Specialized agents for different roles
- ✅ Built-in collaboration patterns

### vs LangGraph

- ✅ Simpler setup for sequential workflows
- ✅ Less boilerplate for common patterns
- ✅ Automatic context sharing between agents

## Agent Design Patterns

### Pattern 1: Sequential Pipeline

Design → Validate → Document

```python
process=Process.sequential  # Each task completes before next starts
```

Use when: Tasks have clear dependencies and build on each other.

### Pattern 2: Hierarchical (Manager/Worker)

```python
process=Process.hierarchical  # Manager delegates to workers
```

Use when: You need dynamic task allocation and parallel execution.

### Pattern 3: Specialist with Tools

```python
Agent(
    role="Spatial Data Analyst",
    tools=[geojson_preview_tool, bounding_box_tool, coordinate_conversion_tool],
    allow_delegation=True  # Can delegate to other agents
)
```

Use when: Agent needs specific capabilities and may need help from others.

## Using Different LLM Providers

### Anthropic (Claude)

```python
from crewai import LLM

llm = LLM(
    model="anthropic/claude-3-5-sonnet-20241022",
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

agent = Agent(
    role="Style Designer",
    llm=llm,
    ...
)
```

### Google Gemini

```python
llm = LLM(
    model="gemini/gemini-1.5-pro",
    api_key=os.getenv("GOOGLE_API_KEY")
)
```

### Local Models (Ollama)

```python
llm = LLM(
    model="ollama/llama3",
    base_url="http://localhost:11434"
)
```

## Advanced Usage

### Custom Tools

```python
from crewai_tools import BaseTool

class CustomMapTool(BaseTool):
    name: str = "Custom Map Analysis"
    description: str = "Performs custom spatial analysis"

    def _run(self, data: str) -> str:
        # Your custom logic
        return result
```

### Memory and Context

```python
crew = Crew(
    agents=[...],
    tasks=[...],
    memory=True,  # Enables memory across crew runs
    verbose=True
)
```

### Callbacks for Monitoring

```python
from crewai import Agent, Task

def task_callback(output):
    print(f"Task completed: {output}")

task = Task(
    description="...",
    agent=agent,
    callback=task_callback
)
```

## Troubleshooting

### "No module named 'crewai'"

```bash
pip install crewai crewai-tools
```

### "MAPBOX_ACCESS_TOKEN environment variable required"

```bash
export MAPBOX_ACCESS_TOKEN="your_token"
```

### "Agent got stuck in a loop"

- Reduce `max_iter` in Agent configuration
- Make task descriptions more specific
- Set `allow_delegation=False` if not needed

### "Connection error to MCP server"

Make sure the DevKit server package is available:

```bash
npm install -g @mapbox/mcp-devkit-server
```

## Production Tips

### Error Handling

```python
try:
    result = crew.kickoff()
except Exception as e:
    print(f"Crew execution failed: {e}")
    # Implement retry logic or fallback
```

### Rate Limiting

```python
agent = Agent(
    role="...",
    max_rpm=10,  # Max requests per minute
    ...
)
```

### Logging

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CrewAI will log agent interactions
```

## Performance Considerations

- **Sequential Process**: Slower but more reliable for dependent tasks
- **Hierarchical Process**: Faster but requires careful task design
- **Tool Calls**: Each MCP call has latency, minimize unnecessary calls
- **LLM Costs**: Multiple agents = multiple LLM calls, monitor usage

## Next Steps

- Explore [Pydantic AI examples](../pydantic-ai/) for type-safe single agents
- Read [CrewAI documentation](https://docs.crewai.com)
- Check [DevKit server docs](../../README.md)
- Try building your own multi-agent geospatial workflows

## Resources

- [CrewAI Documentation](https://docs.crewai.com)
- [CrewAI GitHub](https://github.com/joaomdmoura/crewAI)
- [MCP Protocol](https://spec.modelcontextprotocol.io/)
- [Mapbox Styles API](https://docs.mapbox.com/api/maps/styles/)
- [GeoJSON Specification](https://geojson.org/)

## Contributing

Found an issue or want to improve these examples?

- Open an issue: https://github.com/mapbox/mcp-devkit-server/issues
- Submit a PR: https://github.com/mapbox/mcp-devkit-server/pulls
