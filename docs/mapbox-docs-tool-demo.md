# Mapbox Documentation Tool Demo

This demo showcases the `get_latest_mapbox_docs_tool` and provides example prompts that will trigger the AI assistant to use this tool instead of web search.

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

---

_This demo file is designed to help developers and AI assistants make the most of the Mapbox Documentation Tool. The prompts are crafted to naturally trigger the correct tool selection while providing valuable, current information._
