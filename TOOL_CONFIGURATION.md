# Tool Configuration Guide

The Mapbox MCP Devkit Server supports command-line configuration to enable or disable specific tools at startup.

## Command-Line Options

### --enable-tools

Enable only specific tools (exclusive mode). When this option is used, only the listed tools will be available.

```bash
<command> --enable-tools list_styles_tool,create_style_tool
```

### --disable-tools

Disable specific tools. All other tools will remain enabled.

```bash
<command> --disable-tools delete_style_tool,update_style_tool
```

## Available Tools

The following tools are available in the Mapbox MCP Devkit Server:

### Style Management Tools

- `list_styles_tool` - List all Mapbox styles
- `create_style_tool` - Create a new Mapbox style
- `retrieve_style_tool` - Retrieve details of a specific style
- `update_style_tool` - Update an existing Mapbox style
- `delete_style_tool` - Delete a Mapbox style
- `preview_style_tool` - Generate a preview image of a Mapbox style

### Visualization Tools

- `geojson_preview_tool` - Generate a preview map with GeoJSON data overlay

### Token Management Tools

- `create_token_tool` - Create a new Mapbox access token
- `list_tokens_tool` - List all Mapbox access tokens

### Geographic Tools

- `bounding_box_tool` - Calculate bounding box for given coordinates
- `country_bounding_box_tool` - Get bounding box for a specific country
- `coordinate_conversion_tool` - Convert between different coordinate formats

## Usage Examples

### Node.js

```bash
node dist/esm/index.js --enable-tools list_styles_tool,create_style_tool,preview_style_tool
```

### NPX

```bash
npx @mapbox/mcp-devkit-server --disable-tools delete_style_tool,update_style_tool
```

### Docker

```bash
docker run mapbox/mcp-devkit-server --enable-tools geojson_preview_tool,preview_style_tool,coordinate_conversion_tool
```

### Claude Desktop App Configuration

In your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "mapbox-devkit": {
      "command": "node",
      "args": [
        "/path/to/mcp-devkit-server/dist/esm/index.js",
        "--enable-tools",
        "list_styles_tool,create_style_tool,preview_style_tool"
      ],
      "env": {
        "MAPBOX_ACCESS_TOKEN": "your-mapbox-token-here"
      }
    }
  }
}
```

## Example Configurations

### Enable only read-only tools (safe mode)

```bash
node dist/esm/index.js --enable-tools list_styles_tool,retrieve_style_tool,list_tokens_tool,preview_style_tool
```

### Enable only style management tools

```bash
node dist/esm/index.js --enable-tools list_styles_tool,create_style_tool,retrieve_style_tool,update_style_tool,delete_style_tool,preview_style_tool
```

### Disable dangerous operations

```bash
node dist/esm/index.js --disable-tools delete_style_tool,create_token_tool
```

## Notes

- If both `--enable-tools` and `--disable-tools` are provided, `--enable-tools` takes precedence
- Tool names must match exactly (case-sensitive)
- Multiple tools can be specified using comma separation
- Invalid tool names are silently ignored
- Arguments are passed after the main command, regardless of how the server is invoked
- All tools require a valid Mapbox access token set in the `MAPBOX_ACCESS_TOKEN` environment variable
