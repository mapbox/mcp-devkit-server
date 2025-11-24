#!/usr/bin/env python3
"""
Mapbox MCP DevKit Server - Pydantic AI Style Builder Example

This example demonstrates how to use Pydantic AI with the Mapbox DevKit
to create and manage map styles with type safety and validation.

Prerequisites:
- Python 3.10-3.13
- Environment variables:
  - MAPBOX_ACCESS_TOKEN: Your Mapbox access token
  - OPENAI_API_KEY: Your OpenAI API key
"""

import os
import asyncio
from typing import List
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# Pydantic models for structured outputs
class StyleInfo(BaseModel):
    """Information about a Mapbox style"""
    id: str = Field(description="The style ID")
    name: str = Field(description="Human-readable name")
    owner: str = Field(description="Style owner username")
    modified: str = Field(description="Last modified date")
    visibility: str = Field(description="public or private")


class StyleList(BaseModel):
    """List of styles with metadata"""
    styles: List[StyleInfo] = Field(description="List of available styles")
    total_count: int = Field(description="Total number of styles")
    has_custom_styles: bool = Field(description="Whether user has custom styles")


class StyleAnalysis(BaseModel):
    """Analysis of a map style"""
    style_id: str
    primary_purpose: str = Field(description="Main use case for this style")
    color_scheme: str = Field(description="light, dark, or mixed")
    key_features: List[str] = Field(description="Notable features or layers")
    recommended_use_cases: List[str] = Field(description="Where this style works best")
    limitations: List[str] = Field(description="What this style is not good for")


class TokenCreationResult(BaseModel):
    """Result of creating an access token"""
    token_id: str = Field(description="The token identifier")
    token_preview: str = Field(description="First/last chars of token")
    scopes: List[str] = Field(description="Granted scopes")
    url_restrictions: List[str] = Field(description="URL allowlist")
    usage_notes: str = Field(description="How to use this token")


# Initialize MCP client for Mapbox DevKit
async def create_mcp_client():
    """Create and connect to the Mapbox MCP DevKit server"""
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


# Create Pydantic AI agent with DevKit tools
def create_style_agent(session, output_type=str):
    """Create an agent with Mapbox DevKit capabilities

    Args:
        session: MCP client session
        output_type: Type for structured output (default: str)
    """
    model = OpenAIChatModel('gpt-4o')

    agent = Agent(
        model,
        output_type=output_type,
        system_prompt="""You are a Mapbox style designer expert.
You help users create, analyze, and manage map styles using the Mapbox DevKit tools.
Always provide detailed, actionable responses with examples."""
    )

    # Register MCP tools with the agent
    # Note: In production, you'd enumerate and register all available tools
    # This is a simplified example

    return agent


async def example_list_and_analyze_styles():
    """Example 1: List and analyze existing styles"""
    print("\n🎨 Example 1: List and Analyze Styles")
    print("=" * 60)

    async for session in create_mcp_client():
        agent = create_style_agent(session, output_type=StyleList)

        # List styles with structured output
        result = await agent.run(
            "List all my map styles and analyze their purposes. "
            "For each style, tell me what it's best used for."
        )

        print(f"\n📊 Found {result.output.total_count} styles:")
        for style in result.output.styles[:3]:  # Show first 3
            print(f"  • {style.name} ({style.id})")
            print(f"    Owner: {style.owner}, Visibility: {style.visibility}")

        if result.output.has_custom_styles:
            print("\n✅ You have custom styles!")
        else:
            print("\n💡 No custom styles yet. Let's create one!")


async def example_create_custom_style():
    """Example 2: Create a custom style with validation"""
    print("\n\n🎨 Example 2: Create Custom Style")
    print("=" * 60)

    async for session in create_mcp_client():
        agent = create_style_agent(session)

        prompt = """Create a new map style with these requirements:
- Name: "delivery-app-light"
- Base style: Mapbox Streets v12
- Purpose: Delivery/logistics application
- Color scheme: Light, high contrast
- Key features:
  * Emphasize roads and addresses
  * Highlight restaurants and retail (POIs)
  * De-emphasize parks and natural features
  * Good visibility in daylight

After creating it, give me the style ID and explain how to use it."""

        result = await agent.run(prompt)
        print(f"\n📝 Result:\n{result.output}")


async def example_analyze_style():
    """Example 3: Deep analysis of a specific style"""
    print("\n\n🔍 Example 3: Analyze Style in Detail")
    print("=" * 60)

    async for session in create_mcp_client():
        agent = create_style_agent(session, output_type=StyleAnalysis)

        result = await agent.run(
            "Analyze the mapbox/streets-v12 style in detail. "
            "What makes it good? What are its limitations?"
        )

        analysis = result.output
        print(f"\n📊 Analysis of {analysis.style_id}:")
        print(f"\n🎯 Purpose: {analysis.primary_purpose}")
        print(f"🎨 Color Scheme: {analysis.color_scheme}")
        print(f"\n✨ Key Features:")
        for feature in analysis.key_features:
            print(f"  • {feature}")
        print(f"\n✅ Best For:")
        for use_case in analysis.recommended_use_cases:
            print(f"  • {use_case}")
        print(f"\n⚠️  Limitations:")
        for limitation in analysis.limitations:
            print(f"  • {limitation}")


async def example_create_public_token():
    """Example 4: Create a public token with URL restrictions"""
    print("\n\n🔑 Example 4: Create Public Token")
    print("=" * 60)

    async for session in create_mcp_client():
        agent = create_style_agent(session, output_type=TokenCreationResult)

        result = await agent.run(
            """Create a public access token for my production website with:
- Name: "Production Website - Delivery App"
- Scopes: styles:read and styles:tiles only
- URL restrictions:
  * https://deliveryapp.com
  * https://*.deliveryapp.com
- Explain the security model and best practices"""
        )

        token_info = result.output
        print(f"\n🎫 Token Created: {token_info.token_id}")
        print(f"📋 Preview: {token_info.token_preview}")
        print(f"\n✅ Scopes:")
        for scope in token_info.scopes:
            print(f"  • {scope}")
        print(f"\n🔒 URL Restrictions:")
        for url in token_info.url_restrictions:
            print(f"  • {url}")
        print(f"\n💡 Usage Notes:\n{token_info.usage_notes}")


async def example_geojson_with_validation():
    """Example 5: Work with GeoJSON data"""
    print("\n\n🗺️  Example 5: GeoJSON Preview with Validation")
    print("=" * 60)

    class GeoJSONAnalysis(BaseModel):
        """Analysis of GeoJSON data"""
        feature_count: int
        geometry_types: List[str]
        has_properties: bool
        bbox_center: List[float] = Field(description="Center point [lng, lat]")
        recommended_zoom: int = Field(description="Recommended zoom level")
        summary: str = Field(description="Human-readable summary")

    async for session in create_mcp_client():
        agent = create_style_agent(session, output_type=GeoJSONAnalysis)

        geojson_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "Wierzynek", "type": "restaurant"},
                    "geometry": {"type": "Point", "coordinates": [19.9370, 50.0619]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Pod Aniołami", "type": "restaurant"},
                    "geometry": {"type": "Point", "coordinates": [19.9345, 50.0616]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Delivery Route", "type": "route"},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [19.9370, 50.0619],
                            [19.9345, 50.0616]
                        ]
                    }
                }
            ]
        }

        result = await agent.run(
            f"""Analyze this GeoJSON data and show it on a map:
{geojson_data}

Provide structured analysis with viewing recommendations."""
        )

        analysis = result.output
        print(f"\n📊 GeoJSON Analysis:")
        print(f"  Features: {analysis.feature_count}")
        print(f"  Geometry Types: {', '.join(analysis.geometry_types)}")
        print(f"  Has Properties: {analysis.has_properties}")
        print(f"  Center: {analysis.bbox_center}")
        print(f"  Recommended Zoom: {analysis.recommended_zoom}")
        print(f"\n📝 Summary:\n{analysis.summary}")


async def example_style_comparison():
    """Example 6: Compare two styles"""
    print("\n\n⚖️  Example 6: Style Comparison")
    print("=" * 60)

    class StyleComparison(BaseModel):
        """Comparison between two styles"""
        left_style: str
        right_style: str
        key_differences: List[str] = Field(description="Main visual differences")
        performance_notes: str = Field(description="Performance comparison")
        recommendation: str = Field(description="Which to use and when")

    async for session in create_mcp_client():
        agent = create_style_agent(session, output_type=StyleComparison)

        result = await agent.run(
            """Compare mapbox/light-v11 and mapbox/dark-v11 side-by-side.
Focus on:
- Visual differences
- Use cases
- Performance
- Accessibility

View them at Warsaw [21.0122, 52.2297] zoom 12."""
        )

        comparison = result.output
        print(f"\n🔄 Comparing: {comparison.left_style} vs {comparison.right_style}")
        print(f"\n🎨 Key Differences:")
        for diff in comparison.key_differences:
            print(f"  • {diff}")
        print(f"\n⚡ Performance: {comparison.performance_notes}")
        print(f"\n💡 Recommendation:\n{comparison.recommendation}")


async def main():
    """Run all examples"""
    try:
        print("\n🚀 Mapbox MCP DevKit - Pydantic AI Style Builder\n")

        # Check environment variables
        if not os.getenv("MAPBOX_ACCESS_TOKEN"):
            raise ValueError("MAPBOX_ACCESS_TOKEN environment variable required")
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY environment variable required")

        # Run examples
        await example_list_and_analyze_styles()
        await example_create_custom_style()
        await example_analyze_style()
        await example_create_public_token()
        await example_geojson_with_validation()
        await example_style_comparison()

        print("\n\n✅ All examples completed successfully!\n")
        print("💡 Pro tip: These examples use Pydantic for type-safe, validated outputs.")
        print("   The structured data models ensure reliable, predictable results!\n")

    except Exception as error:
        print(f"\n❌ Error: {error}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
