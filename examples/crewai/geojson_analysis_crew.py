#!/usr/bin/env python3
"""
Mapbox MCP DevKit Server - CrewAI GeoJSON Analysis Crew

This example demonstrates a multi-agent crew that collaborates to analyze,
visualize, and report on GeoJSON spatial data.

Agents:
- Data Analyst: Analyzes GeoJSON structure and patterns
- Visualization Expert: Creates map visualizations
- Report Writer: Generates comprehensive reports

Prerequisites:
- Python 3.10-3.13
- Environment variables:
  - MAPBOX_ACCESS_TOKEN: Your Mapbox access token
  - OPENAI_API_KEY: Your OpenAI API key
"""

import os
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import asyncio
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# Reuse MCP connection from style_designer_crew
class MapboxMCPTools:
    """Wrapper for Mapbox MCP DevKit tools"""

    def __init__(self):
        self.session = None

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
        if hasattr(self, '_streams'):
            await self._connection.__aexit__(None, None, None)

    async def call_tool(self, tool_name: str, arguments: dict) -> str:
        """Call an MCP tool"""
        if not self.session:
            await self.connect()

        try:
            result = await self.session.call_tool(tool_name, arguments)
            # Convert MCP content to string
            if hasattr(result, 'content'):
                content_parts = []
                for item in result.content:
                    if hasattr(item, 'text'):
                        content_parts.append(item.text)
                    else:
                        content_parts.append(str(item))
                return '\n'.join(content_parts)
            return str(result)
        except Exception as e:
            error_msg = f"Error calling {tool_name}: {str(e)}"
            print(f"❌ {error_msg}")
            return error_msg


mcp_tools = MapboxMCPTools()


def run_async_tool(tool_name: str, arguments: dict) -> str:
    """Helper to run async MCP tools from sync CrewAI context"""
    try:
        # Try to get existing loop
        try:
            asyncio.get_running_loop()
            # If there's a running loop, we need to use run_in_executor
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    mcp_tools.call_tool(tool_name, arguments)
                )
                result = future.result()
        except RuntimeError:
            # No running loop, safe to use asyncio.run
            result = asyncio.run(mcp_tools.call_tool(tool_name, arguments))
        return result
    except Exception as e:
        error_msg = f"Tool execution error: {str(e)}"
        print(f"❌ {error_msg}")
        return error_msg


# CrewAI tools
@tool("Preview GeoJSON")
def geojson_preview_tool(geojson: str) -> str:
    """
    Preview GeoJSON data on a map.

    Args:
        geojson: GeoJSON data as a JSON string
    """
    return run_async_tool("geojson_preview_tool", {"geojson": geojson})


@tool("Get Bounding Box")
def bounding_box_tool(west: float, south: float, east: float, north: float) -> str:
    """
    Get information about a bounding box region.

    Args:
        west: Western longitude
        south: Southern latitude
        east: Eastern longitude
        north: Northern latitude
    """
    return run_async_tool("bounding_box_tool", {
        "west": west,
        "south": south,
        "east": east,
        "north": north
    })


@tool("Convert Coordinates")
def coordinate_conversion_tool(
    latitude: float,
    longitude: float,
    zoom: int,
    conversion_type: str = "latlng_to_tile"
) -> str:
    """
    Convert between coordinate systems.

    Args:
        latitude: Latitude
        longitude: Longitude
        zoom: Zoom level
        conversion_type: Type of conversion (latlng_to_tile, tile_to_latlng, etc.)
    """
    return run_async_tool("coordinate_conversion_tool", {
        "latitude": latitude,
        "longitude": longitude,
        "zoom": zoom,
        "conversionType": conversion_type
    })


# Define Agents
def create_data_analyst_agent():
    """Agent that analyzes spatial data"""
    return Agent(
        role="Spatial Data Analyst",
        goal="Analyze GeoJSON data to identify patterns, anomalies, and insights",
        backstory="""You are an expert in geospatial analysis with a background in
        GIS and data science. You can quickly identify spatial patterns, data quality
        issues, and meaningful insights from location data. You understand coordinate
        systems, projections, and spatial statistics.""",
        tools=[geojson_preview_tool, bounding_box_tool, coordinate_conversion_tool],
        verbose=True,
        allow_delegation=True
    )


def create_visualization_expert_agent():
    """Agent that creates visualizations"""
    return Agent(
        role="Map Visualization Expert",
        goal="Create effective map visualizations that communicate spatial insights",
        backstory="""You are a cartographer and data visualization specialist. You
        know how to present spatial data in ways that are both beautiful and
        informative. You understand color theory, visual hierarchy, and how to
        highlight important patterns in geospatial data.""",
        tools=[geojson_preview_tool],
        verbose=True,
        allow_delegation=False
    )


def create_report_writer_agent():
    """Agent that writes analysis reports"""
    return Agent(
        role="Geospatial Report Writer",
        goal="Create comprehensive, actionable reports on spatial data analysis",
        backstory="""You are a technical writer specializing in geospatial analysis
        reports. You can translate complex spatial findings into clear, actionable
        insights for decision makers. Your reports are well-structured, data-driven,
        and include practical recommendations.""",
        tools=[],
        verbose=True,
        allow_delegation=False
    )


# Define Tasks
def create_analysis_task(geojson_data: str, context: str):
    """Task: Analyze GeoJSON data"""
    return Task(
        description=f"""Analyze this GeoJSON data:

{geojson_data}

Context: {context}

Perform comprehensive analysis:
1. Data structure and quality
   - Feature count and types
   - Property completeness
   - Coordinate validity
2. Spatial patterns
   - Clustering or dispersion
   - Geographic coverage
   - Density analysis
3. Bounding box and extent
4. Key findings and anomalies

Return detailed analysis with specific observations.""",
        agent=create_data_analyst_agent(),
        expected_output="Comprehensive spatial analysis"
    )


def create_visualization_task():
    """Task: Create visualization"""
    return Task(
        description="""Based on the analysis, create an effective map visualization:

1. Preview the GeoJSON data on a map
2. Determine optimal view (center point, zoom level)
3. Suggest visual enhancements:
   - Color coding by properties
   - Symbol sizing
   - Label placement
   - Layer ordering
4. Identify which patterns should be emphasized

Return visualization recommendations and map preview details.""",
        agent=create_visualization_expert_agent(),
        expected_output="Visualization plan and map preview"
    )


def create_report_task():
    """Task: Write comprehensive report"""
    return Task(
        description="""Create a comprehensive analysis report:

1. Executive Summary
   - Key findings in 2-3 sentences
   - Main recommendations

2. Data Overview
   - Dataset description
   - Data quality assessment
   - Coverage and completeness

3. Spatial Analysis
   - Patterns identified
   - Statistical insights
   - Notable features

4. Visualization
   - Map presentation
   - Visual highlights
   - Interpretation guide

5. Recommendations
   - Actionable insights
   - Next steps
   - Potential use cases

Format as markdown with clear sections.""",
        agent=create_report_writer_agent(),
        expected_output="Complete analysis report in markdown"
    )


# Example datasets
DELIVERY_NETWORK = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "hub_id": "HUB-001",
                "name": "Centrum Distribution Center",
                "capacity": 500,
                "daily_deliveries": 450
            },
            "geometry": {"type": "Point", "coordinates": [21.0122, 52.2297]}
        },
        {
            "type": "Feature",
            "properties": {
                "hub_id": "HUB-002",
                "name": "Praga Warehouse",
                "capacity": 300,
                "daily_deliveries": 280
            },
            "geometry": {"type": "Point", "coordinates": [21.0322, 52.2497]}
        },
        {
            "type": "Feature",
            "properties": {
                "route_id": "R-001",
                "driver": "Anna",
                "deliveries": 25,
                "distance_km": 45
            },
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
            "properties": {
                "zone_id": "ZONE-A",
                "zone_name": "Śródmieście High Demand Area",
                "avg_orders_per_day": 150
            },
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

RETAIL_LOCATIONS = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "store_id": "S001",
                "name": "Złote Tarasy Store",
                "revenue_2024": 1200000,
                "foot_traffic": "high",
                "employees": 15
            },
            "geometry": {"type": "Point", "coordinates": [21.0122, 52.2297]}
        },
        {
            "type": "Feature",
            "properties": {
                "store_id": "S002",
                "name": "Nowy Świat Store",
                "revenue_2024": 950000,
                "foot_traffic": "medium",
                "employees": 12
            },
            "geometry": {"type": "Point", "coordinates": [21.0180, 52.2350]}
        },
        {
            "type": "Feature",
            "properties": {
                "store_id": "S003",
                "name": "Praga Store",
                "revenue_2024": 800000,
                "foot_traffic": "medium",
                "employees": 10
            },
            "geometry": {"type": "Point", "coordinates": [21.0500, 52.2480]}
        }
    ]
}


# Main execution
async def run_geojson_crew(geojson_data: dict, context: str):
    """Run the GeoJSON analysis crew"""

    print("\n🚀 Starting GeoJSON Analysis Crew")
    print("=" * 60)
    print(f"\n📋 Context: {context}\n")

    await mcp_tools.connect()

    try:
        crew = Crew(
            agents=[
                create_data_analyst_agent(),
                create_visualization_expert_agent(),
                create_report_writer_agent()
            ],
            tasks=[
                create_analysis_task(json.dumps(geojson_data, indent=2), context),
                create_visualization_task(),
                create_report_task()
            ],
            process=Process.sequential,
            verbose=True
        )

        result = crew.kickoff()

        print("\n\n✅ Crew Analysis Complete!")
        print("=" * 60)
        print("\n📄 Final Report:\n")
        print(result)

        return result

    finally:
        await mcp_tools.disconnect()


async def main():
    """Run examples"""
    try:
        print("\n🗺️  Mapbox MCP DevKit - CrewAI GeoJSON Analysis Examples\n")

        if not os.getenv("MAPBOX_ACCESS_TOKEN"):
            raise ValueError("MAPBOX_ACCESS_TOKEN required")
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY required")

        print("Select an example:")
        print("1. Delivery Network Analysis")
        print("2. Retail Location Analysis")
        choice = input("\nEnter choice (1 or 2): ").strip()

        if choice == "1":
            await run_geojson_crew(
                DELIVERY_NETWORK,
                "Analyze our delivery network efficiency. Identify coverage gaps, "
                "route optimization opportunities, and capacity constraints."
            )
        elif choice == "2":
            await run_geojson_crew(
                RETAIL_LOCATIONS,
                "Analyze retail store locations for expansion planning. Identify "
                "high-performing areas and potential new locations."
            )
        else:
            print("Invalid choice, running Delivery Network example...")
            await run_geojson_crew(DELIVERY_NETWORK, "Delivery network analysis")

        print("\n\n✅ Analysis complete!")
        print("\n💡 The crew collaborated to analyze, visualize, and report on your data!")

    except Exception as error:
        print(f"\n❌ Error: {error}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
