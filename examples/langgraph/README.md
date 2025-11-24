# LangGraph Examples - Mapbox MCP DevKit

Python examples demonstrating how to use [LangGraph](https://langchain-ai.github.io/langgraph/) with the Mapbox MCP DevKit Server for stateful, graph-based geospatial workflows.

## What is LangGraph?

LangGraph is a Python framework for building stateful, multi-step applications with LLMs:

- **State Management**: Persistent state across workflow steps
- **Graph-Based**: Define workflows as directed graphs with nodes and edges
- **Conditional Routing**: Dynamic branching based on state
- **Cyclic Graphs**: Support for loops and retries
- **Checkpointing**: Save and resume workflow state

**Best for**: Complex workflows requiring state persistence, conditional logic, and iterative refinement.

## Examples

### `style_workflow.py`

Stateful style creation workflow with validation and iteration:

- Analyzes user requirements
- Creates custom Mapbox styles
- Validates against best practices
- Retries up to 3 times on validation failure
- Generates documentation

**Scenarios**:

1. Delivery App Style - Light scheme with navigation emphasis
2. Running App Style - Dark mode with trail emphasis

### `geojson_workflow.py`

Conditional GeoJSON analysis with specialized paths:

- Classifies data type (points, lines, polygons, mixed)
- Routes to specialized analysis based on geometry
- Assesses data quality
- Creates visualizations
- Generates recommendations and reports

**Scenarios**:

1. Restaurant Locations - Point data analysis
2. Delivery Routes - Line data analysis
3. Delivery Zones - Polygon data analysis

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

Get a token at: https://account.mapbox.com/access-tokens/

### 4. Run Examples

```bash
# Style workflow with validation loop
python style_workflow.py

# GeoJSON workflow with conditional routing
python geojson_workflow.py
```

## Key Features

### State Management

LangGraph maintains state across all workflow steps:

```python
class StyleWorkflowState(TypedDict):
    """State persists throughout workflow"""
    requirements: str
    style_analysis: str
    created_style_id: str
    validation_result: str
    validation_passed: bool
    iteration_count: int
    final_style: dict
    error: str | None
```

### Graph-Based Workflows

Define workflows as directed graphs:

```python
workflow = StateGraph(StyleWorkflowState)

# Add nodes (workflow steps)
workflow.add_node("analyze", analyze_requirements_node)
workflow.add_node("create", create_style_node)
workflow.add_node("validate", validate_style_node)
workflow.add_node("finalize", finalize_style_node)

# Add edges (flow between steps)
workflow.set_entry_point("analyze")
workflow.add_edge("analyze", "create")
workflow.add_edge("create", "validate")
```

### Conditional Routing

Route dynamically based on state:

```python
def should_retry(state: StyleWorkflowState) -> Literal["retry", "finalize", "error"]:
    """Determine next step based on validation"""
    if state.get("error"):
        return "error"

    if state.get("validation_passed"):
        return "finalize"

    if state.get("iteration_count", 0) >= 3:
        return "finalize"  # Max iterations reached

    return "retry"  # Try again

# Add conditional edge
workflow.add_conditional_edges(
    "validate",
    should_retry,
    {
        "retry": "create",      # Loop back
        "finalize": "finalize",
        "error": END
    }
)
```

### Cyclic Graphs (Loops)

Support for iterative refinement:

```python
# Create loop: validate → create → validate
workflow.add_conditional_edges(
    "validate",
    should_retry,
    {"retry": "create"}  # Loops back to create
)
```

## Example Workflows

### Workflow 1: Iterative Style Creation

```python
requirements = """
Create a map style for a food delivery application:
- Light, high-contrast color scheme
- Emphasize major roads and restaurants
- De-emphasize parks and water
"""

# Workflow automatically:
# 1. Analyzes requirements
# 2. Creates style
# 3. Validates style
# 4. If validation fails, loops back to step 2 (up to 3 times)
# 5. Finalizes and documents

final_state = await app.ainvoke(initial_state)
```

**Graph Flow**:

```
analyze → create → validate → finalize
                      ↓
                   (retry) → create
```

### Workflow 2: Conditional GeoJSON Analysis

```python
# Workflow automatically:
# 1. Classifies data type
# 2. Assesses quality
# 3. Routes to specialized analysis based on type:
#    - Points → clustering analysis
#    - Lines → connectivity analysis
#    - Polygons → area analysis
#    - Mixed → composite analysis
# 4. Creates visualization
# 5. Generates recommendations
# 6. Produces final report

final_state = await app.ainvoke(initial_state)
```

**Graph Flow**:

```
classify → assess_quality → [conditional routing]
                                  ↓
                    ┌─────────────┼─────────────┐
                    ↓             ↓             ↓
              analyze_points  analyze_lines  analyze_polygons
                    └─────────────┼─────────────┘
                                  ↓
                            visualize → recommend → report
```

## Advantages of LangGraph

### vs Single-Step Agents

- ✅ State persists across steps
- ✅ Support for complex conditional logic
- ✅ Built-in retry and error handling
- ✅ Visualizable workflow structure

### vs CrewAI

- ✅ More flexible routing logic
- ✅ Better for cyclic workflows (loops)
- ✅ Finer control over state transitions
- ✅ Support for parallel execution (not shown in examples)

### vs LangChain

- ✅ Built specifically for stateful workflows
- ✅ Better graph visualization
- ✅ Simpler conditional routing
- ✅ Integrated checkpointing

### vs Pydantic AI

- ✅ Better for multi-step workflows
- ✅ State management built-in
- ✅ Support for complex branching

## Workflow Patterns

### Pattern 1: Linear Pipeline

```python
workflow.add_edge("step1", "step2")
workflow.add_edge("step2", "step3")
workflow.add_edge("step3", END)
```

Use when: Steps always execute in sequence.

### Pattern 2: Conditional Branching

```python
workflow.add_conditional_edges(
    "decision_node",
    routing_function,
    {
        "path_a": "node_a",
        "path_b": "node_b"
    }
)
```

Use when: Different paths based on state.

### Pattern 3: Loop with Exit Condition

```python
def should_continue(state):
    if state["done"]:
        return "exit"
    return "retry"

workflow.add_conditional_edges(
    "check",
    should_continue,
    {
        "retry": "process",  # Loop back
        "exit": END
    }
)
```

Use when: Iterative refinement needed.

## Using Different LLM Providers

### Anthropic (Claude)

```python
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(
    model="claude-3-5-sonnet-20241022",
    api_key=os.getenv("ANTHROPIC_API_KEY")
)
```

Set environment variable:

```bash
export ANTHROPIC_API_KEY="your_key"
```

### Google Gemini

```python
from langchain_google_genai import ChatGoogleGenerativeAI

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    google_api_key=os.getenv("GOOGLE_API_KEY")
)
```

### Local Models (Ollama)

```python
from langchain_community.chat_models import ChatOllama

llm = ChatOllama(
    model="llama3",
    base_url="http://localhost:11434"
)
```

## Advanced Usage

### Checkpointing (Save/Resume)

```python
from langgraph.checkpoint.memory import MemorySaver

# Add checkpoint support
checkpointer = MemorySaver()
app = workflow.compile(checkpointer=checkpointer)

# Run with thread ID
config = {"configurable": {"thread_id": "my-workflow-123"}}
result = await app.ainvoke(initial_state, config)

# Resume later
resumed = await app.ainvoke(None, config)  # Continues from checkpoint
```

### Parallel Execution

```python
from langgraph.graph import parallel

# Execute multiple nodes in parallel
workflow.add_node("parallel_step", parallel(
    analyze_quality_node,
    create_visualization_node
))
```

### Custom Node Functions

```python
async def custom_node(state: MyState) -> MyState:
    """Each node receives and returns state"""
    # Access current state
    data = state["data"]

    # Perform operations
    result = await process(data)

    # Update state
    state["result"] = result

    return state
```

### Streaming Updates

```python
async for event in app.astream(initial_state):
    print(f"Event: {event}")
    # Process intermediate results
```

## Troubleshooting

### "No module named 'langgraph'"

```bash
pip install langgraph langchain langchain-openai
```

### "MAPBOX_ACCESS_TOKEN environment variable required"

```bash
export MAPBOX_ACCESS_TOKEN="your_token"
```

### "Workflow stuck in infinite loop"

- Add iteration counters to state
- Implement exit conditions in routing functions
- Set maximum iteration limits

### "State not updating between nodes"

- Ensure nodes return modified state
- Check state is properly typed (TypedDict)
- Verify edges connect nodes correctly

## Visualization

LangGraph workflows can be visualized:

```python
from IPython.display import Image

# Generate graph visualization
Image(app.get_graph().draw_png())
```

## Performance Considerations

- **State Size**: Keep state lean, avoid large objects
- **Node Complexity**: Complex nodes slow down workflow
- **Checkpointing**: Adds overhead but enables resume
- **LLM Calls**: Each node with LLM adds latency

## Production Tips

### Error Handling

```python
async def safe_node(state: MyState) -> MyState:
    try:
        result = await risky_operation()
        state["result"] = result
    except Exception as e:
        state["error"] = str(e)
    return state
```

### Logging

```python
import logging

async def logged_node(state: MyState) -> MyState:
    logger.info(f"Entering node with state: {state}")
    # ... process ...
    logger.info(f"Exiting node with state: {state}")
    return state
```

### Monitoring

```python
# Track workflow progress
def log_event(event):
    print(f"Node: {event['node']}, State: {event['state']}")

app = workflow.compile(on_event=log_event)
```

## Next Steps

- Explore [CrewAI examples](../crewai/) for multi-agent collaboration
- Read [LangGraph documentation](https://langchain-ai.github.io/langgraph/)
- Check [DevKit server docs](../../README.md)
- Try building your own stateful geospatial workflows

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)
- [LangChain Documentation](https://python.langchain.com/)
- [MCP Protocol](https://spec.modelcontextprotocol.io/)
- [Mapbox Styles API](https://docs.mapbox.com/api/maps/styles/)
- [GeoJSON Specification](https://geojson.org/)

## Contributing

Found an issue or want to improve these examples?

- Open an issue: https://github.com/mapbox/mcp-devkit-server/issues
- Submit a PR: https://github.com/mapbox/mcp-devkit-server/pulls
