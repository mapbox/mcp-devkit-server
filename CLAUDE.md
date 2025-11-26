# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Architecture & Design

### MCP Server Structure

This is a Model Context Protocol (MCP) server that exposes Mapbox developer APIs through **tools** (executable operations) and **resources** (static reference data).

**Startup Flow:**
1. `src/index.ts` loads `.env` from cwd and initializes OpenTelemetry tracing (opt-in)
2. Parses tool configuration from command-line args (`parseToolConfigFromArgs`)
3. Loads all tools from `toolRegistry.ts` and filters based on config
4. Loads all resources from `resourceRegistry.ts`
5. Registers enabled tools and resources with MCP server
6. Connects via `StdioServerTransport` for stdio communication

### Tool Architecture

All tools follow a class-based inheritance pattern:

- **`BaseTool<InputSchema, OutputSchema>`** - Abstract base class for all tools
  - Handles schema validation (using Zod)
  - Provides `installTo()` to register with MCP server
  - Defines abstract `execute()` method for tool logic
  - Includes logging helpers and output validation

- **`MapboxApiBasedTool<InputSchema, OutputSchema>`** - Extends BaseTool for Mapbox API calls
  - Adds access token validation (JWT format check)
  - Injects `httpRequest` for API calls with automatic tracing
  - Handles Mapbox API error responses consistently
  - Supports both Bearer auth and MAPBOX_ACCESS_TOKEN env var

**Tool File Structure:**
Each tool lives in `src/tools/<tool-name>-tool/`:
```
tool-name-tool/
├── ToolNameTool.ts                    # Main implementation
├── ToolNameTool.input.schema.ts       # Input schema (Zod)
├── ToolNameTool.output.schema.ts      # Output schema (optional)
└── ToolNameTool.test.ts              # Unit tests
```

**Tool Registration:**
- All tools are instantiated and exported in `src/tools/toolRegistry.ts`
- The `ALL_TOOLS` array is the single source of truth
- Tools can be filtered at runtime via `--enable-tools` or `--disable-tools` flags

### Resource Architecture

Resources provide static reference documentation (specs, token scopes, field definitions):
- Extend `BaseResource` abstract class
- Registered in `src/resources/resourceRegistry.ts`
- Accessed via `get_reference_tool` or directly by MCP clients that support resources protocol

### HTTP Pipeline & Tracing

- All Mapbox API calls go through `src/utils/httpPipeline.ts`
- Automatic OpenTelemetry instrumentation for HTTP requests
- Tracing is opt-in (disabled by default) - enabled by setting `OTEL_EXPORTER_OTLP_ENDPOINT`
- Tool execution spans include timing, status, input size, and error details

---

## Common Commands

**Development:**
- `npm install` - Install dependencies
- `npm run build` - Build the project (runs tshy, generates version, adds shebang)
- `npm test` - Run all tests with Vitest
- `npm test -- path/to/file.test.ts` - Run single test file
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix lint issues
- `npm run format` - Check formatting with Prettier
- `npm run format:fix` - Auto-format code

**Tool Development:**
- `npx plop create-tool` - Generate new tool scaffold (prompts for Mapbox vs Local tool type)
- `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot` - Update tool snapshot after adding/removing tools

**Server Inspection:**
- `npm run inspect:build` - Build and inspect with MCP Inspector
- `npm run inspect:dev` - Inspect without building (uses tsx)
- `npx @modelcontextprotocol/inspector node dist/esm/index.js` - Inspect built server

**Deployment:**
- `npm run sync-manifest` - Sync version from package.json to manifest.json
- `npx @anthropic-ai/dxt pack` - Create DXT package for distribution
- `docker build -t mapbox-mcp-devkit .` - Build Docker image
- `docker run mapbox/mcp-devkit-server ...` - Run in Docker

**Tracing (requires Docker):**
- `npm run tracing:jaeger:start` - Start Jaeger backend
- `npm run tracing:jaeger:stop` - Stop Jaeger backend
- `npm run tracing:verify` - Show tracing setup instructions

---

## Observability & Tracing

OpenTelemetry (OTEL) instrumentation is **opt-in** and disabled by default.

### Quick Start with Jaeger

```bash
# 1. Start Jaeger (requires Docker)
npm run tracing:jaeger:start

# 2. Configure .env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=mapbox-mcp-devkit-server

# 3. Run server
npm run inspect:build

# 4. View traces at http://localhost:16686

# 5. Stop when done
npm run tracing:jaeger:stop
```

### What Gets Traced

- Tool execution spans (timing, status, input/output sizes)
- HTTP requests to Mapbox APIs (with CloudFront correlation IDs)
- Configuration loading (.env parsing, tool registration)
- Error details and stack traces

### Environment Variables

- `OTEL_EXPORTER_OTLP_ENDPOINT` - OTLP endpoint (required to enable tracing)
- `OTEL_TRACING_ENABLED` - Set `false` to explicitly disable
- `OTEL_SERVICE_NAME` - Override service name (default: `mapbox-mcp-devkit-server`)
- `OTEL_EXPORTER_OTLP_HEADERS` - JSON string of additional headers
- `OTEL_LOG_LEVEL` - `NONE` (default), `ERROR`, `WARN`, `INFO`, `DEBUG`, `VERBOSE`

**Note:** Defaults to `NONE` to prevent diagnostic logs from corrupting stdio transport.

**Production:** Works with any OTLP-compatible backend (Jaeger, Honeycomb, DataDog, AWS X-Ray, etc.). See `.env.example` for examples.

---

## Code Style & Conventions

**TypeScript:**
- Strict mode enabled
- Prefer ES module syntax (`import`/`export`)
- Destructure imports when possible

**Tool Naming:**
- Tool class names: PascalCase ending with `Tool` (e.g., `ListStylesTool`)
- Tool names (MCP): snake_case ending with `_tool` (e.g., `list_styles_tool`)
- Tool schemas: Separate `*.schema.ts` files (input and output)

**Validation:**
- Use Zod for all schema definitions
- Validate inputs in `BaseTool.run()` (automatic)
- Validate outputs with `validateOutput()` helper (graceful fallback on failure)

**Formatting:**
- Run Prettier and ESLint before committing
- Husky pre-commit hooks enforce linting and formatting

---

## Testing

**Run Tests:**
- `npm test` - Run all tests
- `npm test -- path/to/testfile.ts` - Run single test
- `npm test -- --coverage` - Run with coverage report

**Snapshot Tests:**
Tool metadata (name, description, class name) is snapshot-tested to prevent accidental changes.

**When to update snapshots:**
- After adding a new tool: `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot`
- After removing a tool: same command
- After modifying tool name/description: same command

**⚠️ Only update snapshots when changes are intentional.** Unexpected failures indicate accidental tool structure changes.

---

## Developer Environment

**Requirements:**
- Node.js 22+ (specified in `package.json` engines and `.nvmrc`)
- `MAPBOX_ACCESS_TOKEN` environment variable (see README.md for token setup)

**Setup:**
```bash
npm install
cp .env.example .env
# Edit .env and add your MAPBOX_ACCESS_TOKEN
npm run build
```

**Integration Docs:**
- `docs/claude-code-integration.md` - Claude Code setup
- `docs/claude-desktop-integration.md` - Claude Desktop setup
- `docs/cursor-integration.md` - Cursor IDE setup
- `docs/vscode-integration.md` - VS Code with Copilot setup

---

## Tool Configuration

Tools can be enabled/disabled at startup (see `TOOL_CONFIGURATION.md` for full details):

**Enable specific tools only:**
```bash
node dist/esm/index.js --enable-tools list_styles_tool,create_style_tool
```

**Disable specific tools:**
```bash
node dist/esm/index.js --disable-tools preview_style_tool
```

**Note:** `--enable-tools` takes precedence over `--disable-tools`.

---

## MCP-UI Support

**Enabled by default.** Allows tools that return URLs to also provide interactive iframe resources for compatible clients.

**Supported Tools:**
- `preview_style_tool` - Embeds style previews
- `geojson_preview_tool` - Embeds GeoJSON visualizations
- `style_comparison_tool` - Embeds style comparisons

**How it works:**
- Tools return both text URL (always works) and UIResource (for iframes)
- Clients without MCP-UI (e.g., Claude Desktop) ignore UIResource
- Clients with MCP-UI (e.g., Goose) render iframes

**Disable if needed:**
- Environment: `ENABLE_MCP_UI=false`
- Command-line: `--disable-mcp-ui`

**Note:** Rarely needed. Fully backwards compatible. See [mcpui.dev](https://mcpui.dev) for compatible clients.

---

## Mapbox Token Scopes

**Each tool requires specific token scopes.** Using insufficient scopes results in authentication errors.

**Common scopes:**
- `styles:list` - List styles
- `styles:read` - Read styles (for preview)
- `styles:download` - Retrieve style JSON
- `styles:write` - Create/update/delete styles
- `tokens:read` - List tokens
- `tokens:write` - Create tokens
- `user-feedback:read` - Access feedback items

**See README.md for complete scope requirements per tool.**

---

## Creating New Tools

1. **Generate scaffold:**
   ```bash
   npx plop create-tool
   # Choose: Mapbox tool (API calls) or Local tool (no API calls)
   # Provide name in PascalCase without "Tool" suffix (e.g., "Search")
   ```

2. **Generated files:**
   ```
   src/tools/your-tool-name-tool/
   ├── YourToolNameTool.schema.ts    # Input schema (Zod)
   ├── YourToolNameTool.ts           # Implementation
   └── YourToolNameTool.test.ts      # Tests
   ```

3. **Update schema** in `*.schema.ts`:
   - Define input parameters using Zod
   - Export schema and inferred TypeScript type

4. **Implement tool logic** in `execute()` method

5. **Update tests** with actual test data

6. **Update snapshot:**
   ```bash
   npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot
   ```

7. **Run all tests:**
   ```bash
   npm test
   ```

**Tool automatically appears in `toolRegistry.ts` exports.**

---

## Environment Variables

**Required:**
- `MAPBOX_ACCESS_TOKEN` - Mapbox access token with appropriate scopes

**Optional:**
- `MAPBOX_API_ENDPOINT` - Override API endpoint (default: `https://api.mapbox.com/`)
- `VERBOSE_ERRORS` - Set `true` for detailed error messages (useful for debugging)
- `ENABLE_MCP_UI` - Set `false` to disable MCP-UI support
- `NODE_ENV` - Set `test` to skip tracing initialization
- **OTEL variables** - See Observability section above

---

## Repository Etiquette

- **Branch naming:** `feature/`, `fix/`, or `chore/` prefixes
- **PR title format:** `[mcp-devkit-server] <Title>`
- **Before committing:** Run `npm run lint` and `npm test`
- **PR focus:** Keep PRs focused and well-described
- **Documentation:** Update `CLAUDE.md` and `README.md` when adding tools or workflows
- **Merging:** Prefer squash merges

---

## Known Issues & Warnings

- Large GeoJSON files may cause slow performance in preview tools
- Always check token scopes if tools fail with authentication errors
- Use `VERBOSE_ERRORS=true` for detailed error output during debugging
- Snapshot tests will fail if tools are added/removed without updating snapshots

---

## Additional Resources

- [README.md](./README.md) - Project overview and tool documentation
- [TOOL_CONFIGURATION.md](./TOOL_CONFIGURATION.md) - Tool enable/disable configuration
- [AGENTS.md](./AGENTS.md) - Instructions for AI coding agents
- [docs/claude-code-integration.md](./docs/claude-code-integration.md) - Claude Code integration guide
- [docs/tracing.md](./docs/tracing.md) - Complete tracing guide
- [docs/tracing-verification.md](./docs/tracing-verification.md) - Tracing verification steps
- [docs/STYLE_BUILDER.md](./docs/STYLE_BUILDER.md) - Style Builder tool documentation
- [.github/copilot-instructions.md](./.github/copilot-instructions.md) - GitHub Copilot guidelines

---

_Edit this file to keep Claude Code and developers up to date on project standards, commands, and best practices._
