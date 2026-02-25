# Mapbox Agent Skills

> **Note:** Mapbox Agent Skills have moved to a dedicated repository for better maintenance and discoverability.

## 📦 Install Skills from the Official Repository

All Mapbox Agent Skills are now maintained in the official **[mapbox-agent-skills](https://github.com/mapbox/mapbox-agent-skills)** repository.

### Quick Install

```bash
# Install all Mapbox skills
npx add-skill mapbox/mapbox-agent-skills

# Install specific skills
npx add-skill mapbox/mapbox-agent-skills --skill mapbox-web-performance-patterns
npx add-skill mapbox/mapbox-agent-skills --skill mapbox-token-security
npx add-skill mapbox/mapbox-agent-skills --skill mapbox-cartography
```

### Available Skills

The mapbox-agent-skills repository includes **10 comprehensive skills**:

**Migration & Platform:**

- `mapbox-google-maps-migration` - Migrate from Google Maps to Mapbox GL JS
- `mapbox-maplibre-migration` - Migrate from MapLibre GL JS to Mapbox

**Performance & Integration:**

- `mapbox-web-performance-patterns` - Performance optimization for Mapbox GL JS
- `mapbox-web-integration-patterns` - Framework integration (React, Vue, Svelte, Angular, Next.js)

**Design & Styling:**

- `mapbox-cartography` - Map design principles and best practices
- `mapbox-style-patterns` - Common style patterns and layer configurations
- `mapbox-style-quality` - Style validation, accessibility, and testing

**Security:**

- `mapbox-token-security` - Access token security and best practices

**Mobile:**

- `mapbox-ios-patterns` - iOS integration with Swift, SwiftUI, UIKit
- `mapbox-android-patterns` - Android integration with Kotlin, Jetpack Compose

## How Skills Work with the MCP Server

The Mapbox MCP DevKit Server and Agent Skills work together:

| Component        | Purpose               | Example                                        |
| ---------------- | --------------------- | ---------------------------------------------- |
| **MCP Tools**    | Execute actions       | `create_style_tool`, `list_tokens_tool`        |
| **MCP Prompts**  | Orchestrate workflows | `create-and-preview-style` workflow            |
| **Agent Skills** | Provide expertise     | Map design principles, security best practices |

**Example workflow:**

```
User: "Create a map for my restaurant finder app"

With MCP Server + Skills:
1. [mapbox-cartography skill] Understands restaurant map design principles
2. [mapbox-style-patterns skill] Applies POI Finder pattern
3. [mapbox-token-security skill] Knows secure token configuration
4. → Uses MCP tools (style_builder_tool, create_style_tool, etc.)
5. → Creates optimized, secure map
```

## Why Skills Moved to a Separate Repository

**Benefits:**

- ✅ **Dedicated maintenance**: Skills can be updated independently
- ✅ **Better discoverability**: Easier to find and install via `npx add-skill`
- ✅ **Comprehensive collection**: 10 skills covering web, mobile, and migration
- ✅ **Community contributions**: Easier for community to contribute new skills
- ✅ **Versioning**: Skills can be versioned independently from MCP server

## Resources

- **[Mapbox Agent Skills Repository](https://github.com/mapbox/mapbox-agent-skills)** - Official skills repository
- [Agent Skills Overview](https://agentskills.io) - Learn about Agent Skills
- [Agent Skills Specification](https://github.com/anthropics/skills) - Technical specification
- [Mapbox Documentation](https://docs.mapbox.com) - Official Mapbox docs

## Need Help?

- Skills-related issues: [mapbox-agent-skills issues](https://github.com/mapbox/mapbox-agent-skills/issues)
- MCP Server issues: [mcp-devkit-server issues](https://github.com/mapbox/mcp-devkit-server/issues)
