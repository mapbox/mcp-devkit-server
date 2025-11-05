# Tracing Verification Guide

This guide shows how to verify that OpenTelemetry tracing is working correctly with the MCP DevKit server.

## Quick Start with Jaeger

### 1. Start Jaeger (One-time setup)

```bash
# Start Jaeger in Docker (requires Docker to be installed)
npm run tracing:jaeger:start
```

This starts Jaeger with:

- **UI**: http://localhost:16686 (view traces here)
- **OTLP HTTP endpoint**: http://localhost:4318 (where our traces go)

### 2. Configure Environment

```bash
# Copy the example configuration
cp .env.example .env

# Edit .env to add your MAPBOX_ACCESS_TOKEN
# The OTEL_EXPORTER_OTLP_ENDPOINT is already set to http://localhost:4318
```

### 3. Run MCP Server with Tracing

```bash
# Build and run the MCP inspector
npm run inspect:build
```

This will:

- Build the server
- Start it with the MCP inspector
- Enable tracing with OTLP endpoint pointing to Jaeger
- Set service name to `mapbox-mcp-devkit-server`

### 4. Generate Some Traces

In the MCP inspector:

1. Execute any tool (e.g., `list_styles_tool` or `get_latest_mapbox_docs_tool`)
2. Try multiple tools to generate various traces:
   - Style operations (create, update, retrieve, delete)
   - Token management
   - Documentation lookup
   - Local processing tools
3. Each tool execution creates traces

### 5. View Traces in Jaeger

1. Open http://localhost:16686 in your browser
2. Select service: `mapbox-mcp-devkit-server`
3. Click "Find Traces"
4. You should see traces for:
   - Tool executions (e.g., `tool.list_styles_tool`, `tool.create_style_tool`)
   - HTTP requests (e.g., `http.get`, `http.post`)
   - Configuration loading (`config.load_env`)
   - Any errors or performance issues

### 6. Stop Jaeger (When done)

```bash
npm run tracing:jaeger:stop
```

## What to Look For

### Successful Tracing Setup

✅ **Console output shows**: `OpenTelemetry tracing: enabled`

✅ **Jaeger UI shows traces** for your service

✅ **Trace details include**:

- Tool name and execution time
- HTTP requests to Mapbox APIs
- Input/output sizes
- Success/error status
- Session context (if using JWT)
- CloudFront headers for Mapbox API calls

### Example Trace Hierarchy

A typical style creation operation might show:

```
tool.create_style_tool (245ms)
└── http.post (198ms)
    ├── Request to api.mapbox.com/styles/v1/username
    ├── Status: 201 Created
    └── CloudFront ID: ABC123XYZ...
```

### Troubleshooting

❌ **"OpenTelemetry tracing: disabled"**

- Check that `OTEL_EXPORTER_OTLP_ENDPOINT` is set in your .env file
- Verify Jaeger is running: `docker ps | grep jaeger`
- Ensure .env file is in the project root

❌ **No traces in Jaeger**

- Wait a few seconds after tool execution
- Check Jaeger is receiving data: http://localhost:16686
- Verify the service name matches: `mapbox-mcp-devkit-server`
- Check network connectivity to localhost:4318

❌ **Docker not available**

- Use alternative OTLP collector
- Or run with console tracing (see Alternative Methods below)

## Testing Different Tools

### Style Management Tools

Test tracing with style operations:

```bash
# In MCP inspector, try:
list_styles_tool with limit=5
create_style_tool with a simple style
update_style_tool to modify the style
retrieve_style_tool to get style details
delete_style_tool to clean up
```

Each operation creates a trace showing:

- Tool execution time
- API requests to Mapbox
- Response status codes
- Any errors

### Token Management Tools

```bash
# Try these in MCP inspector:
list_tokens_tool
create_token_tool with specific scopes
```

Traces show:

- JWT parsing and validation
- Token API interactions
- Pagination if applicable

### Local Processing Tools

```bash
# Try tools that don't make API calls:
coordinate_conversion_tool
bounding_box_tool
geojson_preview_tool
```

These show tool execution spans without HTTP child spans.

## Alternative OTLP Endpoints

### Local OTEL Collector

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### AWS X-Ray (via ADOT)

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:2000
AWS_REGION=us-east-1
```

### Google Cloud Trace

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://cloudtrace.googleapis.com/v1/projects/PROJECT_ID/traces:batchWrite
```

### Honeycomb

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
OTEL_EXPORTER_OTLP_HEADERS='{"x-honeycomb-team":"YOUR_API_KEY"}'
```

## Alternative Methods

### Console Tracing (Development Only)

**⚠️ Not recommended for stdio transport**

```bash
# Add to .env (only works well with SSE transport)
OTEL_EXPORTER_CONSOLE_ENABLED=true
```

This prints traces to stderr. Only use this for debugging, as it can interfere with MCP's stdio communication.

### Verifying Different Transports

#### stdio Transport (Default) - Silent Operation

```bash
# Normal operation
npm run inspect:build
```

#### SSE Transport - Full Logging

```bash
# If your inspector supports SSE transport
SERVER_TRANSPORT=sse npm run inspect:build
```

## Production Considerations

- **Performance**: Tracing adds <1% CPU overhead
- **Network**: Each trace is ~1-5KB sent to OTLP endpoint
- **Sampling**: Use `OTEL_TRACES_SAMPLER=traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.1` for high-volume environments
- **Security**: Traces don't include sensitive input data, only metadata

## Example Trace Data

A successful style creation trace includes:

```json
{
  "traceId": "1234567890abcdef",
  "spanId": "abcdef1234567890",
  "operationName": "tool.create_style_tool",
  "startTime": "2025-11-03T12:00:00Z",
  "duration": "342ms",
  "tags": {
    "tool.name": "create_style_tool",
    "tool.input.size": 2048,
    "tool.success": true,
    "session.id": "session-uuid",
    "http.method": "POST",
    "http.url": "https://api.mapbox.com/styles/v1/...",
    "http.status_code": 201,
    "http.response.header.x_amz_cf_id": "ABC123...",
    "http.response.header.x_amz_cf_pop": "IAD55-P3"
  }
}
```

This gives you complete visibility into:

- Tool execution performance
- API call timing and success rates
- CloudFront routing and caching
- Any errors or performance bottlenecks

## Advanced Verification

### Testing Error Scenarios

Try operations that might fail to see error tracing:

1. Invalid token scopes
2. Malformed style JSON
3. Non-existent style IDs
4. Network timeouts (if simulated)

Each error creates a trace with:

- Error type and message
- Stack trace (if applicable)
- Span marked as error
- Timing up to failure point

### Monitoring Configuration Loading

Check the `config.load_env` span on startup to verify:

- .env file was found and loaded
- Number of environment variables loaded
- Any configuration errors

### Performance Analysis

Use Jaeger to find:

- Slowest tool executions
- HTTP requests with high latency
- Tools with high error rates
- Patterns in failures

## Next Steps

Once tracing is verified:

1. Review the [full tracing documentation](./tracing.md)
2. Configure production OTLP backends (AWS X-Ray, Datadog, etc.)
3. Set up sampling for high-volume environments
4. Create dashboards and alerts based on trace data

## Getting Help

If you encounter issues:

1. Check the troubleshooting sections above
2. Verify Jaeger is running: `docker logs jaeger`
3. Check server logs for tracing initialization messages
4. Ensure your .env file is properly configured
