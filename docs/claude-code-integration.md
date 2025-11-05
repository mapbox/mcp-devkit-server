# Claude Code Integration Guide

This guide shows how to integrate the Mapbox MCP DevKit Server with Claude Code for enhanced development workflows.

## Prerequisites

- Claude Code CLI installed
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

### Install Claude Code

Follow the installation instructions at [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code) to set up the CLI.

### Configure Claude Code

#### Option 1: Command Line Setup (Recommended)

Add the MCP server directly from the command line:

```bash
claude mcp add mapbox-devkit npx @mapbox/mcp-devkit-server -e MAPBOX_ACCESS_TOKEN=<YOUR_TOKEN>
```

Replace `<YOUR_TOKEN>` with your actual Mapbox access token.

#### Option 2: Manual Configuration - NPM Package

1. Configure the MCP server in your Claude Code settings
2. Add the Mapbox MCP DevKit Server configuration:

Add to your Claude Code MCP configuration:

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

#### Option 3: Docker Runtime

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

#### Option 4: Local Development

If you want to use a local version (need to clone and build from this repo):

```json
{
  "mcpServers": {
    "mapbox-devkit": {
      "command": "node",
      "args": ["/absolute/path/to/mapbox-mcp-devkit/dist/esm/index.js"],
      "env": {
        "MAPBOX_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

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

### Development Workflows

- "Help me debug this Mapbox style configuration"
- "Generate a complete Mapbox GL JS example with my style"
- "Create a token with the minimum required scopes for my application"

## First Use

### Tool Access Approval

When you first use the tools, Claude Code will show available MCP tools. The Mapbox DevKit tools will be automatically available once configured.

### Verify Installation

Check that the Mapbox tools are working:

```bash
# Example command to test the connection
claude "List my Mapbox styles"
```

## Development Integration

### Code Generation

Claude Code can help generate Mapbox-related code using the MCP tools:

- "Generate a React component that displays my Mapbox style"
- "Create a Next.js page with an interactive map using my custom style"
- "Write TypeScript interfaces for my Mapbox API responses"

### API Testing

Use Claude Code to test and debug Mapbox API interactions:

- "Test my style API endpoints and show me the responses"
- "Help me debug why my token doesn't have the right permissions"
- "Validate this GeoJSON data and suggest improvements"

## Troubleshooting

### Common Issues

1. **Token not found error:**
   - Verify your `MAPBOX_ACCESS_TOKEN` is set correctly in the configuration
   - Check that the token has the required scopes for the operation

2. **Server connection issues:**
   - Ensure Node.js version is 22 or higher (for NPM package option)
   - Check your internet connection for npm package downloads
   - Restart Claude Code after configuration changes

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
   - Leverage Claude Code's code generation for rapid prototyping

3. **Performance:**
   - Use appropriate pagination for large datasets
   - Cache frequently accessed styles and tokens
   - Consider using Docker for consistent environments across team members

4. **Code Quality:**
   - Use Claude Code to generate well-documented code examples
   - Ask for TypeScript definitions and error handling
   - Request tests and validation for generated code

## Advanced Usage

### Custom Workflows

Create custom development workflows by combining multiple tools:

```bash
# Example: Complete style development workflow
claude "Create a new Mapbox style called 'My App Theme', generate a preview URL, and show me how to integrate it in a React app"
```

### Batch Operations

Perform multiple operations efficiently:

```bash
# Example: Token management workflow
claude "List all my tokens, create a new restricted token for localhost development, and show me the security best practices"
```

### Integration with Existing Projects

Use Claude Code to integrate Mapbox tools into your existing codebase:

```bash
# Example: Project integration
claude "Analyze my existing map component and suggest how to integrate custom Mapbox styles from my account"
```
