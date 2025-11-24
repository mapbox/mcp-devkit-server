#!/usr/bin/env python3
"""
Mapbox MCP DevKit Server - Gradio Web UI Example

This example demonstrates how to build an interactive web UI with Gradio
that connects to the Mapbox MCP DevKit server and displays map previews.

Prerequisites:
- Python 3.10+
- Create a .env file with:
  MAPBOX_ACCESS_TOKEN=your_token_here
  ANTHROPIC_API_KEY=your_api_key_here

Run with:
  python app.py
"""

import os
import asyncio
import json
from typing import List, Dict, Any, Tuple
from pathlib import Path

import gradio as gr
from anthropic import Anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_server_params() -> StdioServerParameters:
    """Get MCP server parameters"""
    # Find the built server in the repo root
    repo_root = Path(__file__).parent.parent.parent
    server_path = repo_root / "dist" / "esm" / "index.js"

    if not server_path.exists():
        raise FileNotFoundError(
            f"Server not found at {server_path}. Run 'npm run build' first."
        )

    return StdioServerParameters(
        command="node",
        args=[str(server_path)],
        env={
            "MAPBOX_ACCESS_TOKEN": os.getenv("MAPBOX_ACCESS_TOKEN", ""),
            "ENABLE_MCP_UI": "true"
        }
    )


def format_tool_for_anthropic(tool) -> Dict[str, Any]:
    """Convert MCP tool to Anthropic tool format"""
    return {
        "name": tool.name,
        "description": tool.description or "",
        "input_schema": tool.inputSchema
    }


def extract_ui_resources(content: List[Any]) -> List[Dict[str, str]]:
    """Extract MCP-UI resources from tool results"""
    resources = []

    for item in content:
        # MCP SDK returns objects with attributes, not dicts
        item_type = getattr(item, 'type', None)

        if item_type == 'resource':
            # Get the nested resource object
            resource = getattr(item, 'resource', None)
            if resource:
                uri = getattr(resource, 'uri', '')
                # Convert AnyUrl/HttpUrl objects to string
                uri_str = str(uri) if uri else ''

                # MCP-UI resources start with ui://mapbox/
                if uri_str.startswith('ui://mapbox/'):
                    # Get the text field which contains the actual URL
                    text = getattr(resource, 'text', None)
                    actual_url = str(text) if text else uri_str

                    resources.append({
                        "type": "ui-resource",
                        "uri": actual_url,
                        "title": getattr(resource, 'title', 'Map Preview'),
                        "mimeType": getattr(resource, 'mimeType', 'text/html')
                    })

    return resources


async def chat_with_agent(message: str, history: List[Tuple[str, str]]) -> Tuple[str, List[Tuple[str, str]], str]:
    """
    Process a chat message with the Anthropic agent and MCP tools

    Returns: (response_text, updated_history, iframe_html)
    """
    # Create a new MCP session for this request
    server_params = get_server_params()

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # List available tools
            tools_result = await session.list_tools()

            # Filter out style_builder_tool (causes retry loops with complex schema)
            filtered_tools = [
                tool for tool in tools_result.tools
                if not any(excluded in tool.name for excluded in ["style_builder", "mapbox_style_builder"])
            ]

            # Initialize Anthropic client
            client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

            # Convert tools to Anthropic format
            anthropic_tools = [format_tool_for_anthropic(tool) for tool in filtered_tools]

            # Build message history for Anthropic
            messages = []
            for user_msg, assistant_msg in history:
                messages.append({"role": "user", "content": user_msg})
                messages.append({"role": "assistant", "content": assistant_msg})
            messages.append({"role": "user", "content": message})

            # System prompt with instructions
            system_prompt = """You are a helpful assistant with access to Mapbox DevKit tools.

You can help users:
- Create and manage custom map styles using Mapbox templates
- Compare different map styles side-by-side
- Preview and analyze GeoJSON data on maps
- Generate access tokens with specific permissions
- Get bounding boxes for countries and locations
- Convert between coordinate systems

When users ask about maps, styles, or geospatial data:
- Use the available tools to provide accurate, visual responses
- **For creating styles**: Use create_style_tool. The tool expects TWO parameters:
  1. "name": A descriptive name string
  2. "style": A complete Mapbox Style Specification object

  CRITICAL: The style object MUST have "version": 8 as the FIRST property.

- **IMPORTANT**: After creating a style, follow these steps IN ORDER:
  1. Create a temporary public token using create_token_tool with scopes: ["styles:read", "styles:tiles"], public: true, note: "Temporary token for style preview"
  2. Use preview_style_tool with the newly created token to show an interactive map preview
  3. **ALWAYS provide integration information** after successfully creating a style:
     - Display the Style ID (e.g., "username/style-id")
     - Display the Style Name
     - Provide a code snippet showing how to use it in Mapbox GL JS:
       ```javascript
       const map = new mapboxgl.Map({
         container: 'map',
         style: 'mapbox://styles/YOUR_STYLE_ID',
         center: [-74.5, 40],
         zoom: 9
       });
       ```
     This helps users integrate the style into their applications.
- When showing GeoJSON, use the geojson_preview_tool to visualize the data
- Always provide clear, helpful explanations of what you're doing
- **CRITICAL**: If ANY tool call fails, STOP immediately. Do NOT retry. Explain the error to the user.

Be friendly, informative, and proactive in suggesting relevant tools."""

            ui_resources = []
            response_text = ""

            # Agent loop with max 3 iterations to prevent retry loops
            for iteration in range(3):
                response = client.messages.create(
                    model="claude-3-5-haiku-20241022",
                    max_tokens=4096,
                    system=system_prompt,
                    messages=messages,
                    tools=anthropic_tools
                )

                # Collect text and tool use
                text_parts = []
                tool_uses = []

                for block in response.content:
                    if block.type == "text":
                        text_parts.append(block.text)
                    elif block.type == "tool_use":
                        tool_uses.append(block)

                response_text = "\n".join(text_parts)

                # If no tool use, we're done
                if not tool_uses:
                    break

                # Execute tools and collect results
                tool_results = []
                for tool_use in tool_uses:
                    try:
                        result = await session.call_tool(tool_use.name, tool_use.input)

                        # Extract UI resources from tool result
                        if hasattr(result, 'content') and result.content:
                            extracted = extract_ui_resources(result.content)
                            ui_resources.extend(extracted)

                        # Convert MCP result content to serializable format
                        content_for_anthropic = []
                        if hasattr(result, 'content') and result.content:
                            for item in result.content:
                                if hasattr(item, 'type'):
                                    # Convert MCP content objects to dicts
                                    if item.type == 'text':
                                        content_for_anthropic.append({
                                            'type': 'text',
                                            'text': item.text
                                        })
                                    elif item.type == 'resource':
                                        # Include resource info but Anthropic will see it as text
                                        content_for_anthropic.append({
                                            'type': 'text',
                                            'text': f"Resource: {item.resource.uri if hasattr(item, 'resource') else 'unknown'}"
                                        })
                                    else:
                                        content_for_anthropic.append({'type': 'text', 'text': str(item)})
                                else:
                                    content_for_anthropic.append({'type': 'text', 'text': str(item)})

                        # Format result for Anthropic
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use.id,
                            "content": content_for_anthropic if content_for_anthropic else str(result)
                        })
                    except Exception as e:
                        # Log error for debugging
                        print(f"Tool error - {tool_use.name}: {str(e)}", flush=True)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use.id,
                            "content": f"Error: {str(e)}",
                            "is_error": True
                        })

                # Add assistant response and tool results to message history
                messages.append({
                    "role": "assistant",
                    "content": response.content
                })
                messages.append({
                    "role": "user",
                    "content": tool_results
                })

            # Build iframe HTML for UI resources
            iframe_html = ""
            if ui_resources:
                for resource in ui_resources:
                    iframe_html += f"""
<div style="margin: 10px 0;">
    <h4>{resource['title']}</h4>
    <iframe
        src="{resource['uri']}"
        width="100%"
        height="500px"
        style="border: 1px solid #ddd; border-radius: 4px;"
        allow="geolocation"
    ></iframe>
</div>
"""

            # Update history
            history.append((message, response_text))

            return response_text, history, iframe_html


def chat_wrapper(message: str, history: List[Tuple[str, str]]) -> Tuple[List[Tuple[str, str]], str]:
    """Wrapper to run async chat function in Gradio"""
    response_text, updated_history, iframe_html = asyncio.run(
        chat_with_agent(message, history)
    )
    return updated_history, iframe_html


def create_ui():
    """Create the Gradio interface"""
    with gr.Blocks(title="Mapbox MCP DevKit - Gradio UI", theme=gr.themes.Soft()) as app:
        gr.Markdown("""
        # 🗺️ Mapbox MCP DevKit - Interactive Web UI

        Chat with an AI agent that has access to Mapbox DevKit tools. Create custom map styles,
        preview GeoJSON data, and more!
        """)

        with gr.Row():
            with gr.Column(scale=2):
                chatbot = gr.Chatbot(
                    label="Chat with Mapbox Assistant",
                    height=500,
                    type="tuples"
                )

                msg = gr.Textbox(
                    label="Your message",
                    placeholder="Ask about map styles, GeoJSON, or geospatial data...",
                    lines=2
                )

                with gr.Row():
                    submit = gr.Button("Send", variant="primary")
                    clear = gr.Button("Clear")

                # Example prompts
                gr.Markdown("### 💡 Try these examples:")

                with gr.Accordion("Style Creation", open=False):
                    gr.Examples(
                        examples=[
                            ["Create a Warsaw night mode style with amber-colored landmarks representing Polish heritage"],
                            ["Design a light map style for a Kraków restaurant app that emphasizes Old Town historic buildings"],
                            ["Make a minimalist style for a Polish real estate app focused on Tricity area"],
                        ],
                        inputs=msg,
                        label=None
                    )

                with gr.Accordion("Style Comparison", open=False):
                    gr.Examples(
                        examples=[
                            ["Compare mapbox/light-v11 and mapbox/dark-v11 styles in Warsaw's Old Town"],
                            ["Show me the difference between streets-v12 and outdoors-v12 around Wawel Castle in Kraków"],
                            ["Compare satellite-v9 with streets-v12 at the Baltic coast in Gdańsk"],
                        ],
                        inputs=msg,
                        label=None
                    )

                with gr.Accordion("GeoJSON & Maps", open=False):
                    gr.Examples(
                        examples=[
                            ["Show me a map with markers at Palace of Culture and Science and Royal Castle in Warsaw"],
                            ["Preview a route from Warsaw to Kraków on a map"],
                            ["Create a GeoJSON polygon for Łazienki Park in Warsaw and show it on a map"],
                        ],
                        inputs=msg,
                        label=None
                    )

                with gr.Accordion("Utilities", open=False):
                    gr.Examples(
                        examples=[
                            ["Get the bounding box for Poland"],
                            ["Convert latitude 52.2297, longitude 21.0122 (Warsaw) to tile coordinates at zoom 12"],
                            ["Create a public access token for my Polish tourism website with read-only permissions"],
                        ],
                        inputs=msg,
                        label=None
                    )

            with gr.Column(scale=1):
                iframe_output = gr.HTML(
                    label="Map Preview",
                    value="<p style='color: #666; padding: 20px;'>Map previews will appear here</p>"
                )

        gr.Markdown("""
        ### ⚙️ About
        - **Model**: Claude 3.5 Haiku for fast responses
        - **Features**: Style creation, GeoJSON preview, token management, and more
        - **Map Previews**: Appear on the right side after tool execution
        - **Iterations**: Limited to 3 tool call loops to prevent retries
        """)

        # Event handlers
        submit.click(
            chat_wrapper,
            inputs=[msg, chatbot],
            outputs=[chatbot, iframe_output]
        ).then(
            lambda: "",  # Clear input
            outputs=[msg]
        )

        msg.submit(
            chat_wrapper,
            inputs=[msg, chatbot],
            outputs=[chatbot, iframe_output]
        ).then(
            lambda: "",
            outputs=[msg]
        )

        clear.click(
            lambda: ([], "<p style='color: #666; padding: 20px;'>Map previews will appear here</p>"),
            outputs=[chatbot, iframe_output]
        )

    return app


def main():
    """Main entry point"""
    # Check environment variables
    if not os.getenv("MAPBOX_ACCESS_TOKEN"):
        raise ValueError("MAPBOX_ACCESS_TOKEN environment variable required")
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise ValueError("ANTHROPIC_API_KEY environment variable required")

    # Check server exists
    get_server_params()  # Will raise if server not found

    print("🗺️  Starting Mapbox MCP DevKit Gradio UI...")
    app = create_ui()
    app.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False
    )


if __name__ == "__main__":
    main()
