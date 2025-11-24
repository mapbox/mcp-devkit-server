# Pydantic AI Examples - Mapbox MCP DevKit

Python examples demonstrating how to use [Pydantic AI](https://ai.pydantic.dev) with the Mapbox MCP DevKit Server for type-safe style management and GeoJSON analysis.

## What is Pydantic AI?

Pydantic AI is a Python framework for building production-ready AI agents with:

- **Type Safety**: Validated inputs and outputs using Pydantic models
- **Structured Outputs**: Always get predictable, structured data
- **Modern Python**: Uses Python 3.10+ features (async/await, type hints)
- **Multiple Providers**: OpenAI, Anthropic, Gemini, and more

**Best for**: Python developers who prioritize type safety, validation, and production reliability.

## Examples

### `style_builder.py`

Comprehensive style management examples:

- List and analyze existing styles with structured outputs
- Create custom styles with validation
- Generate public tokens with URL restrictions
- Compare styles side-by-side
- Preview GeoJSON data on maps

### `geojson_analyzer.py`

GeoJSON analysis with type-safe outputs:

- Analyze spatial data with validated models
- Detect spatial patterns (clustering, linear, dispersed)
- Assess data quality
- Generate visualization recommendations
- Preview and analyze data together

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
# Style builder examples
python style_builder.py

# GeoJSON analyzer examples
python geojson_analyzer.py
```

## Key Features

### Type-Safe Outputs

Pydantic AI ensures all outputs match your defined models:

```python
from pydantic import BaseModel, Field

class StyleInfo(BaseModel):
    id: str = Field(description="The style ID")
    name: str = Field(description="Human-readable name")
    owner: str
    visibility: str

# Agent returns validated data
result = await agent.run("List my styles", result_type=StyleInfo)
# result.data is guaranteed to be a StyleInfo instance
```

### Structured Analysis

Get predictable, structured outputs:

```python
class GeoJSONSummary(BaseModel):
    total_features: int
    geometry_types: List[GeometryInfo]
    bounding_box: BoundingBox
    recommended_zoom: int = Field(ge=0, le=22)  # Validated range
    insights: List[str]

result = await agent.run(
    f"Analyze this GeoJSON: {data}",
    result_type=GeoJSONSummary
)

# Access typed, validated data
print(f"Found {result.data.total_features} features")
print(f"Zoom to {result.data.recommended_zoom}")
```

### Validation

Pydantic automatically validates all data:

```python
class BoundingBox(BaseModel):
    min_lng: float = Field(ge=-180, le=180)  # Longitude range
    min_lat: float = Field(ge=-90, le=90)    # Latitude range
    max_lng: float = Field(ge=-180, le=180)
    max_lat: float = Field(ge=-90, le=90)

# Invalid coordinates will raise validation errors
# This prevents bugs from bad data
```

## Example Workflows

### Workflow 1: Create and Analyze Custom Style

```python
# Define output model
class StyleCreationResult(BaseModel):
    style_id: str
    style_name: str
    base_style: str
    customizations: List[str]
    preview_url: str

# Create style with validated output
result = await agent.run(
    """Create a dark mode style for a food delivery app.
    Base it on Streets v12, emphasize restaurants.""",
    result_type=StyleCreationResult
)

# Type-safe access
print(f"Created: {result.data.style_id}")
print(f"Preview: {result.data.preview_url}")
```

### Workflow 2: GeoJSON Quality Assessment

```python
class DataQualityReport(BaseModel):
    is_valid: bool
    completeness_score: float = Field(ge=0.0, le=1.0)
    issues: List[str]
    recommendations: List[str]

result = await agent.run(
    f"Assess quality of this GeoJSON: {data}",
    result_type=DataQualityReport
)

if not result.data.is_valid:
    print("Data issues found:")
    for issue in result.data.issues:
        print(f"  - {issue}")
```

### Workflow 3: Style Comparison

```python
class StyleComparison(BaseModel):
    left_style: str
    right_style: str
    key_differences: List[str]
    performance_notes: str
    recommendation: str

result = await agent.run(
    "Compare light-v11 and dark-v11 for a restaurant app",
    result_type=StyleComparison
)

print(result.data.recommendation)
```

## Advantages of Pydantic AI

### vs Raw LLM APIs

- ✅ Structured outputs (not just text)
- ✅ Automatic validation
- ✅ Type safety throughout
- ✅ Easier to test

### vs LangChain

- ✅ Simpler, more Pythonic API
- ✅ Better type safety
- ✅ Less boilerplate
- ✅ Faster iteration

### vs TypeScript Frameworks

- ✅ Python ecosystem (pandas, geopandas, shapely)
- ✅ Rich data science libraries
- ✅ Better for geospatial analysis

### vs CrewAI

- ✅ Simpler for single-agent tasks
- ✅ Better validation
- ✅ More explicit type safety

## Using Different LLM Providers

### Anthropic (Claude)

```python
from pydantic_ai.models.anthropic import AnthropicModel

model = AnthropicModel('claude-3-5-sonnet-20241022')
agent = Agent(model=model, ...)
```

Set environment variable:

```bash
export ANTHROPIC_API_KEY="your_key"
```

### Google Gemini

```python
from pydantic_ai.models.gemini import GeminiModel

model = GeminiModel('gemini-1.5-pro')
agent = Agent(model=model, ...)
```

Set environment variable:

```bash
export GOOGLE_API_KEY="your_key"
```

## Advanced Usage

### Custom Validation

```python
from pydantic import validator

class StyleConfig(BaseModel):
    name: str
    zoom_levels: List[int]

    @validator('zoom_levels')
    def check_zoom_range(cls, v):
        if not all(0 <= z <= 22 for z in v):
            raise ValueError('Zoom levels must be 0-22')
        return v
```

### Nested Models

```python
class Layer(BaseModel):
    id: str
    type: Literal["fill", "line", "symbol"]
    source: str

class Style(BaseModel):
    id: str
    name: str
    layers: List[Layer]
    sources: dict

result = await agent.run(
    "Analyze this style structure",
    result_type=Style
)
```

### Optional Fields

```python
class Analysis(BaseModel):
    required_field: str
    optional_field: Optional[str] = None
    default_value: int = 10
```

## Troubleshooting

### "No module named 'pydantic_ai'"

```bash
pip install pydantic-ai
```

### "MAPBOX_ACCESS_TOKEN environment variable required"

```bash
export MAPBOX_ACCESS_TOKEN="your_token"
```

### "Validation error"

Check your Pydantic models match the expected output structure. Use `print(result.data)` to see what was returned.

### "Connection error"

Make sure the DevKit server package is available:

```bash
npm install -g @mapbox/mcp-devkit-server
```

Or use the local build by modifying the MCP client command.

## Production Tips

### Error Handling

```python
from pydantic import ValidationError

try:
    result = await agent.run(prompt, result_type=MyModel)
    data = result.data
except ValidationError as e:
    print(f"Invalid data structure: {e}")
except Exception as e:
    print(f"Error: {e}")
```

### Retries and Fallbacks

```python
from pydantic_ai import Agent

agent = Agent(
    model=model,
    retries=3,  # Retry on failure
    # ... other config
)
```

### Logging

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

result = await agent.run(prompt)
logger.info(f"Result: {result.data}")
```

## Next Steps

- Explore [Mastra examples](../mastra/) for TypeScript
- Read [Pydantic AI documentation](https://ai.pydantic.dev)
- Check [DevKit server docs](../../README.md)
- Try building your own geospatial analysis agents

## Resources

- [Pydantic AI Documentation](https://ai.pydantic.dev)
- [Pydantic Documentation](https://docs.pydantic.dev)
- [MCP Protocol](https://spec.modelcontextprotocol.io/)
- [Mapbox Styles API](https://docs.mapbox.com/api/maps/styles/)
- [GeoJSON Specification](https://geojson.org/)

## Contributing

Found an issue or want to improve these examples?

- Open an issue: https://github.com/mapbox/mcp-devkit-server/issues
- Submit a PR: https://github.com/mapbox/mcp-devkit-server/pulls
