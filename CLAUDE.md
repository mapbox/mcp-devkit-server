# CLAUDE.md — Mapbox MCP DevKit Server

This file provides Claude and developers with essential context, commands, and standards for working with the Mapbox MCP DevKit Server. It follows [Anthropic's CLAUDE.md best practices](https://www.anthropic.com/engineering/claude-code-best-practices).

---

## Common Bash Commands

- `npm run build` — Build the project
- `npm test` — Run all tests
- `npm run lint` — Run ESLint
- `npm run lint:fix` — Auto-fix lint issues
- `npm run format` — Check formatting with Prettier
- `npm run format:fix` — Auto-format code
- `npx plop create-tool` — Generate a new tool scaffold
- `npx @modelcontextprotocol/inspector node dist/esm/index.js` — Inspect the MCP server
- `npm run sync-manifest` — Sync version from package.json to manifest.json
- `docker build -t mapbox-mcp-devkit .` — Build Docker image
- `docker run mapbox/mcp-devkit-server ...` — Run server in Docker

## Core Files & Structure

- `src/tools/` — All tool implementations (see subfolders for each tool)
- `src/resources/` — Resource classes and registries
- `src/config/` — Tool and server configuration
- `test/` — Unit and snapshot tests
- `manifest.json` — DXT/extension manifest
- `TOOL_CONFIGURATION.md` — Tool enable/disable and configuration guide
- `README.md` — Main project documentation

## Code Style Guidelines

- Use TypeScript (strict mode enabled)
- Prefer ES module syntax (`import`/`export`)
- Destructure imports when possible
- Follow snake_case for tool names (e.g., `list_styles_tool`)
- Tool input schemas live in `*.schema.ts` files, separate from implementation
- Use Zod for schema validation
- Run Prettier and ESLint before committing

## Testing Instructions

- Run all tests: `npm test`
- Update tool snapshot tests after adding/removing tools:
  - `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot`
- Run a single test file: `npm test -- path/to/testfile.ts`
- Only update snapshots when changes are intentional

## Repository Etiquette

- Prefer squash merges for PRs
- Keep PRs focused and well-described
- Update `CLAUDE.md` and `README.md` when adding new tools or workflows

## Developer Environment Setup

- Requires Node.js 22+
- Install dependencies: `npm install`
- Set `MAPBOX_ACCESS_TOKEN` in your environment (see `manifest.json` and `README.md`)
- For Claude Code integration, see `docs/claude-code-integration.md`

## Tool Configuration

- Tools can be enabled/disabled at startup (see `TOOL_CONFIGURATION.md`)
- Example: `node dist/esm/index.js --enable-tools list_styles_tool,create_style_tool`

## Mapbox Token Scopes

- Each tool requires specific Mapbox token scopes (see `README.md` for details)
- Using insufficient scopes will result in errors

## Known Issues & Warnings

- Large GeoJSON files may cause slow performance in preview tools
- Always check token scopes if a tool fails with authentication errors
- Use `VERBOSE_ERRORS=true` for detailed error output

## Claude Code Usage Tips

- Mention files/folders explicitly for Claude to read or edit
- Use `/clear` to reset context between tasks
- Use checklists in Markdown for large refactors or multi-step tasks
- Prefer running single tests for performance
- Use `claude mcp add ...` to add this server to Claude Code

## Additional Resources

- [TOOL_CONFIGURATION.md](./TOOL_CONFIGURATION.md) — Tool config and usage
- [docs/claude-code-integration.md](./docs/claude-code-integration.md) — Claude Code integration
- [README.md](./README.md) — Project overview and tool documentation

---

_Edit this file to keep Claude and your team up to date on project standards, commands, and best practices._
