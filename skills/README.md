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

The mapbox-agent-skills repository includes **19 skills**:

**Migration:**

- `mapbox-google-maps-migration` - Migrate from Google Maps Platform to Mapbox GL JS
- `mapbox-maplibre-migration` - Migrate from MapLibre GL JS to Mapbox

**Design & Styling:**

- `mapbox-cartography` - Map design on the Standard style: config-first workflow, themes, light presets, slots, color, hierarchy, typography
- `mapbox-style-patterns` - Style recipes for typical scenarios (POI finders, real estate, data viz)
- `mapbox-style-quality` - Style validation, accessibility, and testing
- `mapbox-data-visualization-patterns` - Choropleths, heat maps, 3D and data-driven styling

**Web:**

- `mapbox-web-integration-patterns` - Framework integration (React, Vue, Svelte, Angular, Next.js)
- `mapbox-web-performance-patterns` - Performance optimization for Mapbox GL JS

**Mobile:**

- `mapbox-ios-patterns` - iOS integration with Swift, SwiftUI, UIKit
- `mapbox-android-patterns` - Android integration with Kotlin, Jetpack Compose
- `mapbox-flutter-patterns` - Flutter integration, including iOS/Android platform setup

**Search & Location:**

- `mapbox-search-patterns` - Choosing the right search tool and parameters
- `mapbox-search-integration` - End-to-end search implementation workflow
- `mapbox-store-locator-patterns` - Store locators, restaurant finders, location search apps
- `mapbox-geospatial-operations` - Picking the right geospatial tool for the problem

**MCP:**

- `mapbox-mcp-devkit-patterns` - Using this server in AI coding assistants
- `mapbox-mcp-runtime-patterns` - Using the Mapbox MCP Server in AI apps and agent frameworks
- `mapbox-location-grounding` - Grounded, cited location answers from live data

**Security:**

- `mapbox-token-security` - Access token scopes, URL restrictions, and rotation

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

### Where map-design decisions are defined

`mapbox-cartography` is the source of truth for map-design doctrine. The tool descriptions, prompts
and resources in this server follow it rather than restating it, so guidance stays consistent whether
an agent has the skills installed or is working from the server's tool schemas alone. The rules that
most often show up as bugs:

- Default to `mapbox://styles/mapbox/standard`; Classic styles only when explicitly asked for
- Change appearance through style-import config before adding layers
- Dark mode is `lightPreset: "night"` — not a different base style, not hand-authored dark colors
- Every custom layer sets an explicit `slot`
- Custom fill/line/circle layers set emissive strength `1`, or they vanish at dusk/night
- Routes set `line-occlusion-opacity` so 3D buildings don't hide them
- Never red→green or rainbow ramps for ordered data; use ColorBrewer RdBu / PuOr / BrBG

If you change one of these in the server, change it in `mapbox-cartography` too — and vice versa.

## Why Skills Moved to a Separate Repository

**Benefits:**

- ✅ **Dedicated maintenance**: Skills can be updated independently
- ✅ **Better discoverability**: Easier to find and install via `npx add-skill`
- ✅ **Comprehensive collection**: 19 skills covering design, web, mobile, search, and migration
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
