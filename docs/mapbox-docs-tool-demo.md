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
Show me all current Mapbox services and SDKs available for developers.
```

```
I need the most up-to-date Mapbox documentation for my project planning.
```

### 2. Development Planning

```
I'm building a location-based mobile application. What Mapbox tools and APIs should I consider for my tech stack?
```

```
Help me understand the complete Mapbox developer platform - what options do I have?
```

```
What mapping solutions does Mapbox offer? I need to choose the right approach for my web application.
```

### 3. Learning & Research

```
Give me a comprehensive overview of Mapbox's current product ecosystem.
```

```
What are Mapbox's navigation and routing capabilities? Please provide current details.
```

```
Explain the differences between Mapbox web SDKs and mobile SDKs.
```

```
I'm new to Mapbox development. Can you give me an overview of their documentation and resources?
```

### 4. Architecture Decisions

```
For a real estate application with interactive maps and address search, what Mapbox APIs would be most relevant?
```

```
I need to implement mapping, geocoding, and turn-by-turn routing. What are my Mapbox options?
```

```
Compare Mapbox solutions for web applications versus mobile app implementations.
```

```
I'm building a logistics platform. What Mapbox services should I evaluate?
```

### 5. Latest Information Requests

```
What's new in the Mapbox ecosystem? I want to make sure I'm aware of all current offerings.
```

```
Are there any recent additions to Mapbox's API collection that I should know about?
```

```
Give me a current state overview of Mapbox developer tools and services.
```

```
I last used Mapbox 2 years ago. What has changed and what new services are available?
```

## 🎪 Interactive Demo Session

Try this complete conversation flow:

**You:** "I'm planning a food delivery app with real-time tracking and route optimization. What current Mapbox services would be relevant?"

**Expected AI behavior:**

1. The AI should use `get_latest_mapbox_docs_tool`
2. Provide specific recommendations based on current Mapbox offerings
3. Include relevant APIs like Navigation SDK, Directions API, etc.

**Follow-up:** "Can you give me more details about the Navigation SDK options?"

**Expected AI behavior:**

1. Reference the already-fetched documentation
2. Provide specific details about iOS/Android Navigation SDKs
3. Include links to relevant documentation

> **📝 Note**: The actual behavior may vary depending on your MCP client and AI model. Some models might:
>
> - Choose web search instead of the documentation tool
> - Use the tool but focus on different aspects of the documentation
> - Require more specific prompting to trigger the desired tool selection
>
> If the tool isn't being selected, try using more explicit language like "I need the most current official information" or "please use the latest documentation."

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
I need to architect a complete geospatial solution with mapping, search, routing, and analytics. Based on the latest Mapbox offerings, what would be the optimal combination of services?
```

### Competitive Analysis

```
I'm evaluating Mapbox versus other mapping platforms. What are all the current Mapbox capabilities I should consider in my analysis?
```

### Migration Planning

```
We're currently using [other platform]. What are all the Mapbox services that could replace our current functionality?
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
