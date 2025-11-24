#!/usr/bin/env python3
"""
Mapbox MCP DevKit Server - LangGraph Style Workflow Example

This example demonstrates using LangGraph to create a stateful workflow
for iterative style design with conditional routing and state management.

Prerequisites:
- Python 3.10-3.13
- Environment variables:
  - MAPBOX_ACCESS_TOKEN: Your Mapbox access token
  - OPENAI_API_KEY: Your OpenAI API key
"""

import os
import json
import re
import asyncio
from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# State definition for the workflow
class StyleWorkflowState(TypedDict):
    """State for the style design workflow"""
    requirements: str
    existing_styles: list
    style_analysis: str
    created_style_id: str
    validation_result: str
    validation_passed: bool
    iteration_count: int
    final_style: dict
    error: str | None


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

        # Handle MCP response format
        if hasattr(result, 'content') and isinstance(result.content, list):
            if len(result.content) == 0:
                raise ValueError(f"Tool {tool_name} returned empty content")

            content_item = result.content[0]

            # Check if it's an error response
            if hasattr(content_item, 'isError') and content_item.isError:
                error_text = getattr(content_item, 'text', 'Unknown error')
                raise ValueError(f"Tool {tool_name} failed: {error_text}")

            # Extract text content
            if hasattr(content_item, 'text'):
                text = content_item.text
                if not text or text.strip() == "":
                    raise ValueError(f"Tool {tool_name} returned empty text")

                # Try to parse as JSON
                try:
                    return json.loads(text)
                except json.JSONDecodeError as e:
                    # If not JSON, return as plain text in a dict
                    return {"result": text}

        # Fallback for unexpected response format
        return {"result": str(result)}


# Global MCP client
mcp_client = MapboxMCPClient()


# LLM setup
llm = ChatOpenAI(model="gpt-4o", temperature=0.7)


# Workflow nodes
async def analyze_requirements_node(state: StyleWorkflowState) -> StyleWorkflowState:
    """Analyze requirements and existing styles"""
    print("\n📋 Analyzing requirements...")

    # List existing styles
    try:
        styles_result = await mcp_client.call_tool("list_styles_tool", {})
        state["existing_styles"] = styles_result.get("styles", [])
    except Exception as e:
        state["existing_styles"] = []
        print(f"⚠️  Could not fetch existing styles: {e}")

    # Use LLM to analyze requirements
    messages = [
        SystemMessage(content="""You are a Mapbox style design expert.
Analyze the user's requirements and recommend an appropriate base style."""),
        HumanMessage(content=f"""Requirements: {state['requirements']}

Available base styles:
- streets-v12 (or mapbox/streets-v12): General purpose street map
- light-v11 (or mapbox/light-v11): Light, minimal style
- dark-v11 (or mapbox/dark-v11): Dark mode style
- outdoors-v12 (or mapbox/outdoors-v12): Emphasizes natural features
- satellite-v9 (or mapbox/satellite-v9): Satellite imagery base

Analyze the requirements and recommend the best base style and key customizations needed.""")
    ]

    response = await llm.ainvoke(messages)
    state["style_analysis"] = response.content

    print(f"✅ Analysis complete")
    print(f"   {state['style_analysis'][:200]}...")

    return state


async def create_style_node(state: StyleWorkflowState) -> StyleWorkflowState:
    """Create a new style based on analysis"""
    print("\n🎨 Creating style...")

    # Extract base style recommendation from analysis
    messages = [
        SystemMessage(content="Extract the recommended base style from the analysis."),
        HumanMessage(content=f"""Analysis: {state['style_analysis']}

Return ONLY the base style ID (e.g., streets-v12 or mapbox/streets-v12) without any explanation or additional text.""")
    ]

    response = await llm.ainvoke(messages)
    base_style = response.content.strip()

    # Map base style to style_builder_tool format (remove mapbox/ prefix)
    valid_styles = {
        "mapbox/streets-v12": "streets-v12",
        "mapbox/light-v11": "light-v11",
        "mapbox/dark-v11": "dark-v11",
        "mapbox/outdoors-v12": "outdoors-v12",
        "mapbox/satellite-v9": "satellite-v9"
    }

    # Clean up base_style (remove mapbox/ if present)
    base_style_clean = base_style.replace("mapbox/", "")

    # Validate and default to streets-v12
    if base_style_clean not in valid_styles.values():
        base_style_clean = "streets-v12"

    # Generate style name
    iteration = state.get("iteration_count", 0)
    style_name = f"LangGraph Style v{iteration + 1}"

    # Create style via MCP using two-step process:
    # 1. Build the style JSON with style_builder_tool
    # 2. Create the style with create_style_tool
    try:
        # Step 1: Generate style JSON
        builder_result = await mcp_client.call_tool("style_builder_tool", {
            "style_name": style_name,
            "base_style": base_style_clean,
            "layers": []  # Empty layers array - creates basic style from base
        })

        # Extract JSON from the response (it's in a markdown code block)
        result_text = builder_result.get("result", "")
        if isinstance(result_text, dict):
            result_text = json.dumps(result_text)

        # Find JSON in code block
        json_match = re.search(r'```json\n(.*?)\n```', result_text, re.DOTALL)
        if not json_match:
            raise ValueError("Could not find style JSON in builder response")

        style_json = json.loads(json_match.group(1))

        # Step 2: Create the style
        create_result = await mcp_client.call_tool("create_style_tool", {
            "name": style_name,
            "style": style_json
        })

        state["created_style_id"] = create_result.get("id", "")
        state["iteration_count"] = iteration + 1

        print(f"✅ Style created: {state['created_style_id']}")

    except Exception as e:
        state["error"] = f"Failed to create style: {e}"
        print(f"❌ Error: {state['error']}")

    return state


async def validate_style_node(state: StyleWorkflowState) -> StyleWorkflowState:
    """Validate the created style"""
    print("\n✅ Validating style...")

    if not state.get("created_style_id"):
        state["validation_passed"] = False
        state["validation_result"] = "No style created to validate"
        return state

    # Retrieve style details
    try:
        style_data = await mcp_client.call_tool("retrieve_style_tool", {
            "styleId": state["created_style_id"]
        })

        # Use LLM to validate style
        messages = [
            SystemMessage(content="""You are a style quality validator.
Check if the style meets the requirements and follows best practices.
Provide specific, actionable feedback."""),
            HumanMessage(content=f"""Requirements: {state['requirements']}

Analysis: {state['style_analysis']}

Style Data: {json.dumps(style_data, indent=2)[:1000]}

Does this style meet the requirements? Provide a PASS/FAIL verdict and specific feedback.""")
        ]

        response = await llm.ainvoke(messages)
        validation_text = response.content

        state["validation_result"] = validation_text
        state["validation_passed"] = "PASS" in validation_text.upper()

        print(f"   Result: {'✅ PASSED' if state['validation_passed'] else '❌ FAILED'}")
        print(f"   {validation_text[:200]}...")

        if state["validation_passed"]:
            state["final_style"] = style_data

    except Exception as e:
        state["validation_passed"] = False
        state["validation_result"] = f"Validation error: {e}"
        print(f"❌ Error: {e}")

    return state


async def finalize_style_node(state: StyleWorkflowState) -> StyleWorkflowState:
    """Finalize and document the style"""
    print("\n📄 Finalizing style...")

    # Generate documentation
    messages = [
        SystemMessage(content="You are a technical documentation writer for map styles."),
        HumanMessage(content=f"""Create brief documentation for this style:

Style ID: {state['created_style_id']}
Requirements: {state['requirements']}
Validation: {state['validation_result']}

Provide:
1. Style overview (2-3 sentences)
2. Key features (3-4 bullet points)
3. Recommended use cases
4. Quick integration example""")
    ]

    response = await llm.ainvoke(messages)

    print("\n" + "=" * 60)
    print("📄 Style Documentation")
    print("=" * 60)
    print(response.content)

    return state


def should_retry(state: StyleWorkflowState) -> Literal["retry", "finalize", "error"]:
    """Determine if workflow should retry or finalize"""
    # Check for errors
    if state.get("error"):
        return "error"

    # Check validation result
    if state.get("validation_passed"):
        return "finalize"

    # Check iteration limit
    if state.get("iteration_count", 0) >= 3:
        print("\n⚠️  Max iterations reached, finalizing...")
        return "finalize"

    # Retry
    print("\n🔄 Validation failed, retrying...")
    return "retry"


# Build the workflow graph
def create_workflow() -> StateGraph:
    """Create the LangGraph workflow"""
    workflow = StateGraph(StyleWorkflowState)

    # Add nodes
    workflow.add_node("analyze", analyze_requirements_node)
    workflow.add_node("create", create_style_node)
    workflow.add_node("validate", validate_style_node)
    workflow.add_node("finalize", finalize_style_node)

    # Add edges
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "create")
    workflow.add_edge("create", "validate")

    # Conditional routing from validate
    workflow.add_conditional_edges(
        "validate",
        should_retry,
        {
            "retry": "create",  # Loop back to create
            "finalize": "finalize",
            "error": END
        }
    )

    workflow.add_edge("finalize", END)

    return workflow.compile()


# Example scenarios
async def example_delivery_app():
    """Example: Design style for delivery app"""
    print("\n🚀 LangGraph Style Workflow - Delivery App")
    print("=" * 60)

    requirements = """
Create a map style for a food delivery application:

**Purpose**: Help delivery drivers navigate efficiently

**Requirements**:
- Light, high-contrast color scheme
- Emphasize major roads and highways
- Highlight restaurant locations
- Clear address numbers
- De-emphasize parks and water features
- Optimized for mobile devices
"""

    await mcp_client.connect()

    try:
        # Create and run workflow
        app = create_workflow()

        initial_state: StyleWorkflowState = {
            "requirements": requirements,
            "existing_styles": [],
            "style_analysis": "",
            "created_style_id": "",
            "validation_result": "",
            "validation_passed": False,
            "iteration_count": 0,
            "final_style": {},
            "error": None
        }

        # Execute workflow
        final_state = await app.ainvoke(initial_state)

        print("\n" + "=" * 60)
        print("✅ Workflow Complete!")
        print("=" * 60)
        print(f"Final Style ID: {final_state.get('created_style_id', 'N/A')}")
        print(f"Iterations: {final_state.get('iteration_count', 0)}")
        print(f"Status: {'✅ Validated' if final_state.get('validation_passed') else '⚠️  Needs Review'}")

    finally:
        await mcp_client.disconnect()


async def example_running_app():
    """Example: Design style for running app"""
    print("\n🚀 LangGraph Style Workflow - Running App")
    print("=" * 60)

    requirements = """
Create a map style for a running/fitness tracking application:

**Purpose**: Help runners plan routes and track workouts

**Requirements**:
- Dark mode optimized
- Emphasize running paths and trails (vibrant green)
- Highlight parks and open spaces
- Show elevation changes if possible
- De-emphasize buildings and commercial areas
- Battery efficient rendering
- High contrast for outdoor viewing
"""

    await mcp_client.connect()

    try:
        app = create_workflow()

        initial_state: StyleWorkflowState = {
            "requirements": requirements,
            "existing_styles": [],
            "style_analysis": "",
            "created_style_id": "",
            "validation_result": "",
            "validation_passed": False,
            "iteration_count": 0,
            "final_style": {},
            "error": None
        }

        final_state = await app.ainvoke(initial_state)

        print("\n" + "=" * 60)
        print("✅ Workflow Complete!")
        print("=" * 60)
        print(f"Final Style ID: {final_state.get('created_style_id', 'N/A')}")
        print(f"Iterations: {final_state.get('iteration_count', 0)}")
        print(f"Status: {'✅ Validated' if final_state.get('validation_passed') else '⚠️  Needs Review'}")

    finally:
        await mcp_client.disconnect()


async def main():
    """Run examples"""
    try:
        print("\n🗺️  Mapbox MCP DevKit - LangGraph Style Workflow Examples\n")

        # Check environment
        if not os.getenv("MAPBOX_ACCESS_TOKEN"):
            raise ValueError("MAPBOX_ACCESS_TOKEN required")
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY required")

        print("Select an example:")
        print("1. Delivery App Style")
        print("2. Running App Style")
        choice = input("\nEnter choice (1 or 2): ").strip()

        if choice == "1":
            await example_delivery_app()
        elif choice == "2":
            await example_running_app()
        else:
            print("Invalid choice, running Delivery App example...")
            await example_delivery_app()

        print("\n\n✅ Example completed successfully!")
        print("\n💡 This workflow demonstrated:")
        print("   • Stateful workflow with LangGraph")
        print("   • Conditional routing (retry on validation failure)")
        print("   • Multi-step style creation pipeline")
        print("   • Iterative refinement with state persistence")

    except Exception as error:
        print(f"\n❌ Error: {error}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
