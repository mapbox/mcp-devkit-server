# Cursor Integration

This guide explains how to configure Cursor IDE for use with the Mapbox MCP DevKit Server.

## Requirements

- [Cursor](https://www.cursor.com/) installed
- Mapbox MCP DevKit Server [built locally](../README.md#development-setup)

```sh
# from repository root:
# using node
npm run build

# or alternatively, using docker
docker build -t mapbox-mcp-devkit .
```

## Setup Instructions

### Configure Cursor to use Mapbox MCP DevKit Server

1. Go to Cursor Settings/ MCP Tools and click on "Add Custom MCP".
2. Add either of the following MCP config:
   - **NPM version** (recommended for simplicity)

     ```json
     {
       "mcpServers": {
         "MapboxDevKit": {
           "type": "stdio",
           "command": "npx",
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
     {
       "mcpServers": {
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
     {
       "mcpServers": {
         "MapboxDevKit": {
           "type": "stdio",
           "command": "node",
           "args": ["<ABSOLUTE_PATH_TO_REPO>/dist/esm/index.js"],
           "env": {
             "MAPBOX_ACCESS_TOKEN": "<YOUR_TOKEN>",
             "MCP_LOGGING_DISABLE": "true"
           }
         }
       }
     }
     ```

3. Click "Save" to apply the configuration.

## Important Notes

### Stdio Transport Logging

The MCP DevKit Server uses stdio (standard input/output) for communication with Cursor. To prevent console logs from corrupting the JSON-RPC protocol, **you must set `MCP_LOGGING_DISABLE=true`** in the environment variables.

### Token Scopes

Your Mapbox access token must have the appropriate scopes for the tools you want to use. See the [main README](../README.md#tools) for required token scopes per tool.

### Configuration Options

Additional environment variables you can set:

- `OTEL_EXPORTER_OTLP_ENDPOINT` - Enable OpenTelemetry tracing (see [tracing docs](./tracing.md))
- `OTEL_SERVICE_NAME` - Override service name for tracing
- `MAPBOX_API_ENDPOINT` - Override Mapbox API endpoint (advanced)

## Troubleshooting

### Server Not Appearing

If the Mapbox DevKit Server doesn't appear in Cursor's MCP tools:

1. Check that your `MAPBOX_ACCESS_TOKEN` is valid
2. Verify `node` and `npx` are in your PATH (run `which node` or `which npx`)
3. For Docker: ensure the image is built with `docker images | grep mapbox-mcp-devkit`
4. Check Cursor's logs for any error messages

### Command Not Found

If you get "command not found" errors for `node` or `npx`:

1. Find the absolute path:

   ```bash
   # Mac/Linux
   which node
   which npx

   # Windows
   where node
   where npx
   ```

2. Use the absolute path in your config:
   ```json
   {
     "mcpServers": {
       "MapboxDevKit": {
         "command": "/usr/local/bin/npx",  // Use your actual path
         ...
       }
     }
   }
   ```

### Connection Errors

If you see JSON-RPC or parsing errors:

1. Ensure `MCP_LOGGING_DISABLE` is set to `"true"` in your configuration
2. If using Node version, verify the path to `dist/esm/index.js` is correct
3. Run `npm run build` to ensure the latest build is available

### Tool Execution Failures

If tools fail to execute:

1. Verify your Mapbox token has the required scopes (see [README](../README.md))
2. Check if you're hitting rate limits (429 errors)
3. Enable verbose errors by adding `"VERBOSE_ERRORS": "true"` to the env config

## Example Usage

Once configured, you can use natural language to interact with Mapbox tools:

- "List all my Mapbox styles"
- "Show me the bounding box for San Francisco"
- "Convert these coordinates to lat/lng: -122.4194, 37.7749"
- "Create a new Mapbox style called 'my-custom-map'"

See the [README](../README.md#example-prompts) for more example prompts.
