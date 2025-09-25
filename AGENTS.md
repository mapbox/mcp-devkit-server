# AGENTS.md — Mapbox MCP DevKit Server

This file provides coding agents with the context, commands, and conventions needed to work effectively with the Mapbox MCP DevKit Server. For human-focused docs, see `README.md`.

---

## Project Overview

- Model Context Protocol (MCP) server for Mapbox developer APIs
- Exposes tools for style management, token management, GeoJSON processing, and more
- Written in TypeScript, strict mode enabled

## Setup Commands

- Install dependencies: `npm install`
- Build the project: `npm run build`
- Run tests: `npm test`
- Lint code: `npm run lint`
- Format code: `npm run format`
- Create a new tool: `npx plop create-tool`
- Create DXT package: `npx @anthropic-ai/dxt pack`
- Build Docker image: `docker build -t mapbox-mcp-devkit .`

## Environment

- Requires Node.js 22+
- Set `MAPBOX_ACCESS_TOKEN` in your environment (see `manifest.json`)
- For Claude Code integration, see `docs/claude-code-integration.md`

## Code Style

- TypeScript strict mode
- Use ES module syntax (`import`/`export`)
- Destructure imports when possible
- Tool names must be `snake_case_tool`
- Tool schemas live in `*.schema.ts` files
- Use Zod for schema validation
- Run Prettier and ESLint before committing

## Testing Instructions

- Run all tests: `npm test`
- Update tool snapshot tests after adding/removing tools:
  - `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot`
- Run a single test file: `npm test -- path/to/testfile.ts`
- Only update snapshots when changes are intentional

## Tool Configuration

- Enable/disable tools at startup (see `TOOL_CONFIGURATION.md`)
- Example: `node dist/esm/index.js --enable-tools list_styles_tool,create_style_tool`

## PR Instructions

- Branch naming: use `feature/`, `fix/`, or `chore/` prefixes
- PR title format: `[mcp-devkit-server] <Title>`
- Always run `npm run lint` and `npm test` before committing
- Keep PRs focused and well-described

## Security & Tokens

- Each tool requires specific Mapbox token scopes (see `README.md`)
- Using insufficient scopes will result in errors
- Use `VERBOSE_ERRORS=true` for detailed error output

## Agent Tips

- Mention files/folders explicitly for agents to read or edit
- Use `/clear` to reset context between tasks (Claude Code)
- Use checklists in Markdown for large refactors or multi-step tasks
- Prefer running single tests for performance

## Large Monorepo?

- Place additional AGENTS.md files in subprojects if needed; the closest file to the code being edited takes precedence

---

_Edit this file to keep coding agents up to date on project standards, commands, and best practices._
