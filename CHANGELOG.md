## Unreleased

### Features Added

- **MCP Apps support for preview_style_tool, style_comparison_tool, geojson_preview_tool** (#62)
  - Added fullscreen toggle button and `ui/request-display-mode` support
  - Added `ui/notifications/host-context-changed` handler for returning from fullscreen
  - Added `ui/notifications/size-changed` notifications to fit panel height on load
  - Added `viewUUID` to tool response `_meta` so host routes result to correct UI panel
  - Removed outdated `ui/initialize` handshake (ext-apps 0.2.x pattern, not needed in 1.0.x)
  - Removed debug `console.log` statements from all UI resource HTML
  - Compatible with Claude Desktop, VS Code, and Goose

### Dependencies

- Updated `@modelcontextprotocol/sdk` from 1.25.3 to 1.26.0
- Updated patch file for SDK 1.26.0

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
