# Importing Tools, Resources, Prompts, and Utilities

This guide explains how to import and use Mapbox MCP Devkit tools, resources, prompts, and utilities in your application.

## Table of Contents

- [Quick Start](#quick-start)
- [Usage Patterns](#usage-patterns)
  - [Simple: Pre-configured Instances](#simple-pre-configured-instances-recommended)
  - [Advanced: Tool Classes](#advanced-tool-classes)
  - [Expert: Custom HTTP Pipeline](#expert-custom-http-pipeline)
- [Subpath Exports](#subpath-exports)
- [API Reference](#api-reference)
  - [Tools](#tools-export)
  - [Resources](#resources-export)
  - [Prompts](#prompts-export)
  - [Utils](#utils-export)
- [Registry Functions](#registry-functions)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

The fastest way to get started is using pre-configured instances:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  listStyles,
  createStyle,
  previewStyle
} from '@mapbox/mcp-devkit-server/tools';

const server = new McpServer({
  name: 'my-app',
  version: '1.0.0'
});

// Tools are ready to use - httpRequest already configured
server.tool(listStyles.getSchema(), listStyles.execute.bind(listStyles));
server.tool(createStyle.getSchema(), createStyle.execute.bind(createStyle));
server.tool(previewStyle.getSchema(), previewStyle.execute.bind(previewStyle));
```

## Usage Patterns

### Simple: Pre-configured Instances (Recommended)

Use pre-configured instances when you want tools that work out of the box with sensible defaults.

**Best for:** Most applications, quick prototyping, standard use cases

```typescript
import {
  listStyles,
  createStyle,
  retrieveStyle,
  updateStyle,
  deleteStyle,
  previewStyle,
  styleBuilder,
  geojsonPreview,
  checkColorContrast,
  compareStyles,
  optimizeStyle,
  styleComparison,
  createToken,
  listTokens,
  boundingBox,
  countryBoundingBox,
  coordinateConversion,
  getFeedback,
  listFeedback,
  tilequery,
  validateExpression,
  validateGeojson,
  validateStyle
} from '@mapbox/mcp-devkit-server/tools';

// All instances are ready to use immediately
const result = await listStyles.execute({
  /* params */
});
```

**Benefits:**

- Zero configuration required
- Pre-configured with default HTTP pipeline
- Clean, short import names
- Ideal for single-server applications

### Advanced: Tool Classes

Use tool classes when you need custom instantiation but can use the default HTTP pipeline.

**Best for:** Multiple server instances, custom tool composition, testability

```typescript
import {
  ListStylesTool,
  CreateStyleTool,
  PreviewStyleTool
} from '@mapbox/mcp-devkit-server/tools';
import { httpRequest } from '@mapbox/mcp-devkit-server/utils';

// Create your own instances
const myListStyles = new ListStylesTool({ httpRequest });
const myCreateStyle = new CreateStyleTool({ httpRequest });

// Use them like pre-configured instances
const result = await myListStyles.execute({
  /* params */
});
```

**Benefits:**

- Full control over tool lifecycle
- Easy to test with dependency injection
- Can create multiple instances with different configurations
- Access to default HTTP pipeline

### Expert: Custom HTTP Pipeline

Use a custom HTTP pipeline when you need full control over HTTP behavior.

**Best for:** Custom retry logic, monitoring, rate limiting, advanced error handling

```typescript
import {
  HttpPipeline,
  UserAgentPolicy,
  RetryPolicy
} from '@mapbox/mcp-devkit-server/utils';
import type { HttpRequest } from '@mapbox/mcp-devkit-server/utils';
import { ListStylesTool } from '@mapbox/mcp-devkit-server/tools';

// Build custom pipeline
const pipeline = new HttpPipeline();
pipeline.usePolicy(new UserAgentPolicy('MyDevkitApp/2.0.0'));
pipeline.usePolicy(new RetryPolicy(5, 300, 3000)); // More aggressive retry

const customHttpRequest: HttpRequest = pipeline.execute.bind(pipeline);

// Use with tools
const listStyles = new ListStylesTool({ httpRequest: customHttpRequest });
```

**Benefits:**

- Complete control over HTTP behavior
- Custom policies for monitoring, logging, rate limiting
- Advanced retry strategies
- Integration with external observability systems

## Subpath Exports

The package provides explicit subpath exports for optimal tree-shaking and clean imports:

```typescript
// Main export (server entry point)
import server from '@mapbox/mcp-devkit-server';

// Tools: All 25 devkit tools
import { listStyles, createStyle } from '@mapbox/mcp-devkit-server/tools';

// Resources: 8 resources including UI resources
import { mapboxStyleLayers } from '@mapbox/mcp-devkit-server/resources';

// Prompts: 7 domain-specific prompts
import { createAndPreviewStyle } from '@mapbox/mcp-devkit-server/prompts';

// Utils: HTTP pipeline and types
import { httpRequest, HttpPipeline } from '@mapbox/mcp-devkit-server/utils';
```

## API Reference

### Tools Export

**Location:** `@mapbox/mcp-devkit-server/tools`

#### Tool Classes

All tools can be instantiated with `{ httpRequest }` parameter:

- `ListStylesTool` - List Mapbox styles
- `CreateStyleTool` - Create new styles
- `RetrieveStyleTool` - Get style by ID
- `UpdateStyleTool` - Update existing styles
- `DeleteStyleTool` - Delete styles
- `PreviewStyleTool` - Generate style previews
- `StyleBuilderTool` - Build custom styles interactively
- `GeojsonPreviewTool` - Preview GeoJSON data
- `CheckColorContrastTool` - Validate color accessibility
- `CompareStylesTool` - Compare two styles
- `OptimizeStyleTool` - Optimize style performance
- `StyleComparisonTool` - Detailed style comparison
- `CreateTokenTool` - Create access tokens
- `ListTokensTool` - List access tokens
- `BoundingBoxTool` - Calculate bounding boxes
- `CountryBoundingBoxTool` - Get country bounds
- `CoordinateConversionTool` - Convert coordinate systems
- `GetFeedbackTool` - Retrieve feedback
- `ListFeedbackTool` - List feedback items
- `TilequeryTool` - Query vector tiles
- `ValidateExpressionTool` - Validate Mapbox expressions
- `ValidateGeojsonTool` - Validate GeoJSON
- `ValidateStyleTool` - Validate Mapbox styles

#### Pre-configured Instances

All instances are ready to use with default `httpRequest`:

- `listStyles` - List styles
- `createStyle` - Create style
- `retrieveStyle` - Get style
- `updateStyle` - Update style
- `deleteStyle` - Delete style
- `previewStyle` - Generate preview
- `styleBuilder` - Build custom styles
- `geojsonPreview` - Preview GeoJSON
- `checkColorContrast` - Check color contrast
- `compareStyles` - Compare styles
- `optimizeStyle` - Optimize style
- `styleComparison` - Style comparison tool
- `createToken` - Create token
- `listTokens` - List tokens
- `boundingBox` - Calculate bbox
- `countryBoundingBox` - Country bbox
- `coordinateConversion` - Convert coordinates
- `getFeedback` - Get feedback
- `listFeedback` - List feedback
- `tilequery` - Query tiles
- `validateExpression` - Validate expression
- `validateGeojson` - Validate GeoJSON
- `validateStyle` - Validate style

#### Registry Functions

```typescript
import {
  getCoreTools,
  getElicitationTools,
  getToolByName,
  type ToolInstance
} from '@mapbox/mcp-devkit-server/tools';

// Get all core tools (main devkit functionality)
const coreTools = getCoreTools();

// Get elicitation tools (interactive prompts)
const elicitationTools = getElicitationTools();

// Get specific tool by name
const tool = getToolByName('style_builder_tool');

// Type for tool instances
const myTool: ToolInstance = listStyles;
```

### Resources Export

**Location:** `@mapbox/mcp-devkit-server/resources`

#### Resource Classes

All resources can be instantiated with `{ httpRequest }` parameter (if they need HTTP):

- `MapboxStyleLayersResource` - Layer type reference
- `MapboxStyleSourcesResource` - Source type reference
- `MapboxStyleSpecResource` - Complete style spec
- `TurfGeojsonTypeResource` - GeoJSON type reference
- `ColorScalesResource` - Color scale palettes
- `PreviewStyleUIResource` - Style preview UI
- `StyleBuilderUIResource` - Style builder UI
- `CompareStylesUIResource` - Style comparison UI

#### Pre-configured Instances

- `mapboxStyleLayers` - Layer reference (`mapbox://style-layers`)
- `mapboxStyleSources` - Source reference (`mapbox://style-sources`)
- `mapboxStyleSpec` - Style spec (`mapbox://style-spec`)
- `turfGeojsonType` - GeoJSON types (`turf://geojson-type`)
- `colorScales` - Color scales (`mapbox://color-scales`)
- `previewStyleUI` - Preview UI (`mapbox://preview-style-ui`)
- `styleBuilderUI` - Builder UI (`mapbox://style-builder-ui`)
- `compareStylesUI` - Compare UI (`mapbox://compare-styles-ui`)

#### Registry Functions

```typescript
import {
  getAllResources,
  getResourceByUri,
  type ResourceInstance
} from '@mapbox/mcp-devkit-server/resources';

// Get all resources
const resources = getAllResources();

// Get by URI
const resource = getResourceByUri('mapbox://style-layers');

// Type for resource instances
const myResource: ResourceInstance = mapboxStyleLayers;
```

### Prompts Export

**Location:** `@mapbox/mcp-devkit-server/prompts`

#### Prompt Classes

All prompts are standalone (no dependencies):

- `CreateAndPreviewStylePrompt` - Create and preview styles
- `BuildCustomMapPrompt` - Build custom maps
- `StyleComparisonPrompt` - Compare map styles
- `OptimizeMapStylePrompt` - Optimize styles
- `DebugStyleIssuesPrompt` - Debug style problems
- `CreateTokenPrompt` - Create access tokens
- `ValidateMapDataPrompt` - Validate map data

#### Pre-configured Instances

- `createAndPreviewStyle` - Create and preview
- `buildCustomMap` - Build custom map
- `styleComparison` - Compare styles
- `optimizeMapStyle` - Optimize style
- `debugStyleIssues` - Debug issues
- `createToken` - Create token
- `validateMapData` - Validate data

#### Registry Functions

```typescript
import {
  getAllPrompts,
  getPromptByName,
  type PromptInstance
} from '@mapbox/mcp-devkit-server/prompts';

// Get all prompts
const prompts = getAllPrompts();

// Get by name
const prompt = getPromptByName('create-and-preview-style');

// Type for prompt instances
const myPrompt: PromptInstance = createAndPreviewStyle;
```

### Utils Export

**Location:** `@mapbox/mcp-devkit-server/utils`

#### HTTP Pipeline

```typescript
import {
  httpRequest, // Pre-configured default pipeline
  systemHttpPipeline, // Direct access to pipeline instance
  HttpPipeline, // Class for custom pipelines
  UserAgentPolicy, // User-Agent header policy
  RetryPolicy, // Retry with exponential backoff
  type HttpPolicy, // Interface for custom policies
  type HttpRequest // Function signature for HTTP execution
} from '@mapbox/mcp-devkit-server/utils';

// Use default
const response = await httpRequest(new Request('https://api.mapbox.com'));

// Create custom pipeline
const pipeline = new HttpPipeline();
pipeline.usePolicy(new UserAgentPolicy('MyApp/1.0'));
pipeline.usePolicy(new RetryPolicy(3, 100, 1000));
const customRequest = pipeline.execute.bind(pipeline);
```

#### Custom Policies

Implement `HttpPolicy` interface:

```typescript
import type { HttpPolicy, HttpRequest } from '@mapbox/mcp-devkit-server/utils';

class LoggingPolicy implements HttpPolicy {
  async execute(request: Request, next: HttpRequest): Promise<Response> {
    console.log(`${request.method} ${request.url}`);
    const response = await next(request);
    console.log(`Response: ${response.status}`);
    return response;
  }
}
```

## Registry Functions

Registry functions provide batch access to tools, resources, and prompts:

### Tool Registry

```typescript
import {
  getCoreTools,
  getElicitationTools,
  getToolByName
} from '@mapbox/mcp-devkit-server/tools';

// Core tools: main devkit functionality (style management, validation, etc.)
const coreTools = getCoreTools();
for (const tool of coreTools) {
  server.tool(tool.getSchema(), tool.execute.bind(tool));
}

// Elicitation tools: interactive prompts and UIs
const elicitationTools = getElicitationTools();

// Get specific tool
const styleBuilder = getToolByName('style_builder_tool');
```

### Resource Registry

```typescript
import {
  getAllResources,
  getResourceByUri
} from '@mapbox/mcp-devkit-server/resources';

// Register all resources
const resources = getAllResources();
for (const resource of resources) {
  server.resource(resource.getSchema(), resource.read.bind(resource));
}

// Get by URI
const layers = getResourceByUri('mapbox://style-layers');
```

### Prompt Registry

```typescript
import {
  getAllPrompts,
  getPromptByName
} from '@mapbox/mcp-devkit-server/prompts';

// Register all prompts
const prompts = getAllPrompts();
for (const prompt of prompts) {
  server.prompt(prompt.getSchema(), prompt.execute.bind(prompt));
}

// Get by name
const createPrompt = getPromptByName('create-and-preview-style');
```

## Best Practices

### Choosing the Right Pattern

1. **Use pre-configured instances** if you:
   - Want the fastest setup
   - Need standard retry/User-Agent behavior
   - Have a single MCP server

2. **Use tool classes** if you:
   - Need multiple tool instances
   - Want explicit dependency injection
   - Are writing tests
   - Still want default HTTP behavior

3. **Use custom pipeline** if you:
   - Need custom retry logic
   - Want to add monitoring/logging
   - Integrate with observability systems
   - Need rate limiting or custom policies

### Organizing Imports

Group imports by type for clarity:

```typescript
// Tools
import { listStyles, createStyle } from '@mapbox/mcp-devkit-server/tools';

// Resources
import { mapboxStyleLayers } from '@mapbox/mcp-devkit-server/resources';

// Prompts
import { createAndPreviewStyle } from '@mapbox/mcp-devkit-server/prompts';

// Utils (if needed)
import { httpRequest } from '@mapbox/mcp-devkit-server/utils';
```

### Tree-Shaking

Import only what you need - unused exports will be tree-shaken by modern bundlers:

```typescript
// ✅ Good: Only imports what you use
import { listStyles, createStyle } from '@mapbox/mcp-devkit-server/tools';

// ❌ Avoid: Imports entire module (but still tree-shakeable)
import * as tools from '@mapbox/mcp-devkit-server/tools';
```

### Testing

Use tool classes with dependency injection for easy testing:

```typescript
import { ListStylesTool } from '@mapbox/mcp-devkit-server/tools';
import type { HttpRequest } from '@mapbox/mcp-devkit-server/utils';

// Mock httpRequest
const mockHttpRequest: HttpRequest = async (request: Request) => {
  return new Response(JSON.stringify({ styles: [] }));
};

// Inject mock
const tool = new ListStylesTool({ httpRequest: mockHttpRequest });

// Test without real HTTP calls
const result = await tool.execute({});
```

## Troubleshooting

### Module Not Found Errors

If you see errors like `Cannot find module '@mapbox/mcp-devkit-server/tools'`:

1. Ensure you're on the latest version: `npm install @mapbox/mcp-devkit-server@latest`
2. Check your Node.js version: Requires Node.js 22+ LTS
3. Verify your bundler supports `exports` field in package.json

### TypeScript Errors

If TypeScript can't find types:

1. Ensure `moduleResolution` is set to `"node16"` or `"bundler"` in `tsconfig.json`
2. Check that `"type": "module"` is in your package.json (for ESM)
3. Update TypeScript to 5.0+: `npm install -D typescript@latest`

Example `tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "node16",
    "moduleResolution": "node16",
    "target": "ES2022",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### CommonJS vs ESM

This package supports both:

```typescript
// ESM (recommended)
import { listStyles } from '@mapbox/mcp-devkit-server/tools';

// CommonJS
const { listStyles } = require('@mapbox/mcp-devkit-server/tools');
```

The appropriate build is automatically selected based on your `package.json` `"type"` field.

### Custom Pipeline Not Working

If your custom pipeline isn't being used:

```typescript
// ✅ Correct: Bind the execute method
const httpRequest = pipeline.execute.bind(pipeline);
const tool = new ListStylesTool({ httpRequest });

// ❌ Wrong: Passing unbound method loses 'this' context
const tool = new ListStylesTool({ httpRequest: pipeline.execute });
```

### Import Name Conflicts

If you have naming conflicts with pre-configured instances:

```typescript
// Use aliases
import {
  listStyles as mapboxListStyles,
  createStyle as mapboxCreateStyle
} from '@mapbox/mcp-devkit-server/tools';

// Or use classes directly
import {
  ListStylesTool,
  CreateStyleTool
} from '@mapbox/mcp-devkit-server/tools';
import { httpRequest } from '@mapbox/mcp-devkit-server/utils';

const myListStyles = new ListStylesTool({ httpRequest });
const myCreateStyle = new CreateStyleTool({ httpRequest });
```

## Examples

See [examples/import-example.ts](../examples/import-example.ts) for complete working examples of all patterns.

## Further Reading

- [Engineering Standards](./engineering_standards.md) - Development guidelines
- [Tracing](./tracing.md) - OpenTelemetry setup
- [Style Builder](./STYLE_BUILDER.md) - Interactive style building
- [Integration Guides](./claude-desktop-integration.md) - Setup with various tools
