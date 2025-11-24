#!/usr/bin/env python3
"""
Mapbox MCP DevKit Server - LangGraph GeoJSON Analysis Workflow

This example demonstrates using LangGraph to create a conditional workflow
for GeoJSON analysis with different paths based on data characteristics.

Prerequisites:
- Python 3.10-3.13
- Environment variables:
  - MAPBOX_ACCESS_TOKEN: Your Mapbox access token
  - OPENAI_API_KEY: Your OpenAI API key
"""

import os
import json
import asyncio
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# State definition
class GeoJSONWorkflowState(TypedDict):
    """State for GeoJSON analysis workflow"""
    geojson_data: dict
    data_type: Literal["points", "lines", "polygons", "mixed"] | None
    feature_count: int
    quality_score: float
    issues: list
    analysis: str
    visualization_url: str
    recommendations: list
    report: str


# MCP Client wrapper
class MapboxMCPClient:
    """Wrapper for Mapbox MCP DevKit tools"""

    def __init__(self):
        self.session = None
        self._connection = None
        self._streams = None

    async def connect(self):
        """Connect to MCP server"""
        # Use local build from repository root
        import pathlib
        server_path = pathlib.Path(__file__).parent.parent.parent / "dist" / "esm" / "index.js"
        if not server_path.exists():
            raise FileNotFoundError(
                f"Server not found at {server_path}. Run 'npm run build' from repository root first."
            )

        server_params = StdioServerParameters(
            command="node",
            args=[str(server_path)],
            env={
                "MAPBOX_ACCESS_TOKEN": os.getenv("MAPBOX_ACCESS_TOKEN", ""),
                "ENABLE_MCP_UI": "true"
            }
        )

        self._connection = stdio_client(server_params)
        self._streams = await self._connection.__aenter__()
        read, write = self._streams
        self.session = ClientSession(read, write)
        await self.session.__aenter__()
        await self.session.initialize()

    async def disconnect(self):
        """Disconnect from MCP server"""
        if self.session:
            await self.session.__aexit__(None, None, None)
        if self._connection:
            await self._connection.__aexit__(None, None, None)

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call an MCP tool"""
        if not self.session:
            await self.connect()

        result = await self.session.call_tool(tool_name, arguments)
        if hasattr(result, 'content'):
            if isinstance(result.content, list) and len(result.content) > 0:
                return {"text": result.content[0].text}
            return {"text": str(result.content)}
        return result


# Global MCP client
mcp_client = MapboxMCPClient()


# LLM setup
llm = ChatOpenAI(model="gpt-4o", temperature=0.3)


# Workflow nodes
async def classify_data_node(state: GeoJSONWorkflowState) -> GeoJSONWorkflowState:
    """Classify the type and characteristics of GeoJSON data"""
    print("\n🔍 Classifying GeoJSON data...")

    data = state["geojson_data"]
    features = data.get("features", [])

    # Count features
    state["feature_count"] = len(features)

    # Determine geometry types
    geometry_types = set()
    for feature in features:
        geom_type = feature.get("geometry", {}).get("type", "")
        geometry_types.add(geom_type)

    # Classify data type
    if len(geometry_types) > 1:
        state["data_type"] = "mixed"
    elif "Point" in geometry_types or "MultiPoint" in geometry_types:
        state["data_type"] = "points"
    elif "LineString" in geometry_types or "MultiLineString" in geometry_types:
        state["data_type"] = "lines"
    elif "Polygon" in geometry_types or "MultiPolygon" in geometry_types:
        state["data_type"] = "polygons"
    else:
        state["data_type"] = "mixed"

    print(f"✅ Classification complete")
    print(f"   Type: {state['data_type']}")
    print(f"   Features: {state['feature_count']}")

    return state


async def assess_quality_node(state: GeoJSONWorkflowState) -> GeoJSONWorkflowState:
    """Assess data quality"""
    print("\n✅ Assessing data quality...")

    data = state["geojson_data"]
    features = data.get("features", [])

    issues = []
    total_checks = 0
    passed_checks = 0

    # Check for empty features
    total_checks += 1
    if len(features) > 0:
        passed_checks += 1
    else:
        issues.append("No features in dataset")

    # Check coordinate validity
    for i, feature in enumerate(features):
        coords = feature.get("geometry", {}).get("coordinates", [])
        total_checks += 1

        # Basic coordinate validation
        try:
            if state["data_type"] == "points":
                if isinstance(coords, list) and len(coords) == 2:
                    lng, lat = coords
                    if -180 <= lng <= 180 and -90 <= lat <= 90:
                        passed_checks += 1
                    else:
                        issues.append(f"Feature {i}: Invalid coordinates {coords}")
                else:
                    issues.append(f"Feature {i}: Malformed coordinates")
            else:
                passed_checks += 1  # Simplified for complex geometries
        except Exception as e:
            issues.append(f"Feature {i}: Error checking coordinates - {e}")

    # Check property completeness
    total_checks += 1
    has_properties = all(
        feature.get("properties") and len(feature.get("properties", {})) > 0
        for feature in features
    )
    if has_properties:
        passed_checks += 1
    else:
        issues.append("Some features have missing or empty properties")

    # Calculate quality score
    state["quality_score"] = (passed_checks / total_checks) if total_checks > 0 else 0
    state["issues"] = issues

    print(f"   Quality Score: {state['quality_score']:.1%}")
    print(f"   Issues Found: {len(issues)}")

    return state


async def analyze_points_node(state: GeoJSONWorkflowState) -> GeoJSONWorkflowState:
    """Specialized analysis for point data"""
    print("\n📍 Analyzing point data...")

    messages = [
        SystemMessage(content="""You are a geospatial analyst specializing in point data.
Analyze clustering, dispersion, and spatial patterns."""),
        HumanMessage(content=f"""Analyze this point dataset:

{json.dumps(state['geojson_data'], indent=2)[:2000]}

Provide insights on:
1. Spatial distribution (clustered, dispersed, random)
2. Notable patterns or hotspots
3. Coverage and density
4. Potential use cases""")
    ]

    response = await llm.ainvoke(messages)
    state["analysis"] = response.content

    print(f"✅ Point analysis complete")

    return state


async def analyze_lines_node(state: GeoJSONWorkflowState) -> GeoJSONWorkflowState:
    """Specialized analysis for line data"""
    print("\n🛤️  Analyzing line data...")

    messages = [
        SystemMessage(content="""You are a geospatial analyst specializing in linear features.
Analyze connectivity, routes, and network patterns."""),
        HumanMessage(content=f"""Analyze this line dataset:

{json.dumps(state['geojson_data'], indent=2)[:2000]}

Provide insights on:
1. Network connectivity
2. Route efficiency
3. Coverage patterns
4. Potential use cases""")
    ]

    response = await llm.ainvoke(messages)
    state["analysis"] = response.content

    print(f"✅ Line analysis complete")

    return state


async def analyze_polygons_node(state: GeoJSONWorkflowState) -> GeoJSONWorkflowState:
    """Specialized analysis for polygon data"""
    print("\n▢ Analyzing polygon data...")

    messages = [
        SystemMessage(content="""You are a geospatial analyst specializing in area features.
Analyze boundaries, coverage, and spatial relationships."""),
        HumanMessage(content=f"""Analyze this polygon dataset:

{json.dumps(state['geojson_data'], indent=2)[:2000]}

Provide insights on:
1. Area coverage and extent
2. Boundary characteristics
3. Spatial relationships
4. Potential use cases""")
    ]

    response = await llm.ainvoke(messages)
    state["analysis"] = response.content

    print(f"✅ Polygon analysis complete")

    return state


async def analyze_mixed_node(state: GeoJSONWorkflowState) -> GeoJSONWorkflowState:
    """Analysis for mixed geometry types"""
    print("\n🔀 Analyzing mixed geometries...")

    messages = [
        SystemMessage(content="""You are a geospatial analyst.
Analyze datasets with multiple geometry types."""),
        HumanMessage(content=f"""Analyze this mixed dataset:

{json.dumps(state['geojson_data'], indent=2)[:2000]}

Provide insights on:
1. Relationships between different geometry types
2. Overall spatial story
3. How features complement each other
4. Potential use cases""")
    ]

    response = await llm.ainvoke(messages)
    state["analysis"] = response.content

    print(f"✅ Mixed analysis complete")

    return state


async def create_visualization_node(state: GeoJSONWorkflowState) -> GeoJSONWorkflowState:
    """Create visualization of the data"""
    print("\n🎨 Creating visualization...")

    try:
        result = await mcp_client.call_tool("geojson_preview_tool", {
            "geojson": json.dumps(state["geojson_data"])
        })

        # Extract URL from result
        result_text = result.get("text", "")
        if "https://api.mapbox.com" in result_text:
            # Extract URL from text
            import re
            url_match = re.search(r'https://api\.mapbox\.com[^\s\)]+', result_text)
            if url_match:
                state["visualization_url"] = url_match.group(0)
            else:
                state["visualization_url"] = "Visualization created"
        else:
            state["visualization_url"] = "Visualization created"

        print(f"✅ Visualization created")

    except Exception as e:
        state["visualization_url"] = f"Error: {e}"
        print(f"⚠️  Visualization error: {e}")

    return state


async def generate_recommendations_node(state: GeoJSONWorkflowState) -> GeoJSONWorkflowState:
    """Generate recommendations based on analysis"""
    print("\n💡 Generating recommendations...")

    messages = [
        SystemMessage(content="""You are a geospatial consultant.
Provide actionable recommendations based on data analysis."""),
        HumanMessage(content=f"""Based on this analysis:

Data Type: {state['data_type']}
Quality Score: {state['quality_score']:.1%}
Issues: {state['issues']}
Analysis: {state['analysis']}

Provide 3-5 specific, actionable recommendations for:
1. Data improvements
2. Visualization strategies
3. Potential applications
4. Next steps""")
    ]

    response = await llm.ainvoke(messages)

    # Parse recommendations
    recommendations = [
        line.strip()
        for line in response.content.split('\n')
        if line.strip() and (line.strip()[0].isdigit() or line.strip().startswith('-'))
    ]

    state["recommendations"] = recommendations

    print(f"✅ Generated {len(recommendations)} recommendations")

    return state


async def generate_report_node(state: GeoJSONWorkflowState) -> GeoJSONWorkflowState:
    """Generate final report"""
    print("\n📄 Generating final report...")

    report = f"""
# GeoJSON Analysis Report

## Dataset Overview
- **Data Type**: {state['data_type']}
- **Feature Count**: {state['feature_count']}
- **Quality Score**: {state['quality_score']:.1%}

## Quality Assessment
"""

    if state['issues']:
        report += "\n### Issues Found:\n"
        for issue in state['issues'][:5]:  # Limit to 5 issues
            report += f"- {issue}\n"
    else:
        report += "\n✅ No significant issues detected\n"

    report += f"""
## Analysis

{state['analysis']}

## Recommendations

"""

    for i, rec in enumerate(state['recommendations'], 1):
        report += f"{i}. {rec}\n"

    report += f"""
## Visualization

{state['visualization_url']}

---
*Generated by LangGraph GeoJSON Workflow*
"""

    state["report"] = report

    print("✅ Report generated")

    return state


# Conditional routing
def route_by_data_type(state: GeoJSONWorkflowState) -> str:
    """Route to appropriate analysis node based on data type"""
    data_type = state.get("data_type", "mixed")
    print(f"\n➡️  Routing to {data_type} analysis...")

    routing = {
        "points": "analyze_points",
        "lines": "analyze_lines",
        "polygons": "analyze_polygons",
        "mixed": "analyze_mixed"
    }

    return routing.get(data_type, "analyze_mixed")


# Build workflow
def create_workflow() -> StateGraph:
    """Create the LangGraph workflow"""
    workflow = StateGraph(GeoJSONWorkflowState)

    # Add nodes
    workflow.add_node("classify", classify_data_node)
    workflow.add_node("assess_quality", assess_quality_node)
    workflow.add_node("analyze_points", analyze_points_node)
    workflow.add_node("analyze_lines", analyze_lines_node)
    workflow.add_node("analyze_polygons", analyze_polygons_node)
    workflow.add_node("analyze_mixed", analyze_mixed_node)
    workflow.add_node("visualize", create_visualization_node)
    workflow.add_node("recommend", generate_recommendations_node)
    workflow.add_node("report", generate_report_node)

    # Add edges
    workflow.set_entry_point("classify")
    workflow.add_edge("classify", "assess_quality")

    # Conditional routing based on data type
    workflow.add_conditional_edges(
        "assess_quality",
        route_by_data_type,
        {
            "analyze_points": "analyze_points",
            "analyze_lines": "analyze_lines",
            "analyze_polygons": "analyze_polygons",
            "analyze_mixed": "analyze_mixed"
        }
    )

    # All analysis nodes converge to visualization
    workflow.add_edge("analyze_points", "visualize")
    workflow.add_edge("analyze_lines", "visualize")
    workflow.add_edge("analyze_polygons", "visualize")
    workflow.add_edge("analyze_mixed", "visualize")

    workflow.add_edge("visualize", "recommend")
    workflow.add_edge("recommend", "report")
    workflow.add_edge("report", END)

    return workflow.compile()


# Example datasets
RESTAURANT_LOCATIONS = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "Wierzynek",
                "cuisine": "Polish",
                "rating": 4.6
            },
            "geometry": {"type": "Point", "coordinates": [19.9370, 50.0619]}
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Pod Aniołami",
                "cuisine": "Medieval Polish",
                "rating": 4.7
            },
            "geometry": {"type": "Point", "coordinates": [19.9345, 50.0616]}
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Starka",
                "cuisine": "Modern Polish",
                "rating": 4.5
            },
            "geometry": {"type": "Point", "coordinates": [19.9395, 50.0625]}
        }
    ]
}

DELIVERY_ROUTES = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"route_id": "R001", "driver": "Anna"},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [21.0122, 52.2297],
                    [21.0222, 52.2397],
                    [21.0322, 52.2497]
                ]
            }
        },
        {
            "type": "Feature",
            "properties": {"route_id": "R002", "driver": "Piotr"},
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [21.0022, 52.2197],
                    [21.0122, 52.2297],
                    [21.0222, 52.2397]
                ]
            }
        }
    ]
}

DELIVERY_ZONES = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"zone": "Śródmieście", "demand": "high"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [21.00, 52.22],
                    [21.02, 52.22],
                    [21.02, 52.24],
                    [21.00, 52.24],
                    [21.00, 52.22]
                ]]
            }
        }
    ]
}


# Examples
async def run_workflow_example(name: str, data: dict):
    """Run workflow on example data"""
    print(f"\n🚀 LangGraph GeoJSON Workflow - {name}")
    print("=" * 60)

    await mcp_client.connect()

    try:
        app = create_workflow()

        initial_state: GeoJSONWorkflowState = {
            "geojson_data": data,
            "data_type": None,
            "feature_count": 0,
            "quality_score": 0.0,
            "issues": [],
            "analysis": "",
            "visualization_url": "",
            "recommendations": [],
            "report": ""
        }

        final_state = await app.ainvoke(initial_state)

        print("\n" + "=" * 60)
        print(final_state["report"])
        print("=" * 60)

    finally:
        await mcp_client.disconnect()


async def main():
    """Run examples"""
    try:
        print("\n🗺️  Mapbox MCP DevKit - LangGraph GeoJSON Workflow Examples\n")

        if not os.getenv("MAPBOX_ACCESS_TOKEN"):
            raise ValueError("MAPBOX_ACCESS_TOKEN required")
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY required")

        print("Select an example:")
        print("1. Restaurant Locations (Points)")
        print("2. Delivery Routes (Lines)")
        print("3. Delivery Zones (Polygons)")
        choice = input("\nEnter choice (1, 2, or 3): ").strip()

        if choice == "1":
            await run_workflow_example("Restaurant Locations", RESTAURANT_LOCATIONS)
        elif choice == "2":
            await run_workflow_example("Delivery Routes", DELIVERY_ROUTES)
        elif choice == "3":
            await run_workflow_example("Delivery Zones", DELIVERY_ZONES)
        else:
            print("Invalid choice, running Restaurant Locations example...")
            await run_workflow_example("Restaurant Locations", RESTAURANT_LOCATIONS)

        print("\n\n✅ Example completed successfully!")
        print("\n💡 This workflow demonstrated:")
        print("   • Conditional routing based on data type")
        print("   • Specialized analysis paths for different geometries")
        print("   • Quality assessment and recommendations")
        print("   • Comprehensive report generation")

    except Exception as error:
        print(f"\n❌ Error: {error}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
