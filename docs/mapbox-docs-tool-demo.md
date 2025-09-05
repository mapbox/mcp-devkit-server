# Mapbox Documentation Tool Demo

This demo showcases the `get_latest_mapbox_docs_tool` and provides example prompts that will trigger the AI assistant to use this tool instead of web search.

> **⚠️ Important Note**: Different MCP clients (Claude Desktop, Claude Code, etc.) and different LLM models may exhibit varying behavior when selecting tools. The examples below are demonstrations of intended behavior and may not work identically across all environments. Tool selection depends on the specific AI model's training, the MCP client implementation, and system prompts used.

## 🎯 Tool Overview

The `get_latest_mapbox_docs_tool` automatically fetches the latest official Mapbox documentation from `docs.mapbox.com/llms.txt`. This ensures AI assistants always have access to current, authoritative information about Mapbox APIs and services.

## 📝 Demo Prompts

Try these prompts with your AI assistant to see the tool in action:

### 1. Basic Documentation Queries

```
What are the latest Mapbox APIs available for developers? I want to make sure I'm using the most current information.
```

```
I need the most up-to-date official Mapbox documentation. Can you provide a complete overview?
```

```
Please show me all current Mapbox services and APIs using the latest documentation.
```

### 2. Development Planning (More Direct Approach)

```
Can you get the latest official Mapbox documentation and help me understand what developer tools are available?
```

```
I need current information from Mapbox documentation about their complete developer platform.
```

```
Please use the most recent Mapbox documentation to show me all mapping solutions they offer.
```

### 3. Learning & Research

```
Using the latest Mapbox documentation, give me a comprehensive overview of their current product ecosystem.
```

```
I need up-to-date official information about Mapbox's navigation and routing capabilities.
```

```
Please check the current Mapbox documentation and explain the differences between their web and mobile SDKs.
```

```
I'm new to Mapbox. Can you get the latest official documentation and give me an overview of their resources?
```

### 4. Architecture Decisions

```
Can you check the latest Mapbox documentation and tell me what APIs are available for real estate applications with maps and search?
```

```
I need current Mapbox documentation about mapping, geocoding, and routing options. What's available?
```

```
Using the latest official Mapbox documentation, compare their web versus mobile solutions.
```

```
Please get the most recent Mapbox documentation and show me services relevant for logistics platforms.
```

### 5. Latest Information Requests

```
What's new in the Mapbox ecosystem? Please use the latest official documentation to show me all current offerings.
```

```
Can you get the most recent Mapbox documentation and tell me about any recent additions to their APIs?
```

```
I need the current state of Mapbox developer tools - please check their latest documentation.
```

```
I last used Mapbox 2 years ago. Can you get the latest documentation and show me what has changed?
```

## 🎪 Interactive Demo Session

### More Effective Examples (Based on Real Testing):

**Try these prompts that are more likely to trigger the documentation tool:**

**Example 1:**

```
What are the latest Mapbox APIs available for developers? I want to make sure I'm using the most current information.
```

**Example 2:**

```
I need the most up-to-date Mapbox documentation for my project. Can you show me all current services available?
```

**Example 3:**

```
Please use the latest official Mapbox documentation to tell me about their navigation capabilities.
```

### Less Effective Examples:

❌ **"I'm planning a food delivery app with real-time tracking and route optimization. What current Mapbox services would be relevant?"**

- _Problem_: Too project-specific, may trigger general knowledge response

❌ **"What Mapbox APIs should I use for my app?"**

- _Problem_: Too general, may trigger web search

❌ **"How do I implement Mapbox in React?"**

- _Problem_: Implementation-focused, may trigger general coding help

### Why Some Examples Work Better:

✅ **Direct documentation requests**: "latest Mapbox documentation", "current APIs available"
✅ **Emphasis on currency**: "most current information", "up-to-date"  
✅ **Official source requests**: "official Mapbox documentation", "latest official information"

> **📝 Real-World Note**: Based on testing, prompts that explicitly request documentation or emphasize getting the latest official information have higher success rates for triggering the documentation tool.

## 🔍 What Makes These Prompts Effective

These prompts work because they:

- ✅ **Emphasize currency**: Use words like "latest", "current", "up-to-date"
- ✅ **Request completeness**: Ask for "all", "comprehensive", "complete overview"
- ✅ **Imply official sources**: Request "current offerings", "official documentation"
- ✅ **Suggest comparison needs**: Multiple options require comprehensive data
- ✅ **Focus on accuracy**: "make sure I'm using correct information"

## 🚀 Benefits Demonstration

### Before (using web search):

- May get outdated information
- Fragmented results from multiple sources
- Potential inaccuracies from third-party sites
- Missing new APIs or changes

### After (using get_latest_mapbox_docs_tool):

- ✅ Always current official information
- ✅ Complete ecosystem overview
- ✅ Authoritative source (directly from Mapbox)
- ✅ Includes latest APIs and features

## 🎛 Advanced Usage

### Complex Project Planning

```
Can you get the latest Mapbox documentation and help me architect a geospatial solution with mapping, search, routing, and analytics? I need to know what services are currently available.
```

### Competitive Analysis

```
I'm evaluating Mapbox versus other platforms. Please use the most current official Mapbox documentation to show me all their capabilities for my analysis.
```

### Migration Planning

```
We're migrating from another platform. Can you check the latest Mapbox documentation and show me all services that could replace our current functionality?
```

## 💡 Pro Tips

1. **Use temporal keywords**: "latest", "current", "up-to-date", "recent"
2. **Request comprehensiveness**: "all", "complete", "entire", "full"
3. **Emphasize accuracy**: "official", "authoritative", "correct"
4. **Avoid specific tool names**: Let the AI choose the right tool naturally
5. **Context matters**: Mention your project needs to get relevant filtering

### 🔧 **Troubleshooting Tool Selection**

If the AI is not using the documentation tool:

- **Be more explicit**: "I need official Mapbox documentation" or "Please use the latest source"
- **Emphasize currency**: "Make sure you have the most current information"
- **Request authority**: "I want authoritative information directly from Mapbox"
- **Try rephrasing**: Different models respond to different prompt styles
- **Check your MCP setup**: Ensure the tool is properly registered and available

### 🌐 **Environment Considerations**

**Claude Desktop vs Claude Code**: Different interfaces may have varying tool selection behaviors.

**Model Versions**: Newer models may be better at tool selection than older ones.

**System Prompts**: Some MCP clients may have system prompts that influence tool selection preferences.

---

## 📋 **Disclaimer**

_This demo file provides **examples and suggestions** for using the Mapbox Documentation Tool. The prompts are crafted to **ideally** trigger correct tool selection, but actual behavior **will vary** across different MCP clients, AI models, and system configurations._

_**Results may vary**: Tool selection depends on many factors including model training, client implementation, and system prompts. These examples show **intended behavior** rather than guaranteed outcomes._

_Use these examples as **starting points** and adjust your prompts based on your specific environment and the AI assistant's responses._
