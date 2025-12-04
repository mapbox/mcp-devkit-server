# AGENTS.md — Mapbox MCP DevKit Server

Instructions for AI agents working with the Mapbox MCP DevKit Server. For project overview and user documentation, see `README.md` and `CLAUDE.md`.

---

## Critical Patterns

**Tool Architecture:**

- **Tool naming:** Tool names (MCP identifiers) must be `snake_case_tool` (e.g., `list_styles_tool`). TypeScript class names follow `PascalCaseTool` convention (e.g., `ListStylesTool`)
- Schema files: Always separate `*.schema.ts` from `*.tool.ts`
- Schema validation: Use Zod, export both schema and inferred type
- Tool location: `src/tools/tool-name-tool/` with all three files (schema, implementation, tests)

**Testing:**

- After adding/removing tools: `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot`
- Never update snapshots without verifying changes
- Tool snapshots capture class names (TypeScript `PascalCaseTool`), tool names (MCP `snake_case_tool`), and descriptions

**Token Management:**

- All Mapbox API tools require `MAPBOX_ACCESS_TOKEN` with specific scopes
- Token scope errors are the #1 issue - check `README.md` for required scopes
- Use `VERBOSE_ERRORS=true` for debugging authentication failures

## Factual Errors to Watch For

**Incorrect Tool Naming:**

- ❌ `list_styles` → ✅ `list_styles_tool`
- ❌ `ListStyles` → ✅ `ListStylesTool`

**Incorrect File Structure:**

- ❌ Schema defined in `*.tool.ts` → ✅ Schema in separate `*.schema.ts`
- ❌ Tool in `src/tools/ListStylesTool.ts` → ✅ Tool in `src/tools/list-styles-tool/ListStylesTool.ts`

**Incorrect Class References:**

- ❌ `ToolRegistry.registerTool()` → ✅ Tools auto-registered via `src/tools/index.ts` exports
- ❌ Manual tool instantiation → ✅ Use plop generator: `npx plop create-tool`

**Incorrect Token Scope Usage:**

- ❌ Using default token for all operations → ✅ Check required scopes per tool in `README.md`
- ❌ `styles:read` for creating styles → ✅ `styles:write` required

## Essential Commands

```bash
npm run build                    # Always build before running
npm test                         # Run all tests
npx plop create-tool             # Generate new tool scaffold
npm run lint:fix && npm run format:fix  # Fix code style
```

## Development Workflow

1. **Adding a tool:** `npx plop create-tool` → Implement schema/logic → Update snapshots
2. **Modifying a tool:** Edit → Build → Test → Update snapshots if metadata changed
3. **Testing:** Use MCP Inspector: `npx @modelcontextprotocol/inspector node dist/esm/index.js`

---

**See also:**

- `docs/engineering_standards.md` — Comprehensive contributor guidelines
- `CLAUDE.md` — Architecture and technical patterns
- `README.md` — Complete tool reference and token scopes
- `TOOL_CONFIGURATION.md` — Tool enable/disable configuration
