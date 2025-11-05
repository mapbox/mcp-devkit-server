# VS Code Integration

This guide explains how to configure Visual Studio Code for use with the Mapbox MCP DevKit Server.

## Requirements

- [Visual Studio Code](https://code.visualstudio.com/) installed
- GitHub Copilot extension installed and configured
- Mapbox MCP DevKit Server built locally

```sh
# from repository root:
# using node
npm install
npm run build

# note your absolute path to node, you will need it for MCP config
# For Mac/Linux
which node
# For Windows
where node

# or alternatively, using docker
docker build -t mapbox-mcp-devkit .
```

## Setup Instructions

### Configure VS Code to use Mapbox MCP DevKit Server

1. Open your VS Code `settings.json` file:
   - **Mac/Linux**: `Cmd+Shift+P` → "Preferences: Open User Settings (JSON)"
   - **Windows**: `Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"

2. At the top level of the JSON file, add the MCP configuration:
   - **NPM version** (recommended for simplicity)

     ```json
     "mcp": {
       "servers": {
         "MapboxDevKit": {
           "type": "stdio",
           "command": "<PATH_TO_YOUR_NPX>",
           "args": ["-y", "@mapbox/mcp-devkit-server"],
           "env": {
             "MAPBOX_ACCESS_TOKEN": "<YOUR_TOKEN>",
             "MCP_LOGGING_DISABLE": "true"
           }
         }
       }
     }
     ```

   - **Docker version** (recommended for isolation)

     ```json
     "mcp": {
       "servers": {
         "MapboxDevKit": {
           "type": "stdio",
           "command": "docker",
           "args": [
             "run",
             "-i",
             "--rm",
             "--env",
             "MAPBOX_ACCESS_TOKEN=<YOUR_TOKEN>",
             "--env",
             "MCP_LOGGING_DISABLE=true",
             "mapbox-mcp-devkit"
           ]
         }
       }
     }
     ```

   - **Node version** (for local development)
     ```json
     "mcp": {
       "servers": {
         "MapboxDevKit": {
           "type": "stdio",
           "command": "<PATH_TO_YOUR_NODE>",
           "args": [
             "/YOUR_PATH_TO_GIT_REPOSITORY/dist/esm/index.js"
           ],
           "env": {
             "MAPBOX_ACCESS_TOKEN": "<YOUR_TOKEN>",
             "MCP_LOGGING_DISABLE": "true"
           }
         }
       }
     }
     ```

3. Save the `settings.json` file.

4. Restart VS Code to apply the changes.

### Verify Installation

After restarting VS Code, you should see "Mapbox DevKit" appear in the GitHub Copilot tools menu or MCP servers list.

## Important Notes

### Stdio Transport Logging

The MCP DevKit Server uses stdio (standard input/output) for communication with VS Code. To prevent console logs from corrupting the JSON-RPC protocol, **you must set `MCP_LOGGING_DISABLE=true`** in the environment variables.

Both variable names are supported for backwards compatibility:

- `MCP_LOGGING_DISABLE` (recommended)
- `MCP_DISABLE_LOGGING` (legacy)

### Token Scopes

Your Mapbox access token must have the appropriate scopes for the tools you want to use. See the [main README](../README.md#tools) for required token scopes per tool.

### Configuration Options

Additional environment variables you can set:

- `OTEL_EXPORTER_OTLP_ENDPOINT` - Enable OpenTelemetry tracing (see [tracing docs](./tracing.md))
- `OTEL_SERVICE_NAME` - Override service name for tracing
- `MAPBOX_API_ENDPOINT` - Override Mapbox API endpoint (advanced)

## Complete Example Configuration

Here's a complete `settings.json` example with the NPM version:

```json
{
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "mcp": {
    "servers": {
      "MapboxDevKit": {
        "type": "stdio",
        "command": "/usr/local/bin/npx",
        "args": ["-y", "@mapbox/mcp-devkit-server"],
        "env": {
          "MAPBOX_ACCESS_TOKEN": "pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example",
          "MCP_LOGGING_DISABLE": "true"
        }
      }
    }
  }
}
```

## Troubleshooting

### Server Not Appearing

If the Mapbox DevKit Server doesn't appear in VS Code's MCP servers:

1. **Check GitHub Copilot**: Ensure GitHub Copilot is installed and active
2. **Verify token**: Check that your `MAPBOX_ACCESS_TOKEN` is valid
3. **Verify paths**: Ensure the path to `node` or `npx` is correct (use absolute paths)
4. **Docker image**: If using Docker, verify the image exists: `docker images | grep mapbox-mcp-devkit`
5. **Check Output**: Open "Output" panel → Select "MCP" from dropdown to see logs

### Connection Errors / JSON-RPC Parsing Errors

If you see JSON-RPC or parsing errors in the Output panel:

1. **Logging disabled**: Ensure `MCP_LOGGING_DISABLE` is set to `"true"` in your configuration
2. **Build fresh**: Run `npm run build` to ensure you have the latest build
3. **Path verification**: For Node version, verify the path to `dist/esm/index.js` is correct and absolute

### Tool Execution Failures

If tools fail to execute:

1. **Token scopes**: Verify your Mapbox token has the required scopes (see [README](../README.md))
2. **Rate limits**: Check if you're hitting API rate limits (429 errors)
3. **Verbose errors**: Add `"VERBOSE_ERRORS": "true"` to the env config for detailed error messages
4. **Network**: Ensure you can reach `api.mapbox.com` from your network

### Finding Your NPX Path

```sh
# Mac/Linux
which npx
# Output example: /usr/local/bin/npx

# Windows (Command Prompt)
where npx
# Output example: C:\Program Files\nodejs\npx.cmd

# Windows (PowerShell)
Get-Command npx
# Look for "Source" field in output
```

### Finding Your Node Path

```sh
# Mac/Linux
which node
# Output example: /usr/local/bin/node

# Windows (Command Prompt)
where node
# Output example: C:\Program Files\nodejs\node.exe

# Windows (PowerShell)
Get-Command node
# Look for "Source" field in output
```

## Example Usage

Once configured, you can use natural language in GitHub Copilot Chat to interact with Mapbox tools:

```
@MapboxDevKit list all my Mapbox styles
```

```
@MapboxDevKit show me the bounding box for Tokyo, Japan
```

```
@MapboxDevKit convert these coordinates to lat/lng: -122.4194, 37.7749
```

```
@MapboxDevKit create a new Mapbox style called 'dark-mode-map'
```

See the [README](../README.md#example-prompts) for more example prompts and available tools.

## Additional Resources

- [VS Code MCP Documentation](https://code.visualstudio.com/docs/copilot/mcp)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Mapbox Token Scopes](https://docs.mapbox.com/api/overview/#access-tokens-and-token-scopes)
- [OpenTelemetry Tracing Guide](./tracing.md)
