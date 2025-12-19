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

## Key Architectural Patterns

**Tool Architecture:** All tools extend `BaseTool<InputSchema, OutputSchema>`. Tools auto-validate inputs using Zod schemas. Each tool lives in `src/tools/tool-name-tool/` with separate `*.schema.ts` and `*.tool.ts` files.

**Prompt Architecture:** All prompts extend `BasePrompt` abstract class. Prompts orchestrate multi-step workflows, guiding AI assistants through complex tasks with best practices built-in. Each prompt lives in `src/prompts/` with separate files per prompt (e.g., `CreateAndPreviewStylePrompt.ts`). Prompts use kebab-case naming (e.g., `create-and-preview-style`).

**HTTP Pipeline System:** "Never patch global.fetch—use HttpPipeline with dependency injection instead." The `HttpPipeline` class applies policies (User-Agent, retry logic) via a chain-of-responsibility pattern. See `src/utils/httpPipeline.ts:20`.

**Resource System:** Static reference data exposed as MCP resources using URI pattern `resource://mapbox-*`, including style layer specs, Streets v8 field definitions, and token scope documentation.

**Token Management:** Tools receive `MAPBOX_ACCESS_TOKEN` via `extra.authInfo.token` or environment variable. Token scope validation is critical—most tool failures stem from insufficient scopes (see `README.md` for per-tool requirements).

**Tool Registry:** Tools are auto-discovered via `src/tools/toolRegistry.ts` exports. No manual registration required—just export from registry.

**Prompt Registry:** Prompts are registered in `src/prompts/promptRegistry.ts`. To add a new prompt, create the prompt class and add it to the `ALL_PROMPTS` array. The main server automatically registers all prompts with proper Zod schema conversion.

## Essential Workflows

**Development commands:**

```bash
npm install
npm test
npm run build
npm run inspect:build  # Interactive MCP inspector
npx plop create-tool   # Generate tool scaffold
```

**New tool creation:** Run `npx plop create-tool` for interactive scaffolding (provide name without "Tool" suffix). Generates three files: `*.schema.ts`, `*.tool.ts`, and `*.test.ts`.

**Testing workflow:**

- After adding/removing tools: `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot`
- Never update snapshots without verifying changes
- Tool snapshots capture class names, tool names, and descriptions

## Important Constraints

- **Tool naming:** Tool names (MCP identifiers) must be `snake_case_tool` (e.g., `list_styles_tool`). TypeScript class names follow `PascalCaseTool` convention (e.g., `ListStylesTool`)
- Schema files must be separate from implementation files (`*.schema.ts` vs `*.tool.ts`)
- Avoid `any` types; add comments explaining unavoidable usage
- Never execute real network calls in tests—mock `HttpPipeline` instead
- All Mapbox API tools require valid token with specific scopes (most common failure mode)

## Documentation

Additional guidance available in `docs/engineering_standards.md` (comprehensive contributor guidelines), `README.md` (complete tool reference and token scopes), `TOOL_CONFIGURATION.md` (enable/disable tools), `AGENTS.md` (AI agent patterns), and integration guides for Claude Desktop, VS Code, Cursor, and Claude Code.
