## Unreleased

## 0.5.0 - 2026-02-24

### Features Added

- **MCP Apps support for preview_style_tool, style_comparison_tool, geojson_preview_tool** (#62)
  - All three panels now render inline with **Mapbox GL JS** — no inner iframes, works in Claude Desktop regardless of `frame-src` CSP restrictions
  - **GeoJSON Preview**: renders GeoJSON (points, lines, polygons) on a GL map with auto-fit bounds. Auto-generates a short-lived scoped `pk.*` token on the customer's Mapbox account via the Token API (scopes: `styles:tiles`, `styles:read`, `fonts:read`); cached for 1 hour
  - **Style Preview**: renders the user's style directly via `mapbox://styles/...`; shows the human-readable style name as a pill overlay (from `map.getStyle().name`)
  - **Style Comparison**: two synced GL maps with a draggable reveal slider using `mapbox-gl-compare`; shows both style names as pills; respects initial map position from tool result hash fragment
  - Full MCP Apps handshake: `ui/initialize` → response → `ui/notifications/initialized`; errors silently ignored for hosts that don't implement the handshake
  - Added `↗ Open in browser` button (`ui/open-link`) to all three panels as fallback
  - Fullscreen toggle on all panels; `map.resize()` called on display mode change
  - Compatible with Claude Desktop, VS Code, and Goose

### Configuration

- **Hosted MCP Server**: Added remote entry in `server.json` for the hosted DevKit MCP server at `https://mcp-devkit.mapbox.com/mcp` using streamable-http transport

### Dependencies

- Updated `@modelcontextprotocol/sdk` from 1.25.3 to 1.26.0
- Updated patch file for SDK 1.26.0

### Documentation

- **PR Guidelines**: Added CHANGELOG requirement to CLAUDE.md (#67)
  - All pull requests must now update CHANGELOG.md
  - Document what changed, why, and any breaking changes
  - Add entry under "Unreleased" section with PR number

### Developer Experience

- **Release Process**: Added automated CHANGELOG preparation script (#67)
  - New `npm run changelog:prepare-release <version>` command
  - Automatically replaces "Unreleased" with version and date
  - Adds new empty "Unreleased" section for next changes
  - Includes validation for version format and CHANGELOG structure

## 0.4.7

### Security

- **CVE-2026-0621**: Updated `@modelcontextprotocol/sdk` to 1.25.3 to fix ReDoS vulnerability in UriTemplate regex patterns

### Bug Fixes

- Migrated from deprecated `server.resource()` to `server.registerResource()` API in BaseResource
- Fixed TypeScript implicit `any` type error in BaseTool registerTool callback

### Dependencies

- Updated `@modelcontextprotocol/sdk` from 1.17.5 to 1.25.3

## 0.4.6

### Features Added

- Added structured content with schemas to all tool outputs
- Added new resources to server with fallback tool support

### Bug Fixes

- Fixed schema compatibility issues for Cursor and GPT clients

### Other

- Updated to latest MCP registry schema version (2025-10-17)
- Added mcpName field to package.json

## 0.4.4

### Other

- Add to MCP registry

## 0.4.0

### Features Added

- New fetch pipeline with automatic retry behavior

### Bug Fixes

- Dual emits ESM and CommonJS bundles with types per target

### Other Features

- Migrated from Jest to vitest
- Added EditorConfig support for development work
