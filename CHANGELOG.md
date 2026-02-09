## Unreleased

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
