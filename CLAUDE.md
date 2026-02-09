# CLAUDE.md — Mapbox MCP DevKit Server

## Overview

This is an MCP (Model Context Protocol) server providing "geospatial intelligence capabilities through Mapbox APIs" for AI agents, enabling map styling, GeoJSON visualization, token management, and geocoding.

## Tech Stack

- **Runtime:** Node.js 22+ LTS
- **Language:** TypeScript (strict mode)
- **Testing:** Vitest
- **Package Manager:** npm

## Project Structure

The codebase organizes into:

- `src/index.ts` - Main entry point with .env loading and server initialization
- `src/config/toolConfig.ts` - Configuration parser for tool filtering and MCP-UI toggles
- `src/tools/` - MCP tool implementations with `BaseTool` abstract class and registry
- `src/prompts/` - MCP prompt implementations with `BasePrompt` abstract class and registry
- `src/resources/` - Static reference data (style specs, token scopes, Streets v8 fields)
- `src/utils/` - HTTP pipeline, JWT parsing, tracing, and version utilities
- `skills/` - Agent Skills providing domain expertise (cartography, security, style patterns)

## Key Architectural Patterns

**Tool Architecture:** All tools extend `BaseTool<InputSchema, OutputSchema>` or `MapboxApiBasedTool<InputSchema, OutputSchema>`. Tools auto-validate inputs and outputs using Zod schemas. Each tool lives in `src/tools/tool-name-tool/` with separate `*.input.schema.ts`, `*.output.schema.ts`, and `*.ts` files.

**Prompt Architecture:** All prompts extend `BasePrompt` abstract class. Prompts orchestrate multi-step workflows, guiding AI assistants through complex tasks with best practices built-in. Each prompt lives in `src/prompts/` with separate files per prompt (e.g., `CreateAndPreviewStylePrompt.ts`). Prompts use kebab-case naming (e.g., `create-and-preview-style`).

**HTTP Pipeline System:** "Never patch global.fetch—use HttpPipeline with dependency injection instead." The `HttpPipeline` class applies policies (User-Agent, retry logic) via a chain-of-responsibility pattern. See `src/utils/httpPipeline.ts:20`.

**Resource System:** Static reference data exposed as MCP resources using URI pattern `resource://mapbox-*`, including style layer specs, Streets v8 field definitions, and token scope documentation.

**Token Management:** Tools receive `MAPBOX_ACCESS_TOKEN` via `extra.authInfo.token` or environment variable. Token scope validation is critical—most tool failures stem from insufficient scopes (see `README.md` for per-tool requirements).

**Tool Registry:** Tools are auto-discovered via `src/tools/toolRegistry.ts` exports. No manual registration required—just export from registry.

**Prompt Registry:** Prompts are registered in `src/prompts/promptRegistry.ts`. To add a new prompt, create the prompt class and add it to the `ALL_PROMPTS` array. The main server automatically registers all prompts with proper Zod schema conversion.

**Agent Skills:** Domain expertise provided through `skills/` directory. Each skill is a folder with `SKILL.md` containing YAML frontmatter and markdown instructions. Skills teach AI assistants about map design (cartography), security (token management), and implementation (style patterns). Skills are discovered by Claude Code, uploadable to Claude API, or usable in Claude.ai. See `skills/README.md` for details.

## Essential Workflows

**Development commands:**

```bash
npm install
npm test
npm run build
npm run inspect:build  # Interactive MCP inspector
```

**New tool creation:**

```bash
# Interactive mode (requires TTY - use in terminal):
npx plop create-tool

# Non-interactive mode (for AI agents, CI, or scripts):
npx plop create-tool "api-based" "ToolName"
npx plop create-tool "local" "ToolName"

# Examples:
npx plop create-tool "api-based" "Search"
npx plop create-tool "local" "Validator"
```

**Note**: When running from AI agents or non-TTY environments (like Claude Code), always use non-interactive mode with command-line arguments to avoid readline errors.

Generates three files: `*.input.schema.ts`, `*.output.schema.ts`, and `*.test.ts` in appropriate directories (src/tools/ for implementation, test/tools/ for tests).

**Testing workflow:**

- After adding/removing tools: `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot`
- Never update snapshots without verifying changes
- Tool snapshots capture class names, tool names, and descriptions

**Pull Requests:**

When creating pull requests:

- **Always update CHANGELOG.md** - Document what changed, why, and any breaking changes
- Follow the existing changelog format (check recent entries for examples)
- Add your entry under the "Unreleased" section at the top
- Include the PR number and a brief description of the change

**Release Process:**

When preparing a new release:

```bash
# Prepare CHANGELOG for release (replaces "Unreleased" with version and date)
npm run changelog:prepare-release 1.0.0

# Review changes, then commit and tag
git add CHANGELOG.md
git commit -m "Release v1.0.0"
git tag v1.0.0
git push && git push --tags
```

The `changelog:prepare-release` script automatically:

- Replaces "## Unreleased" with "## {version} - {date}"
- Adds a new empty "## Unreleased" section at the top
- Validates version format and CHANGELOG structure

## Important Constraints

- **Tool naming:** Tool names (MCP identifiers) must be `snake_case_tool` (e.g., `list_styles_tool`). TypeScript class names follow `PascalCaseTool` convention (e.g., `ListStylesTool`)
- Schema files must be separate from implementation files: `*.input.schema.ts`, `*.output.schema.ts`, and `*.ts`
- Avoid `any` types; add comments explaining unavoidable usage
- Never execute real network calls in tests—mock `HttpPipeline` instead
- All Mapbox API tools require valid token with specific scopes (most common failure mode)

## Documentation

Additional guidance available in `docs/engineering_standards.md` (comprehensive contributor guidelines), `README.md` (complete tool reference and token scopes), `TOOL_CONFIGURATION.md` (enable/disable tools), `AGENTS.md` (AI agent patterns), and integration guides for Claude Desktop, VS Code, Cursor, and Claude Code.
