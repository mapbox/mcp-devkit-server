# GitHub Copilot Repository Instructions

These instructions help GitHub Copilot and Copilot Chat provide better code suggestions and answers for the Mapbox MCP DevKit Server. For more details, see the [Copilot repository instructions guide](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions).

---

## Project Overview

- Model Context Protocol (MCP) server for Mapbox developer APIs
- Written in TypeScript (strict mode)
- Provides tools for Mapbox style management, token management, GeoJSON processing, and more

## Code Style

- Use TypeScript strict mode
- Prefer ES module syntax (`import`/`export`)
- Destructure imports when possible
- Tool names must be `snake_case_tool`
- Tool schemas live in `*.schema.ts` files
- Use Zod for schema validation
- Run Prettier and ESLint before committing

## Development & Build

- Requires Node.js 22+
- Install dependencies: `npm install`
- Build: `npm run build`
- Run tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`
- Create new tool: `npx plop create-tool`
- Create DXT package: `npx @anthropic-ai/dxt pack`
- Build Docker image: `docker build -t mapbox-mcp-devkit .`

## Testing

- Run all tests: `npm test`
- Update tool snapshot tests after adding/removing tools:
  - `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot`
- Run a single test file: `npm test -- path/to/testfile.ts`
- Only update snapshots when changes are intentional

## PR & Branching

- Always run `npm run lint` and `npm test` before committing
- Keep PRs focused and well-described

## Tool Configuration

- Tools can be enabled/disabled at startup (see `TOOL_CONFIGURATION.md`)
- Example: `node dist/esm/index.js --enable-tools list_styles_tool,create_style_tool`

## Security & Tokens

- Each tool requires specific Mapbox token scopes (see `README.md`)
- Using insufficient scopes will result in errors
- Use `VERBOSE_ERRORS=true` for detailed error output

## Additional Resources

- [README.md](../README.md)
- [AGENTS.md](../AGENTS.md)
- [CLAUDE.md](../CLAUDE.md)
- [TOOL_CONFIGURATION.md](../TOOL_CONFIGURATION.md)
- [docs/claude-code-integration.md](../docs/claude-code-integration.md)

---

_Edit this file to keep Copilot up to date on project standards, commands, and best practices._
