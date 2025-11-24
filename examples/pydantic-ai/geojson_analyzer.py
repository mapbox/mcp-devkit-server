#!/usr/bin/env python3
"""
Mapbox MCP DevKit Server - GeoJSON Analyzer Example

This example demonstrates using Pydantic AI to analyze and visualize
GeoJSON data with type-safe, validated outputs.

Prerequisites:
- Python 3.10-3.13
- Environment variables:
  - MAPBOX_ACCESS_TOKEN: Your Mapbox access token
  - OPENAI_API_KEY: Your OpenAI API key
"""

import os
import json
import asyncio
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIModel
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# Pydantic models for GeoJSON analysis
class GeometryInfo(BaseModel):
    """Information about a geometry type"""
    type: Literal["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"]
    count: int
    example_feature: Optional[str] = Field(description="Example feature name")


class BoundingBox(BaseModel):
    """Bounding box coordinates"""
    min_lng: float
    min_lat: float
    max_lng: float
    max_lat: float
    center_lng: float
    center_lat: float


class GeoJSONSummary(BaseModel):
    """Complete summary of GeoJSON data"""
    total_features: int
    geometry_types: List[GeometryInfo]
    has_properties: bool
    property_keys: List[str] = Field(description="Available property keys")
    bounding_box: BoundingBox
    recommended_zoom: int = Field(ge=0, le=22)
    insights: List[str] = Field(description="Key observations about the data")


class SpatialPattern(BaseModel):
    """Identified spatial pattern in the data"""
    pattern_type: Literal["cluster", "linear", "dispersed", "grid"]
    description: str
    significance: Literal["high", "medium", "low"]


class DataQualityReport(BaseModel):
    """Quality assessment of GeoJSON data"""
    is_valid: bool
    completeness_score: float = Field(ge=0.0, le=1.0, description="0-1 score")
    issues: List[str] = Field(description="Data quality issues found")
    recommendations: List[str] = Field(description="How to improve the data")


# MCP Client setup
async def create_mcp_client():
    """Create MCP client connection"""
    # Use local build from repository root
    from pathlib import Path
    server_path = Path(__file__).parent.parent.parent / "dist" / "esm" / "index.js"
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

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            yield session


def create_agent(session):
    """Create Pydantic AI agent"""
    model = OpenAIModel('gpt-4o')

    return Agent(
        model=model,
        system_prompt="""You are a geospatial data analyst expert.
You analyze GeoJSON data to identify patterns, quality issues, and insights.
Always provide specific, actionable observations.""",
        result_type=str
    )


# Example GeoJSON datasets
DELIVERY_ROUTES = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {"route_id": "R001", "driver": "Anna", "deliveries": 8},
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
            "properties": {"route_id": "R002", "driver": "Piotr", "deliveries": 6},
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

RESTAURANT_LOCATIONS = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "Wierzynek",
                "cuisine": "Polish",
                "rating": 4.6,
                "delivery_available": True
            },
            "geometry": {"type": "Point", "coordinates": [19.9370, 50.0619]}
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Pod Aniołami",
                "cuisine": "Medieval Polish",
                "rating": 4.7,
                "delivery_available": True
            },
            "geometry": {"type": "Point", "coordinates": [19.9345, 50.0616]}
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Starka",
                "cuisine": "Modern Polish",
                "rating": 4.5,
                "delivery_available": False
            },
            "geometry": {"type": "Point", "coordinates": [19.9395, 50.0625]}
        }
    ]
}


async def example_basic_analysis():
    """Example 1: Basic GeoJSON analysis"""
    print("\n📊 Example 1: Basic GeoJSON Analysis")
    print("=" * 60)

    async for session in create_mcp_client():
        agent = create_agent(session)

        result = await agent.run(
            f"""Analyze this restaurant location data:
{json.dumps(RESTAURANT_LOCATIONS, indent=2)}

Provide a complete summary including geometry types, properties,
bounding box, and viewing recommendations.""",
            result_type=GeoJSONSummary
        )

        summary = result.data
        print(f"\n📈 Summary:")
        print(f"  Total Features: {summary.total_features}")
        print(f"  Has Properties: {summary.has_properties}")
        print(f"\n🗺️  Bounding Box:")
        print(f"  Center: [{summary.bounding_box.center_lng:.4f}, {summary.bounding_box.center_lat:.4f}]")
        print(f"  Recommended Zoom: {summary.recommended_zoom}")
        print(f"\n📋 Property Keys: {', '.join(summary.property_keys)}")
        print(f"\n💡 Insights:")
        for insight in summary.insights:
            print(f"  • {insight}")


async def example_pattern_detection():
    """Example 2: Detect spatial patterns"""
    print("\n\n🔍 Example 2: Spatial Pattern Detection")
    print("=" * 60)

    async for session in create_mcp_client():
        agent = create_agent(session)

        result = await agent.run(
            f"""Analyze delivery routes and identify spatial patterns:
{json.dumps(DELIVERY_ROUTES, indent=2)}

Look for:
- Route clustering
- Coverage patterns
- Efficiency indicators""",
            result_type=List[SpatialPattern]
        )

        patterns = result.data
        print(f"\n🎯 Found {len(patterns)} patterns:")
        for i, pattern in enumerate(patterns, 1):
            print(f"\n  {i}. {pattern.pattern_type.upper()} (Significance: {pattern.significance})")
            print(f"     {pattern.description}")


async def example_data_quality():
    """Example 3: Data quality assessment"""
    print("\n\n✅ Example 3: Data Quality Assessment")
    print("=" * 60)

    # Create intentionally flawed data
    flawed_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Complete Restaurant"},
                "geometry": {"type": "Point", "coordinates": [19.9370, 50.0619]}
            },
            {
                "type": "Feature",
                "properties": {},  # Missing properties
                "geometry": {"type": "Point", "coordinates": [19.9345, 50.0616]}
            },
            {
                "type": "Feature",
                "properties": {"name": "Bad Coordinates"},
                "geometry": {"type": "Point", "coordinates": [999, 999]}  # Invalid coords
            }
        ]
    }

    async for session in create_mcp_client():
        agent = create_agent(session)

        result = await agent.run(
            f"""Assess the quality of this GeoJSON data:
{json.dumps(flawed_data, indent=2)}

Check for:
- Coordinate validity
- Property completeness
- Data consistency
- Best practices""",
            result_type=DataQualityReport
        )

        report = result.data
        print(f"\n📊 Quality Report:")
        print(f"  Valid: {'✅' if report.is_valid else '❌'}")
        print(f"  Completeness: {report.completeness_score:.1%}")

        if report.issues:
            print(f"\n⚠️  Issues Found:")
            for issue in report.issues:
                print(f"  • {issue}")

        if report.recommendations:
            print(f"\n💡 Recommendations:")
            for rec in report.recommendations:
                print(f"  • {rec}")


async def example_visualization():
    """Example 4: Generate visualization recommendations"""
    print("\n\n🎨 Example 4: Visualization Recommendations")
    print("=" * 60)

    class VisualizationPlan(BaseModel):
        """Plan for visualizing GeoJSON data"""
        style_recommendation: str = Field(description="Which Mapbox style to use")
        color_scheme: dict = Field(description="Suggested colors for features")
        layer_order: List[str] = Field(description="Order to render layers")
        interaction_points: List[str] = Field(description="Interactive elements to add")

    async for session in create_mcp_client():
        agent = create_agent(session)

        combined_data = {
            "type": "FeatureCollection",
            "features": RESTAURANT_LOCATIONS["features"] + DELIVERY_ROUTES["features"]
        }

        result = await agent.run(
            f"""Create a visualization plan for this delivery app data:
{json.dumps(combined_data, indent=2)}

Design an effective map that shows both restaurants and delivery routes.
Consider color coding, layering, and interactivity.""",
            result_type=VisualizationPlan
        )

        plan = result.data
        print(f"\n🎨 Visualization Plan:")
        print(f"\n  Style: {plan.style_recommendation}")
        print(f"\n  Color Scheme:")
        for feature_type, color in plan.color_scheme.items():
            print(f"    • {feature_type}: {color}")
        print(f"\n  Layer Order:")
        for i, layer in enumerate(plan.layer_order, 1):
            print(f"    {i}. {layer}")
        print(f"\n  Interactive Elements:")
        for element in plan.interaction_points:
            print(f"    • {element}")


async def example_preview_and_analyze():
    """Example 5: Preview on map and analyze together"""
    print("\n\n🗺️  Example 5: Preview and Analyze")
    print("=" * 60)

    async for session in create_mcp_client():
        agent = create_agent(session)

        # Combine datasets
        combined = {
            "type": "FeatureCollection",
            "features": RESTAURANT_LOCATIONS["features"] + DELIVERY_ROUTES["features"]
        }

        result = await agent.run(
            f"""Show this data on a map AND provide analysis:
{json.dumps(combined, indent=2)}

1. Preview it visually
2. Analyze the spatial relationship between restaurants and routes
3. Identify any optimization opportunities
4. Suggest improvements for delivery efficiency""",
        )

        print(f"\n📝 Analysis:\n{result.data}")
        print(f"\n💡 If using an MCP-UI client, you'll see an interactive map preview!")


async def main():
    """Run all examples"""
    try:
        print("\n🚀 Mapbox MCP DevKit - GeoJSON Analyzer (Pydantic AI)\n")

        # Check environment
        if not os.getenv("MAPBOX_ACCESS_TOKEN"):
            raise ValueError("MAPBOX_ACCESS_TOKEN required")
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY required")

        # Run examples
        await example_basic_analysis()
        await example_pattern_detection()
        await example_data_quality()
        await example_visualization()
        await example_preview_and_analyze()

        print("\n\n✅ All GeoJSON analysis examples completed!\n")
        print("💡 These examples demonstrate type-safe geospatial analysis")
        print("   with validated, structured outputs using Pydantic AI.\n")

    except Exception as error:
        print(f"\n❌ Error: {error}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
