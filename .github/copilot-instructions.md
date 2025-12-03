# GitHub Copilot Repository Instructions

Instructions for GitHub Copilot working on the Mapbox MCP DevKit Server. See [Copilot repository instructions guide](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions).

---

## 1. Review Code Before Suggesting Changes

- **Read existing patterns** before proposing solutions
- Check `src/tools/` for tool implementation patterns
- Reference `CLAUDE.md` for architecture decisions
- Verify token scope requirements in `README.md`

## 2. Security & Token Management

- **Never hardcode tokens or credentials**
- All Mapbox API calls require `MAPBOX_ACCESS_TOKEN` with specific scopes
- Token scope mismatches are the primary failure mode
- Use `VERBOSE_ERRORS=true` for debugging auth issues
- Reference token scope requirements in `README.md` before implementing

## 3. Code Quality & Style

- **TypeScript strict mode** - No implicit any, proper typing required
- **Tool naming** - Tool names (MCP identifiers) must be `snake_case_tool` (e.g., `list_styles_tool`). TypeScript class names follow `PascalCaseTool` convention (e.g., `ListStylesTool`)
- **Schema separation** - Schema in `*.schema.ts`, implementation in `*.tool.ts`
- **Use plop generator** - `npx plop create-tool` for new tools
- **Zod validation** - All tool inputs validated with Zod schemas
- ESLint and Prettier handle formatting - run `npm run lint:fix && npm run format:fix`

## 4. Testing Requirements

- **Run tests before committing** - `npm test`
- **Update snapshots deliberately** - After adding/removing/modifying tools: `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot`
- Never update snapshots without understanding what changed
- Snapshot tests capture tool metadata (TypeScript class names in `PascalCaseTool` format, MCP tool names in `snake_case_tool` format, descriptions)

## 5. Collaboration Standards

- **Focused commits** - One logical change per commit
- **Build before testing** - Always `npm run build` before running
- **Check CI** - Tests must pass before merge
- Reference issues/PRs in commit messages

## 6. When to Avoid Copilot Suggestions

- **Don't auto-accept** tool name changes without verifying snake_case_tool convention
- **Don't merge** schema definitions into tool implementation files
- **Don't skip** snapshot updates after adding/removing tools
- **Don't commit** without running linter and tests

---

**Key files:**

- `docs/engineering_standards.md` — Comprehensive contributor guidelines
- `CLAUDE.md` — Architecture and technical patterns
- `AGENTS.md` — AI agent development guide
- `README.md` — Complete tool reference
- `TOOL_CONFIGURATION.md` — Tool configuration
