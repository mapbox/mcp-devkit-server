#!/usr/bin/env python3
"""
Mapbox MCP DevKit Server - CrewAI Style Designer Crew

This example demonstrates a multi-agent crew that collaborates to design,
validate, and document custom Mapbox styles.

Agents:
- Style Designer: Creates and modifies map styles
- Quality Validator: Reviews styles for best practices
- Documentation Writer: Creates usage documentation

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


# MCP Tools wrapper for CrewAI
class MapboxMCPTools:
    """Wrapper for Mapbox MCP DevKit tools"""

    def __init__(self):
        self.session = None
        self._tools_cache = None

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

        # This is a simplified connection - in production you'd handle this better
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
        """Call an MCP tool and return results"""
        if not self.session:
            await self.connect()

        try:
            result = await self.session.call_tool(tool_name, arguments)
            # Convert MCP content to string
            if hasattr(result, 'content') and isinstance(result.content, list):
                content_parts = []
                for item in result.content:
                    # Check for error responses
                    if hasattr(item, 'isError') and item.isError:
                        error_text = getattr(item, 'text', 'Unknown error')
                        raise ValueError(f"Tool returned error: {error_text}")

                    if hasattr(item, 'text'):
                        content_parts.append(item.text)
                    else:
                        content_parts.append(str(item))
                return '\n'.join(content_parts) if content_parts else ""
            return str(result)
        except Exception as e:
            error_msg = f"Error calling {tool_name}: {str(e)}"
            print(f"❌ {error_msg}")
            return error_msg


# Global MCP tools instance
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


# CrewAI tool decorators for Mapbox DevKit
@tool("List Styles")
def list_styles_tool() -> str:
    """List all Mapbox styles for the authenticated user."""
    return run_async_tool("list_styles_tool", {})


@tool("Create Style")
def create_style_tool(name: str, base_style: str = "streets-v12") -> str:
    """
    Create a new Mapbox style using the style builder.

    Args:
        name: Name for the new style
        base_style: Base style to start from. Options: standard, streets-v12, light-v11,
                   dark-v11, satellite-v9, satellite-streets-v12, outdoors-v12,
                   navigation-day-v1, navigation-night-v1 (default: streets-v12)
    """
    import re
    import json

    # Remove mapbox/ prefix if present
    base_style_clean = base_style.replace("mapbox/", "")

    # Step 1: Build the style JSON
    builder_result = run_async_tool("style_builder_tool", {
        "style_name": name,
        "base_style": base_style_clean,
        "layers": []  # Empty layers - creates basic style from base
    })

    # Step 2: Extract the JSON from the response and create the style
    try:
        # Find JSON in markdown code block
        json_match = re.search(r'```json\n(.*?)\n```', builder_result, re.DOTALL)
        if not json_match:
            return f"Error: Could not parse style JSON from builder response. Response was:\n{builder_result[:500]}"

        style_json_str = json_match.group(1)
        style_json = json.loads(style_json_str)

        # Create the actual style
        create_result = run_async_tool("create_style_tool", {
            "name": name,
            "style": style_json
        })

        return create_result

    except Exception as e:
        return f"Error creating style: {str(e)}\n\nBuilder result was:\n{builder_result[:500]}"


@tool("Retrieve Style")
def retrieve_style_tool(style_id: str) -> str:
    """
    Get detailed information about a specific style.

    Args:
        style_id: The style ID (e.g., username/style-id)
    """
    return run_async_tool("retrieve_style_tool", {
        "styleId": style_id
    })


@tool("Style Comparison")
def style_comparison_tool(
    left_style_id: str,
    right_style_id: str,
    longitude: float,
    latitude: float,
    zoom: int
) -> str:
    """
    Compare two styles side-by-side.

    Args:
        left_style_id: First style to compare
        right_style_id: Second style to compare
        longitude: Center longitude
        latitude: Center latitude
        zoom: Zoom level (0-22)
    """
    return run_async_tool("style_comparison_tool", {
        "leftStyleId": left_style_id,
        "rightStyleId": right_style_id,
        "longitude": longitude,
        "latitude": latitude,
        "zoom": zoom
    })


@tool("Preview GeoJSON")
def geojson_preview_tool(geojson: str) -> str:
    """
    Preview GeoJSON data on a map.

    Args:
        geojson: GeoJSON data as a JSON string
    """
    return run_async_tool("geojson_preview_tool", {
        "geojson": geojson
    })


# Define Agents
def create_style_designer_agent():
    """Agent responsible for creating and modifying styles"""
    return Agent(
        role="Mapbox Style Designer",
        goal="Create beautiful, functional map styles that meet user requirements",
        backstory="""You are an expert cartographer and designer with years of
        experience creating map styles. You understand color theory, visual hierarchy,
        and how to make maps that are both beautiful and functional. You know the
        Mapbox style specification inside and out.""",
        tools=[list_styles_tool, create_style_tool, retrieve_style_tool],
        verbose=True,
        allow_delegation=False
    )


def create_quality_validator_agent():
    """Agent responsible for validating style quality"""
    return Agent(
        role="Style Quality Validator",
        goal="Ensure map styles follow best practices and meet quality standards",
        backstory="""You are a meticulous quality assurance expert specializing in
        map design. You check for accessibility issues, performance problems, and
        adherence to cartographic best practices. You provide constructive feedback
        to improve styles.""",
        tools=[retrieve_style_tool, style_comparison_tool],
        verbose=True,
        allow_delegation=False
    )


def create_documentation_writer_agent():
    """Agent responsible for documenting styles"""
    return Agent(
        role="Technical Documentation Writer",
        goal="Create clear, comprehensive documentation for map styles",
        backstory="""You are a technical writer who specializes in API documentation
        and developer guides. You can explain complex concepts simply and provide
        practical examples that help developers use map styles effectively.""",
        tools=[retrieve_style_tool],
        verbose=True,
        allow_delegation=False
    )


# Define Tasks
def create_design_task(requirements: str):
    """Task: Design a new map style"""
    return Task(
        description=f"""Design a new Mapbox style based on these requirements:

{requirements}

Steps:
1. Analyze the requirements carefully
2. Choose an appropriate base style
3. Create the new style with a descriptive name
4. Document the style ID and key design decisions

Return the style ID and a summary of the design approach.""",
        agent=create_style_designer_agent(),
        expected_output="Style ID and design summary"
    )


def create_validation_task():
    """Task: Validate the created style"""
    return Task(
        description="""Review the style created by the designer:

1. Retrieve the style details
2. Check for common issues:
   - Color contrast and accessibility
   - Visual hierarchy
   - Performance considerations
   - Adherence to cartographic principles
3. Compare with a similar Mapbox built-in style
4. Provide specific feedback and suggestions

Return a quality report with pass/fail and recommendations.""",
        agent=create_quality_validator_agent(),
        expected_output="Quality validation report"
    )


def create_documentation_task():
    """Task: Document the style"""
    return Task(
        description="""Create comprehensive documentation for the new style:

1. Retrieve the final style details
2. Write documentation including:
   - Style overview and purpose
   - Key features and customizations
   - Recommended use cases
   - Code examples for integration
   - Best practices for using this style
3. Format as markdown

Return complete documentation in markdown format.""",
        agent=create_documentation_writer_agent(),
        expected_output="Complete markdown documentation"
    )


# Main execution
async def run_style_designer_crew(requirements: str):
    """Run the style designer crew"""

    print("\n🚀 Starting Style Designer Crew")
    print("=" * 60)
    print(f"\n📋 Requirements:\n{requirements}\n")

    # Connect to MCP
    await mcp_tools.connect()

    try:
        # Create the crew
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

        # Execute the crew
        result = crew.kickoff()

        print("\n\n✅ Crew Execution Complete!")
        print("=" * 60)
        print("\n📄 Final Output:\n")
        print(result)

        return result

    finally:
        await mcp_tools.disconnect()


# Example scenarios
async def example_delivery_app_style():
    """Example: Create a style for a delivery app"""
    requirements = """
Create a map style for a food delivery application with these specifications:

**Purpose**: Help delivery drivers navigate efficiently and customers track orders

**Visual Requirements**:
- Light color scheme for daytime visibility
- High contrast between roads and background
- Emphasis on:
  * Major roads and highways (bright, clear)
  * Restaurant locations (highly visible)
  * Address numbers (readable at street level)
  * Parking areas
- De-emphasize:
  * Parks and natural features
  * Water bodies
  * Tourist attractions

**Performance**:
- Fast rendering for mobile devices
- Optimized for frequent updates
- Works well at zoom levels 10-18

**Brand**:
- Professional and modern
- Trust-inspiring
- Not too playful or casual
"""

    return await run_style_designer_crew(requirements)


async def example_running_app_style():
    """Example: Create a style for a running/fitness app"""
    requirements = """
Create a map style for a running and fitness tracking application:

**Purpose**: Help runners plan routes and track workouts

**Visual Requirements**:
- Dark mode optimized (users often run early morning/evening)
- Emphasis on:
  * Running paths and trails (vibrant green)
  * Parks and open spaces (highlighted)
  * Elevation changes (if possible)
  * Water fountains and rest areas
  * Distance markers
- De-emphasize:
  * Buildings and urban clutter
  * Commercial areas
  * Detailed road networks (except major routes)

**Performance**:
- Battery efficient
- Smooth rendering during movement
- Works offline (caching friendly)

**Accessibility**:
- High contrast for outdoor viewing
- Large, readable labels
- Color blind friendly
"""

    return await run_style_designer_crew(requirements)


async def main():
    """Run examples"""
    try:
        print("\n🎨 Mapbox MCP DevKit - CrewAI Style Designer Examples\n")

        # Check environment
        if not os.getenv("MAPBOX_ACCESS_TOKEN"):
            raise ValueError("MAPBOX_ACCESS_TOKEN required")
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY required")

        # Choose example
        print("Select an example:")
        print("1. Delivery App Style")
        print("2. Running App Style")
        choice = input("\nEnter choice (1 or 2): ").strip()

        if choice == "1":
            await example_delivery_app_style()
        elif choice == "2":
            await example_running_app_style()
        else:
            print("Invalid choice, running Delivery App example...")
            await example_delivery_app_style()

        print("\n\n✅ Example completed successfully!")
        print("\n💡 The crew collaborated to design, validate, and document your style!")

    except Exception as error:
        print(f"\n❌ Error: {error}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
