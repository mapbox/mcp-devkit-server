# Mapbox Developer MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with direct access to Mapbox developer APIs. This server enables AI models to interact with Mapbox services, helping developers build Mapbox applications more efficiently.

https://github.com/user-attachments/assets/8b1b8ef2-9fba-4951-bc9a-beaed4f6aff6

## Table of Contents

- [Mapbox Developer MCP Server](#mapbox-developer-mcp-server)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
    - [Integration with Developer Tools](#integration-with-developer-tools)
    - [DXT Package Distribution](#dxt-package-distribution)
      - [Creating the DXT Package](#creating-the-dxt-package)
    - [Hosted MCP Endpoint](#hosted-mcp-endpoint)
    - [Getting Your Mapbox Access Token](#getting-your-mapbox-access-token)
  - [Tools](#tools)
    - [Documentation Tools](#documentation-tools)
    - [Reference Tools](#reference-tools)
    - [Style Management Tools](#style-management-tools)
    - [Token Management Tools](#token-management-tools)
      - [create-token](#create-token)
      - [list-tokens](#list-tokens)
    - [Feedback Tools](#feedback-tools)
    - [Local Processing Tools](#local-processing-tools)
      - [GeoJSON Preview tool (Beta)](#geojson-preview-tool-beta)
      - [Coordinate Conversion tool](#coordinate-conversion-tool)
      - [Bounding Box tool](#bounding-box-tool)
  - [Resources](#resources)
  - [Observability \& Tracing](#observability--tracing)
    - [Features](#features)
    - [Quick Start with Jaeger](#quick-start-with-jaeger)
    - [Supported Backends](#supported-backends)
    - [Documentation](#documentation)
    - [Environment Variables](#environment-variables)
  - [Development](#development)
    - [Testing](#testing)
      - [Tool Snapshot Tests](#tool-snapshot-tests)
    - [Inspecting Server](#inspecting-server)
      - [Using Node.js](#using-nodejs)
      - [Using Docker](#using-docker)
    - [Creating New Tools](#creating-new-tools)
    - [Environment Variables](#environment-variables-1)
      - [VERBOSE_ERRORS](#verbose_errors)
  - [Troubleshooting](#troubleshooting)
  - [Contributing](#contributing)

## Quick Start

### Integration with Developer Tools

Get started by integrating with your preferred AI development environment:

- [Claude Code Integration](./docs/claude-code-integration.md) - Command-line development with Claude
- [Claude Desktop Integration](./docs/claude-desktop-integration.md) - Desktop application integration
- [Cursor Integration](./docs/cursor-integration.md) - Cursor IDE integration
- [VS Code Integration](./docs/vscode-integration.md) - Visual Studio Code with GitHub Copilot

### DXT Package Distribution

This MCP server can be packaged as a DXT (Desktop Extension) file for easy distribution and installation. DXT is a standardized format for distributing local MCP servers, similar to browser extensions.

#### Creating the DXT Package

To create a DXT package:

```bash
# Install the DXT CLI tool
npm install -g @anthropic-ai/dxt

# Build the server first
npm run build

# Create the DXT package
npx @anthropic-ai/dxt pack
```

This will generate `mcp-devkit-server.dxt` using the configuration in `manifest.json`.

The DXT package includes:

- Pre-built server code (`dist/esm/index.js`)
- Server metadata and configuration
- User configuration schema for the Mapbox access token
- Automatic environment variable setup

### Hosted MCP Endpoint

For quick access, you can use our hosted MCP endpoint:

**Endpoint**: https://mcp-devkit.mapbox.com/mcp

For detailed setup instructions for different clients and API usage, see the [Hosted MCP Server Guide](https://github.com/mapbox/mcp-server/blob/main/docs/hosted-mcp-guide.md). Note: This guide references the standard MCP endpoint - you'll need to update the endpoint URL to use the devkit endpoint above.

### Getting Your Mapbox Access Token

**A Mapbox access token is required to use this MCP server.**

1. Sign up for a free Mapbox account at [mapbox.com/signup](https://www.mapbox.com/signup/)
2. Navigate to your [Account page](https://account.mapbox.com/)
3. Create a new token with the required scopes for your use case

For more information about Mapbox access tokens, see the [Mapbox documentation on access tokens](https://docs.mapbox.com/help/dive-deeper/access-tokens/).

**⚠️ IMPORTANT: Token Privileges Required**

The `MAPBOX_ACCESS_TOKEN` environment variable is required. **Each tool requires specific token scopes/privileges to function properly.** For example:

- Reading styles requires `styles:read` scope
- Creating styles requires `styles:write` scope
- Managing tokens requires `tokens:read` and `tokens:write` scopes
- Accessing feedback requires `user-feedback:read` scope

## Tools

### Documentation Tools

**get_latest_mapbox_docs_tool** - Access the latest official Mapbox documentation directly from the source. This tool fetches comprehensive, up-to-date information about all Mapbox APIs, SDKs, and developer resources from docs.mapbox.com/llms.txt.

**Example prompts:**

- "What are the latest Mapbox APIs available for developers?"
- "Show me all current Mapbox services and SDKs"
- "I need up-to-date Mapbox documentation for my project"
- "What mapping solutions does Mapbox offer for my tech stack?"
- "Give me an overview of Mapbox's navigation and routing capabilities"
- "Compare Mapbox web SDKs versus mobile SDKs"
- "What's new in the Mapbox ecosystem?"

📖 **[See more examples and interactive demo →](./docs/mapbox-docs-tool-demo.md)**

### Reference Tools

**get_reference_tool** - Access static Mapbox reference documentation and schemas. This tool provides essential reference information that helps AI assistants understand Mapbox concepts and build correct styles and tokens.

> **Note:** This tool exists as a workaround for Claude Desktop's current limitation with MCP resources. Claude Desktop can see resources (via `resources/list`) but doesn't automatically call `resources/read` to fetch their content. This tool provides the same reference data through the tool interface, which Claude Desktop does support. Other MCP clients that fully support the resources protocol can access this data directly as MCP Resources (see [Resources](#resources) section below).

**Available References:**

- **`resource://mapbox-style-layers`** - Mapbox GL JS style specification reference guide covering all layer types (fill, line, symbol, circle, fill-extrusion) and their properties
- **`resource://mapbox-streets-v8-fields`** - Complete field definitions for all Mapbox Streets v8 source layers, including enumerated values for each field (useful for building filters)
- **`resource://mapbox-token-scopes`** - Comprehensive token scope reference explaining what each scope allows and which scopes are needed for different operations
- **`resource://mapbox-layer-type-mapping`** - Mapping of Mapbox Streets v8 source layers to compatible GL JS layer types, with common usage patterns

**Example prompts:**

- "What fields are available for the landuse layer?"
- "Show me the token scopes reference"
- "What layer type should I use for roads?"
- "Get the Streets v8 fields reference"
- "What scopes do I need to display a map?"

### Style Management Tools

Complete set of tools for managing Mapbox styles via the Styles API:

**Style Builder Tool** - Create and modify Mapbox styles programmatically through conversational prompts

📖 **[See the Style Builder documentation for detailed usage and examples →](./docs/STYLE_BUILDER.md)**

**ListStylesTool** - List all styles for a Mapbox account

- Input: `limit` (optional - max number of styles), `start` (optional - pagination token)
- Returns: Array of style metadata with optional pagination info

**CreateStyleTool** - Create a new Mapbox style

- Input: `name`, `style` (Mapbox style specification)
- Returns: Created style details with ID

**RetrieveStyleTool** - Retrieve a specific style by ID

- Input: `styleId`
- Returns: Complete style specification

**UpdateStyleTool** - Update an existing style

- Input: `styleId`, `name` (optional), `style` (optional)
- Returns: Updated style details

**DeleteStyleTool** - Delete a style by ID

- Input: `styleId`
- Returns: Success confirmation

**PreviewStyleTool** - Generate preview URL for a Mapbox style using an existing public token

- Input: `styleId`, `title` (optional), `zoomwheel` (optional), `zoom` (optional), `center` (optional), `bearing` (optional), `pitch` (optional)
- Returns: URL to open the style preview in browser
- **Note**: This tool automatically fetches the first available public token from your account for the preview URL. Requires at least one public token with `styles:read` scope.

**⚠️ Required Token Scopes:**

**All style tools require a valid Mapbox access token with specific scopes. Using a token without the correct scope will result in authentication errors.**

- **ListStylesTool**: Requires `styles:list` scope
- **CreateStyleTool**: Requires `styles:write` scope
- **RetrieveStyleTool**: Requires `styles:download` scope
- **UpdateStyleTool**: Requires `styles:write` scope
- **DeleteStyleTool**: Requires `styles:write` scope
- **PreviewStyleTool**: Requires `tokens:read` scope (to list tokens) and at least one public token with `styles:read` scope

**Note:** The username is automatically extracted from the JWT token payload.

**Example prompts:**

- "Can you create a Christmas themed Style for me?"
- "Please generate a preview link for this style"
- "Can you change the background to snow style?"

### Token Management Tools

#### create-token

Create a new Mapbox access token with specified scopes and optional URL restrictions.

**Parameters:**

- `note` (string, required): Description of the token
- `scopes` (array of strings, required): Array of scopes/permissions for the token. Must be valid Mapbox scopes (see below)
- `allowedUrls` (array of strings, optional): URLs where the token can be used (max 100)
- `expires` (string, optional): Expiration time in ISO 8601 format (maximum 1 hour in the future)

**Available Scopes:**

Available scopes for public tokens:

- `styles:tiles` - Read styles as raster tiles
- `styles:read` - Read styles
- `fonts:read` - Read fonts
- `datasets:read` - Read datasets
- `vision:read` - Read Vision API

**Example:**

```json
{
  "note": "Development token for my app",
  "scopes": ["styles:read", "fonts:read"],
  "allowedUrls": ["https://myapp.com"]
}
```

**Example prompts:**

- "Create a new Mapbox token for my web app with styles:read and fonts:read permissions"
- "Generate a token that expires in 30 minutes with styles:tiles and vision:read scopes"
- "Create a restricted token that only works on https://myapp.com with styles:read, fonts:read, and datasets:read"

#### list-tokens

List Mapbox access tokens for the authenticated user with optional filtering and pagination.

**Parameters:**

- `default` (boolean, optional): Filter to show only the default public token
- `limit` (number, optional): Maximum number of tokens to return per page (1-100)
- `sortby` (string, optional): Sort tokens by "created" or "modified" timestamp
- `start` (string, optional): The token ID after which to start the listing (when provided, auto-pagination is disabled)
- `usage` (string, optional): Filter by token type: "pk" (public)

**Pagination behavior:**

- When no `start` parameter is provided, the tool automatically fetches all pages of results
- When a `start` parameter is provided, only the requested page is returned (for manual pagination control)

**Example:**

```json
{
  "limit": 10,
  "sortby": "created",
  "usage": "pk"
}
```

**Example prompts:**

- "List all my Mapbox tokens"
- "Show me my public tokens sorted by creation date"
- "Find my default public token"
- "List the 5 most recently modified tokens"
- "Show all public tokens in my account"

### Feedback Tools

Access user feedback items from the Mapbox Feedback API. These tools allow you to retrieve and view user-reported issues, suggestions, and feedback about map data, routing, and POI details.

**list_feedback_tool** - List user feedback items with comprehensive filtering, sorting, and pagination options.

**Parameters:**

- `feedback_ids` (array of UUIDs, optional): Filter by one or more feedback item IDs
- `after` (string, optional): Cursor from a previous response for pagination
- `limit` (number, optional): Maximum number of items to return (1-1000, default varies)
- `sort_by` (string, optional): Sort field - `received_at` (default), `created_at`, or `updated_at`
- `order` (string, optional): Sort direction - `asc` (default) or `desc`
- `status` (array, optional): Filter by status - `received`, `fixed`, `reviewed`, `out_of_scope`
- `category` (array, optional): Filter by feedback categories
- `search` (string, optional): Search phrase to match against feedback text
- `trace_id` (array, optional): Filter by trace IDs
- `created_before`, `created_after` (ISO 8601 string, optional): Filter by creation date range
- `received_before`, `received_after` (ISO 8601 string, optional): Filter by received date range
- `updated_before`, `updated_after` (ISO 8601 string, optional): Filter by update date range
- `format` (string, optional): Output format - `formatted_text` (default) or `json_string`

**Returns:** Paginated list of feedback items with pagination cursors.

**get_feedback_tool** - Get a single user feedback item by its unique ID.

**Parameters:**

- `feedback_id` (UUID, required): The unique identifier of the feedback item
- `format` (string, optional): Output format - `formatted_text` (default) or `json_string`

**Returns:** Single feedback item with details including status, category, feedback text, location, and timestamps.

**⚠️ Required Token Scope:**

- **Both feedback tools**: Require `user-feedback:read` scope on the access token

**Example prompts:**

- "List all feedback items with status 'fixed'"
- "Show me feedback items in the 'poi_details' category created after July 1st"
- "Get feedback item with ID 40eae4c7-b157-4b49-a091-7e1099bba77e"
- "Find feedback items containing 'apartment building' in the feedback text"
- "List all routing issue feedback from the last month"

### Local Processing Tools

#### GeoJSON Preview tool (Beta)

Generate a geojson.io URL to visualize GeoJSON data. This tool:

- Validates GeoJSON format (Point, LineString, Polygon, Feature, FeatureCollection, etc.)
- Returns a direct URL to geojson.io for instant visualization
- Supports both GeoJSON objects and JSON strings as input

**Example usage:**

```json
{
  "geojson": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  }
}
```

**Returns:** A single URL string that can be opened in a browser to view the GeoJSON data.

**Note:** This is a beta feature currently optimized for small to medium-sized GeoJSON files. Large GeoJSON files may result in very long URLs and slower performance. We plan to optimize this in future versions by implementing alternative approaches for handling large datasets.

**Example prompts:**

- "Generate a preview URL for this GeoJSON data"
- "Create a geojson.io link for my uploaded route.geojson file"

#### Coordinate Conversion tool

Convert coordinates between different coordinate reference systems (CRS), specifically between WGS84 (EPSG:4326) and Web Mercator (EPSG:3857).

**Parameters:**

- `coordinates` (array, required): Array of coordinate pairs to convert. Each coordinate pair should be `[longitude, latitude]` for WGS84 or `[x, y]` for Web Mercator
- `fromCRS` (string, required): Source coordinate reference system. Supported values: `"EPSG:4326"` (WGS84), `"EPSG:3857"` (Web Mercator)
- `toCRS` (string, required): Target coordinate reference system. Supported values: `"EPSG:4326"` (WGS84), `"EPSG:3857"` (Web Mercator)

**Returns:**

An array of converted coordinate pairs in the target CRS format.

**Example:**

```json
{
  "coordinates": [
    [-122.4194, 37.7749],
    [-74.006, 40.7128]
  ],
  "fromCRS": "EPSG:4326",
  "toCRS": "EPSG:3857"
}
```

**Example prompts:**

- "Convert these coordinates from WGS84 to Web Mercator: [-122.4194, 37.7749] and [-74.006, 40.7128]"
- "Convert the coordinates [-13627361.0, 4544761.0] from Web Mercator to WGS84"

#### Bounding Box tool

Calculates the bounding box of given GeoJSON content, returning coordinates as [minX, minY, maxX, maxY].

**Parameters:**

- `geojson` (string or object, required): GeoJSON content to calculate bounding box for. Can be provided as:
  - A JSON string that will be parsed
  - A GeoJSON object

**Supported GeoJSON types:**

- Point
- LineString
- Polygon
- MultiPoint
- MultiLineString
- MultiPolygon
- GeometryCollection
- Feature
- FeatureCollection

**Returns:**

An array of four numbers representing the bounding box: `[minX, minY, maxX, maxY]`

- `minX`: Western-most longitude
- `minY`: Southern-most latitude
- `maxX`: Eastern-most longitude
- `maxY`: Northern-most latitude

**Example:**

```json
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-73.9857, 40.7484]
        },
        "properties": {}
      },
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-74.006, 40.7128]
        },
        "properties": {}
      }
    ]
  }
}
```

**Example prompts:**

- "Calculate the bounding box of this GeoJSON file" (then upload a .geojson file)
- "What's the bounding box for the coordinates in the uploaded parks.geojson file?"

## Agent Skills

This repository includes [Agent Skills](https://agentskills.io) that provide domain expertise for building maps with Mapbox. Skills teach AI assistants about map design, security best practices, and common implementation patterns.

**Available Skills:**

- **🎨 mapbox-cartography**: Map design principles, color theory, visual hierarchy, typography
- **🔐 mapbox-token-security**: Token management, scope control, URL restrictions, rotation strategies
- **📐 mapbox-style-patterns**: Common style patterns and layer configurations for typical scenarios

Skills complement the MCP server by providing expertise (how to think about design) while tools provide capabilities (how to execute actions).

For complete documentation and usage instructions, see [skills/README.md](./skills/README.md).

### Using Skills with Claude Code

To use these skills in Claude Code, create a symlink:

```bash
mkdir -p .claude
ln -s ../skills .claude/skills
```

Or copy to your global skills directory:

```bash
cp -r skills/* ~/.claude/skills/
```

### Using Skills with Claude API

Upload skills as zip files via the Skills API. See [Claude API Skills documentation](https://docs.anthropic.com/en/build-with-claude/skills-guide).

## Resources

This server exposes static reference documentation as MCP Resources. While these are primarily accessed through the `get_reference_tool`, MCP clients that fully support the resources protocol can access them directly.

**Available Resources:**

1. **Mapbox Style Specification Guide** (`resource://mapbox-style-layers`)
   - Complete reference for Mapbox GL JS layer types and properties
   - Covers fill, line, symbol, circle, and fill-extrusion layers
   - Includes paint and layout properties for each layer type

2. **Mapbox Streets v8 Fields Reference** (`resource://mapbox-streets-v8-fields`)
   - Field definitions for all Streets v8 source layers
   - Enumerated values for filterable fields
   - Essential for building accurate style filters
   - Example: `landuse` layer has `class` field with values like `park`, `cemetery`, `hospital`, etc.

3. **Mapbox Token Scopes Reference** (`resource://mapbox-token-scopes`)
   - Comprehensive documentation of token scopes
   - Explains public vs. secret token scopes
   - Common scope combinations for different use cases
   - Best practices for token management

4. **Mapbox Layer Type Mapping** (`resource://mapbox-layer-type-mapping`)
   - Maps Streets v8 source layers to compatible GL JS layer types
   - Organized by geometry type (polygon, line, point)
   - Includes common usage patterns and examples
   - Helps avoid incompatible layer type/source layer combinations

**Accessing Resources:**

- **Claude Desktop & Most MCP Clients**: Use the `get_reference_tool` to access these references
- **Future MCP Clients**: May support direct resource access via the MCP resources protocol

**Note:** Resources provide static reference data that doesn't change frequently, while tools provide dynamic, user-specific data (like listing your styles or tokens) and perform actions (like creating styles or tokens).

## Observability & Tracing

This server includes comprehensive distributed tracing using OpenTelemetry (OTEL) for production-ready observability.

### Features

- **Opt-in Configuration**: Tracing is disabled by default, enabling it requires only setting an OTLP endpoint
- **Tool Execution Tracing**: Automatic instrumentation of all tool executions with timing, success/failure status, and error details
- **HTTP Request Instrumentation**: Complete request/response tracing for Mapbox API calls with CloudFront correlation IDs
- **Configuration Tracing**: Startup configuration loading with error tracking
- **Security**: Input/output sizes logged but content is protected
- **Low Overhead**: <1% CPU impact, ~10MB memory for trace buffers

### Quick Start with Jaeger

```bash
# 1. Start Jaeger (Docker required)
npm run tracing:jaeger:start

# 2. Configure environment
cp .env.example .env
# Edit .env to add MAPBOX_ACCESS_TOKEN
# OTEL_EXPORTER_OTLP_ENDPOINT is already set to http://localhost:4318

# 3. Run the server
npm run inspect:build

# 4. View traces at http://localhost:16686

# 5. Stop Jaeger when done
npm run tracing:jaeger:stop
```

### Supported Backends

The server supports **any OTLP-compatible backend** including:

- **Development**: Jaeger (local Docker)
- **Cloud Providers**: AWS X-Ray, Azure Monitor, Google Cloud Trace
- **SaaS Platforms**: Datadog, New Relic, Honeycomb

See `.env.example` for configuration examples for each platform.

### Documentation

- **[Complete Tracing Guide](./docs/tracing.md)** - Detailed configuration, features, and integration examples
- **[Verification Guide](./docs/tracing-verification.md)** - Step-by-step verification and troubleshooting

### Environment Variables

```bash
# Enable tracing (required)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Optional configuration
OTEL_SERVICE_NAME=mapbox-mcp-devkit-server
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% for high-volume
```

## Development

### Testing

#### Tool Snapshot Tests

The project includes snapshot tests to ensure tool integrity and prevent accidental additions or removals of tools. These tests automatically discover all tools and create a snapshot of their metadata.

**What the snapshot test covers:**

- Tool class names (TypeScript classes follow `PascalCaseTool` convention, e.g., `ListStylesTool`)
- Tool names (MCP identifiers must follow `snake_case_tool` convention, e.g., `list_styles_tool`)
- Tool descriptions

**When to update snapshots:**

1. **Adding a new tool**: After creating a new tool, run the test with snapshot update flag:

   ```sh
   npm test -- test/tools/tool-naming-convention.test.ts --updateSnapshot
   ```

2. **Removing a tool**: After removing a tool, update the snapshot:

   ```sh
   npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot
   ```

3. **Modifying tool metadata**: If you change a tool's name or description, update the snapshot:
   ```sh
   npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot
   ```

**Running snapshot tests:**

```sh
# Run all tests (snapshot will fail if tools have changed)
npm test

# Update snapshots after intentional changes
npm test -- --updateSnapshot
```

**Important**: Only update snapshots when you have intentionally added, removed, or modified tools. Unexpected snapshot failures indicate accidental changes to the tool structure.

### Inspecting Server

#### Using Node.js

```sh
# Run the built image
npm run inspect:build
```

#### Using Docker

```sh
# Build the Docker image
docker build -t mapbox-mcp-devkit .

# Run and inspect the server
npx @modelcontextprotocol/inspector docker run -i --rm --env MAPBOX_ACCESS_TOKEN="YOUR_TOKEN" mapbox-mcp-devkit
```

### Creating New Tools

```sh
npx plop create-tool
# 1. Choose tool type:
#    - Mapbox tool (makes API calls to Mapbox services)
#    - Local tool (local processing, no API calls)
# 2. Provide tool name without suffix using PascalCase (e.g. Search)
```

**Generated file structure:**

The plop generator creates three files for each new tool:

```
src/tools/your-tool-name-tool/
├── YourToolNameTool.schema.ts    # Input schema definition and types
├── YourToolNameTool.ts           # Main tool implementation
└── YourToolNameTool.test.ts      # Unit tests
```

**After creating a new tool:**

1. **Update the input schema** in `YourToolNameTool.schema.ts`:
   - Define the input parameters using Zod schema
   - Export both the schema and the inferred TypeScript type
2. **Update the tool description** in `YourToolNameTool.ts`:
   - Provide a clear description of what the tool does
3. **Implement the tool logic** in the `execute` method

4. **Update test cases** with actual test data in `YourToolNameTool.test.ts`

5. **Update the snapshot test** to include the new tool:

   ```sh
   npm test -- src/tools/tool-naming-convention.test.ts --updateSnapshot
   ```

6. **Run all tests** to ensure everything works:
   ```sh
   npm test
   ```

**Schema separation benefits:**

- Better code organization with separate schema files
- Easier maintenance when schema changes
- Consistent with existing tools in the project
- Enhanced TypeScript type safety

### Environment Variables

#### VERBOSE_ERRORS

Set `VERBOSE_ERRORS=true` to get detailed error messages from the MCP server. This is useful for debugging issues when integrating with MCP clients.

By default, the server returns generic error messages. With verbose errors enabled, you'll receive the actual error details, which can help diagnose API connection issues, invalid parameters, or other problems.

#### ENABLE_MCP_UI

**MCP-UI Support (Enabled by Default)**

MCP-UI allows tools that return URLs to also return interactive iframe resources that can be embedded directly in supporting MCP clients. **This is enabled by default** and is fully backwards compatible with all MCP clients.

**Supported Tools:**

- `preview_style_tool` - Embeds Mapbox style previews
- `geojson_preview_tool` - Embeds geojson.io visualizations
- `style_comparison_tool` - Embeds side-by-side style comparisons

**How it Works:**

- Tools return **both** a text URL (always works) and a UIResource for iframe embedding
- Clients that don't support MCP-UI (like Claude Desktop) simply ignore the UIResource and use the text URL
- Clients that support MCP-UI (like Goose) can render the iframe for a richer experience

**Disabling MCP-UI (Optional):**

If you want to disable MCP-UI support:

Via environment variable:

```bash
export ENABLE_MCP_UI=false
```

Or via command-line flag:

```bash
node dist/esm/index.js --disable-mcp-ui
```

**Note:** You typically don't need to disable this. The implementation is fully backwards compatible and doesn't affect clients that don't support MCP-UI. See [mcpui.dev](https://mcpui.dev) for compatible clients.

## Troubleshooting

**Issue:** Tools fail with authentication errors

**Solution:** Check that your `MAPBOX_ACCESS_TOKEN` has the required scopes for the tool you're using. See the token scopes section above.

**Issue:** Large GeoJSON files cause slow performance

**Solution:** The GeoJSON preview tool may be slow with very large files. Consider simplifying geometries or using smaller datasets for preview purposes.

## Contributing

We welcome contributions to the Mapbox Development MCP Server! Please review our documentation:

- **[Engineering Standards (docs/engineering_standards.md)](./docs/engineering_standards.md)** - Comprehensive guidelines for all contributors
- **[CLAUDE.md](./CLAUDE.md)** - Architecture and technical patterns
- **[AGENTS.md](./AGENTS.md)** - Critical patterns and common errors for AI agents
- **[GitHub Copilot Guidelines](./.github/copilot-instructions.md)** - Copilot-specific development practices
