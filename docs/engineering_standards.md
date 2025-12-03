# Mapbox MCP DevKit Server Engineering Standards

This document establishes comprehensive guidelines for contributors to the Mapbox MCP DevKit server project.

## Core Principles

**Code Quality Requirements:**

All code must be written in TypeScript. No JavaScript files in `src/` or `test/`. Contributors must ensure their work passes both ESLint and Prettier checks before committing:

```bash
npm run lint:fix
npm run format:fix
```

Key requirements:

- Maintain strict typing conventions (`strict: true` in tsconfig.json)
- Avoid `any` types; add explanatory comments if unavoidable
- Never patch global objects (e.g., `global.fetch`)
- Follow tool naming conventions: Tool names (MCP identifiers) must be `snake_case_tool` (e.g., `list_styles_tool`). TypeScript class names follow `PascalCaseTool` convention (e.g., `ListStylesTool`)
- Separate schema definitions (`*.schema.ts`) from implementation (`*.tool.ts`)

**Testing Expectations:**

New features require unit tests with coverage goals targeting critical logic paths. The project uses Vitest as its testing framework, with tests colocated alongside source files in tool directories.

Critical testing rules:

- Mock external services and APIs; do not make real network calls in tests
- After adding/removing tools, update snapshots: `npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot`
- Never update snapshots without understanding what changed
- Test files follow the pattern: `*.test.ts` alongside `*.tool.ts` and `*.schema.ts`

**Documentation Standards:**

All public interfaces require JSDoc comments. User-facing modifications must be documented:

- Update `README.md` for new tools or setup changes
- Update `TOOL_CONFIGURATION.md` for configuration changes
- Reference `CLAUDE.md` for architectural decisions
- Maintain changelog entries for significant changes

## Technical Implementation

**Tool Architecture:**

All tools must extend `BaseTool<InputSchema, OutputSchema>` from `src/tools/BaseTool.ts`. Tools auto-validate inputs using Zod schemas.

Tool creation workflow:

1. Run `npx plop create-tool` (provide name without "Tool" suffix)
2. Implement Zod schema in `*.schema.ts`
3. Implement tool logic in `*.tool.ts`
4. Add unit tests in `*.test.ts`
5. Export from `src/tools/index.ts` for auto-registration

**HTTP Request Handling:**

Use the `HttpPipeline` abstraction for all HTTP operations. Never patch `global.fetch`. Apply policies (User-Agent, Retry) through the pipeline:

```typescript
import { HttpPipeline } from '../utils/httpPipeline.js';

const pipeline = new HttpPipeline();
const response = await pipeline.execute(url, options);
```

This approach supports dependency injection and maintains testability. See `src/utils/httpPipeline.ts:20` for implementation details.

**Token Management:**

All Mapbox API tools require `MAPBOX_ACCESS_TOKEN` with specific scopes:

- Tools receive tokens via `extra.authInfo.token` or `process.env.MAPBOX_ACCESS_TOKEN`
- Document required scopes in `README.md` for each tool
- Token scope mismatches are the primary failure mode
- Use `VERBOSE_ERRORS=true` for debugging authentication issues

**Resource System:**

Static reference data should be exposed as MCP resources using URI pattern `resource://mapbox-*`. Resources provide:

- Style layer specifications
- Streets v8 field definitions
- Token scope documentation
- Layer type mappings

See `src/resources/` for examples.

**Collaboration Workflow:**

Changes flow through pull requests requiring approval from core maintainers:

- Keep PRs focused on a single logical change
- Reference issues in PR descriptions
- Run tests and linting before pushing: `npm test && npm run lint`
- Build must succeed: `npm run build`

## Security and DevOps

**Environment Variables:**

Keep secrets out of repositories. Use environment variables for sensitive data:

- `MAPBOX_ACCESS_TOKEN` - Required for all Mapbox API operations
- `VERBOSE_ERRORS` - Set to `true` for detailed error messages
- `ENABLE_MCP_UI` - Controls MCP-UI support (default: `true`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry endpoint (optional)
- `OTEL_SERVICE_NAME` - Override service name for tracing (optional)

**OpenTelemetry Configuration:**

Observability is opt-in via OpenTelemetry. Enable only when debugging:

- Tracing is disabled by default
- Set `OTEL_EXPORTER_OTLP_ENDPOINT` to enable
- Use Jaeger for local development: `npm run tracing:jaeger:start`
- See `docs/tracing.md` for detailed configuration

**Docker:**

The project includes Docker support for containerized deployment:

```bash
docker build -t mapbox-mcp-devkit .
docker run -e MAPBOX_ACCESS_TOKEN="..." mapbox-mcp-devkit
```

## Quick Start Commands

Setup and development workflow:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build project
npm run build

# Lint and format
npm run lint:fix
npm run format:fix

# Generate new tool
npx plop create-tool

# Interactive testing
npm run inspect:build

# Create DXT package
npx @anthropic-ai/dxt pack
```

## Common Pitfalls

**Avoid these mistakes:**

1. ❌ Using `any` type without comments
2. ❌ Patching `global.fetch` instead of using `HttpPipeline`
3. ❌ Making real network calls in tests
4. ❌ Forgetting to update snapshots after tool changes
5. ❌ Tool names not following `snake_case_tool` convention (e.g., using `listStyles` instead of `list_styles_tool`)
6. ❌ Schema and implementation in same file
7. ❌ Hardcoding tokens or credentials
8. ❌ Missing required token scopes in documentation
9. ❌ Committing without running linter and tests
10. ❌ Auto-updating snapshots without reviewing changes

## References

- `CLAUDE.md` - Architecture and technical patterns
- `AGENTS.md` - AI agent development guide
- `README.md` - Complete tool reference and token scopes
- `TOOL_CONFIGURATION.md` - Tool enable/disable configuration
- `docs/tracing.md` - OpenTelemetry setup and configuration
