# Claude Desktop Integration Guide

This guide shows how to integrate the Mapbox MCP DevKit Server with Claude Desktop for enhanced development workflows.

## Prerequisites

- Claude Desktop application installed
- A Mapbox account with an access token
- Node.js 22 or higher (for local development)

## Installation

### Get Your Mapbox Access Token

1. Sign up for a free Mapbox account at [mapbox.com/signup](https://www.mapbox.com/signup/)
2. Navigate to your [Account page](https://account.mapbox.com/)
3. Create a new token with the required scopes for your use case

For more information about Mapbox access tokens, see the [Mapbox documentation on access tokens](https://docs.mapbox.com/help/dive-deeper/access-tokens/).

**⚠️ CRITICAL: Token Scopes Required**

**Each Mapbox tool requires specific token scopes/privileges to function.** Using a token without the correct scope will result in authentication errors. Before using any tool, ensure your token has the required scopes:

- **Style operations**: Require `styles:read`, `styles:write`, `styles:list`, or `styles:download` scopes
- **Token management**: Requires `tokens:read` and `tokens:write` scopes
- **Style previews**: Require `tokens:read` scope and at least one public token with `styles:read` scope

See the [Token Requirements](#token-requirements) section below for detailed scope information for each tool.

## Configuration

### Install Claude Desktop

[Download](https://claude.ai/download) and install the Claude Desktop application from the official page.

### Configure Claude Desktop

## Option 1: DXT Package Installation (Recommended)

The easiest way to install this MCP server is using the pre-built DXT package:

**⚠️ Important: Make sure you have the latest version of Claude Desktop installed. DXT support requires recent versions of Claude Desktop to function properly.**

**[📦 Download DXT Package](https://github.com/mapbox/mcp-devkit-server/releases/latest/download/mcp-devkit-server.dxt)**

### Installation Steps

1. **Update Claude Desktop** - [Download the latest version](https://claude.ai/download) if you haven't recently
2. Download the `.dxt` file from the link above
3. Open the file with Claude Desktop
4. Follow the installation prompts
5. Provide your Mapbox access token when prompted

This method automatically handles the configuration and setup, providing a one-click installation experience.

## Option 2: Manual Configuration

For users who prefer manual configuration or need custom setups, you can configure the server directly:

1. Open Claude Desktop settings
2. Navigate to the Model Context Protocol section
3. Modify `claude_desktop_config.json` to add the new server:

### NPM Package

```json
{
  "mcpServers": {
    "mapbox-devkit": {
      "command": "npx",
      "args": ["-y", "@mapbox/mcp-devkit-server"],
      "env": {
        "MAPBOX_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Docker Runtime

```json
{
  "mcpServers": {
    "mapbox-devkit": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "MAPBOX_ACCESS_TOKEN=your_token_here",
        "mapbox-mcp-devkit"
      ]
    }
  }
}
```

### Local Development

If you want to use a local version (need to clone and build from this repo):

```json
{
  "mcpServers": {
    "mapbox-devkit": {
      "command": "/path/to/your/node",
      "args": ["/path/to/mapbox-mcp-devkit/dist/index.js"],
      "env": {
        "MAPBOX_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

**⚠️ Important: Make sure you have the latest version of Claude Desktop installed. DXT support requires recent versions of Claude Desktop to function properly.**

## Usage Examples

Once configured, you can use natural language to interact with Mapbox development tools:

### Style Management

- "List all my Mapbox styles"
- "Create a new style called 'Dark Mode' with a basic dark theme"
- "Update the style with ID 'xyz' to change the water color to blue"
- "Generate a preview URL for my style"

### Token Management

- "Create a new token for my web app with styles:read and fonts:read permissions"
- "List all my public tokens"
- "Show me my default public token"

### GeoJSON Processing

- "Calculate the bounding box of this GeoJSON data"
- "Generate a preview URL for this GeoJSON file"
- "Convert coordinates from WGS84 to Web Mercator"

## First Use

### Tool Access Approval

You will be asked to approve access when you first use the tools. Click "Allow" to enable the Mapbox tools.

### Verify Installation

You should see "mapbox-devkit" appear in the tools menu within Claude Desktop.

## Troubleshooting

### Common Issues

1. **Token not found error:**
   - Verify your `MAPBOX_ACCESS_TOKEN` is set correctly in the configuration
   - Check that the token has the required scopes for the operation

2. **Server connection issues:**
   - Ensure Node.js version is 22 or higher (for NPM package option)
   - Check your internet connection for npm package downloads
   - Restart Claude Desktop after configuration changes

3. **Permission errors:**
   - Verify your token has the correct scopes (see main README for scope requirements)
   - Some operations require secret tokens (starting with `sk.`)

### Debug Mode

Enable verbose error reporting by adding the environment variable:

```json
{
  "mcpServers": {
    "mapbox-devkit": {
      "command": "npx",
      "args": ["-y", "@mapbox/mcp-devkit-server"],
      "env": {
        "MAPBOX_ACCESS_TOKEN": "your_token_here",
        "VERBOSE_ERRORS": "true"
      }
    }
  }
}
```

This will provide detailed error messages to help diagnose issues.

## Token Requirements

**⚠️ Each tool requires specific token scopes. Authentication will fail if your token lacks the required privileges.**

Different tools require different scopes:

### Style Tools

- **List styles**: `styles:list` scope
- **Create/Update styles**: `styles:write` scope
- **Retrieve styles**: `styles:download` scope
- **Delete styles**: `styles:write` scope
- **Preview styles**: `tokens:read` scope and at least one public token with `styles:read` scope

### Token Management Tools

- **List tokens**: `tokens:read` scope
- **Create tokens**: `tokens:write` scope

### Local Processing Tools

These tools work locally and don't require specific token scopes:

- Bounding box calculation
- GeoJSON preview generation
- Coordinate conversion

## Best Practices

1. **Token Security:**
   - Use environment variables for tokens
   - Create restricted tokens for specific domains
   - Regularly rotate tokens used in production

2. **Development Workflow:**
   - Use the NPM package for consistent updates
   - Enable verbose errors during development
   - Test with different token scopes for your use case

3. **Performance:**
   - Use appropriate pagination for large datasets
   - Cache frequently accessed styles and tokens
   - Consider using Docker for consistent environments across team members
