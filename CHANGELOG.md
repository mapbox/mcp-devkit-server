## Unreleased

## 0.7.2 - 2026-05-05

### Security

- **Upgrade `@opentelemetry/*` packages to latest minor versions** — resolves transitive `protobufjs` CRITICAL CVE (GHSA-xq3m-2v4x-88gg) present in older OTEL exporter packages, and high-severity transitives (`flatted` GHSA-25h7-pfq9-p65f / GHSA-rf6f-7fwh-wjgh, `picomatch` GHSA-3v7f-55p6-f55p / GHSA-c2c7-rcm5-vvqj). Updated packages:
  - `@opentelemetry/auto-instrumentations-node`: `^0.72.0` → `^0.74.0`
  - `@opentelemetry/exporter-trace-otlp-http`: `^0.214.0` → `^0.216.0`
  - `@opentelemetry/instrumentation`: `^0.214.0` → `^0.216.0`
  - `@opentelemetry/resources`: `^2.6.1` → `^2.7.1`
  - `@opentelemetry/sdk-node`: `^0.214.0` → `^0.216.0`
  - `@opentelemetry/sdk-trace-base`: `^2.6.1` → `^2.7.1`
- **Resolve critical `handlebars` CVE** (GHSA-3mfm-83xf-c92r et al.) — `handlebars` 4.7.8 → 4.7.9 via `npm audit fix`
- **Resolve high-severity `hono` and `@hono/node-server` CVEs** — `hono` 4.11.7 → 4.12.17, `@hono/node-server` 1.19.9 → 1.19.14 via `npm audit fix`
- **Resolve high-severity `express-rate-limit` CVE** (GHSA-46wh-pxpv-q5gq) — `express-rate-limit` 8.2.1 → 8.5.0 via `npm audit fix`

## 0.7.1-dev - 2026-05-05

## 0.7.1 - 2026-05-05

## 0.7.0 - 2026-05-05

### Security

- **Prevent path traversal in style and tileset tool URL construction** (#103) — Five tools (`RetrieveStyle`, `DeleteStyle`, `UpdateStyle`, `PreviewStyle`, `TilequeryTool`) concatenated user-supplied path parameters directly into Mapbox API URLs without validation. Because Node.js fetch uses the WHATWG URL parser, `../` sequences were normalized before sending, allowing requests to reach unintended API endpoints.
  - Added shared `styleIdSchema` with allowlist regex rejecting path separators, dots, percent-encoded sequences, and null bytes (`src/tools/shared/styleId.schema.ts`)
  - Added `owner.name` format validation to `TilequeryTool` tilesetId
  - Wrapped username and styleId/tilesetId in `encodeURIComponent` at every URL construction site (defense-in-depth)
  - Replaced silent fallback in output schema validation with explicit `isError: true` responses across all API tools — prevents unintended API responses from being forwarded to callers
  - Removed unused `BaseTool.validateOutput()` method
  - Added `test/security/path-traversal.test.ts` with 52 tests covering schema rejection, valid ID acceptance, URL encoding, and response schema mismatch behavior
- **Reject cross-origin Link headers** (#103) — Pagination `next-page` URLs from `Link` response headers are now validated to share the same origin as the configured API endpoint; cross-origin URLs are rejected to prevent access token exfiltration via crafted API responses
- **Redact tokens from logs** (#103) — Added `redactToken()` utility that strips `access_token` query parameter values from strings before they reach log output or MCP client error responses (network errors include the full request URL which would otherwise expose the token)

### Removed

- **`get_latest_mapbox_docs_tool` and `get_reference_tool` removed** — documentation fetching has moved to [mcp-docs-server](https://github.com/mapbox/mcp-docs-server). Use mcp-docs-server alongside this server for Mapbox documentation access. Static reference data (style layers, Streets v8 fields, token scopes, layer type mapping) remains available as MCP Resources.
- Removed `CLIENT_NEEDS_RESOURCE_FALLBACK` environment variable and resource fallback tool pattern

### Dependencies

- **Upgrade OpenTelemetry to 2.x** — upgraded `@opentelemetry/resources` and `@opentelemetry/sdk-trace-base` from `^1.30.1` to `^2.6.1`; upgraded experimental packages (`sdk-node`, `instrumentation`, `exporter-trace-otlp-http`) from `^0.56.0` to `^0.214.0`; upgraded `auto-instrumentations-node` to `^0.72.0` and `semantic-conventions` to `^1.40.0`; migrated `new Resource()` to `resourceFromAttributes()` following the 2.x API change
- **Upgrade `tshy` to `^4.1.1`, `vitest`/`@vitest/coverage-istanbul` to `^4.1.4`, `typescript` to `^6.0.2`** — removed deprecated `baseUrl` from `tsconfig.base.json` (TS6)
- **Upgrade `zod` from `^3.25.42` to `^4.3.6`** — migrated all `z.record()` calls to require explicit key schema (`z.string()`), updated test assertions for changed error message format

## 0.6.0 - 2026-04-01

### Security

- **CVE-2026-4926**: Upgraded `@modelcontextprotocol/sdk` to `^1.29.0`, resolving `path-to-regexp` to `8.4.1` and fixing the ReDoS vulnerability [GHSA-j3q9-mxjg-w52f](https://github.com/advisories/GHSA-j3q9-mxjg-w52f); regenerated output-validation patch for the new version

### Public API

- **Add `getAllTools` and `getVersionInfo` to public exports** — `getAllTools` is now re-exported from `@mapbox/mcp-devkit-server/tools` and `getVersionInfo` (plus `VersionInfo` type) from `@mapbox/mcp-devkit-server/utils`. These are needed by `hosted-mcp-server` to import server functionality via npm packages instead of submodule filesystem paths.
- Added `test/exports.test.ts` to verify public barrel exports

## 0.5.1 - 2026-03-04

### Dependencies

- Upgrade `@mcp-ui/server` from `^5.13.1` to `^6.1.0` (security advisory); update tests for mimeType change (`text/uri-list` → `text/html;profile=mcp-app`)
- Upgrade `@modelcontextprotocol/sdk` from `^1.26.0` to `^1.27.1` (security advisory); regenerated output-validation patch for new version

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
- Upgrade `@modelcontextprotocol/ext-apps` from `^1.0.1` to `^1.1.1`

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
