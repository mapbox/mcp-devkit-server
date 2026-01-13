# Goose MCP Elicitation Bug Report

**Status**: 🐛 Filed - https://github.com/block/goose/issues/6471

## Summary

MCP elicitation forms display after tool execution timeout, preventing user input and making the elicitation feature unusable.

## Environment

- **Goose Version**: [Please specify]
- **MCP Server**: @mapbox/mcp-devkit-server v0.4.6
- **MCP SDK Version**: @modelcontextprotocol/sdk v1.17.5
- **Operating System**: macOS (confirmed), likely affects all platforms

## Bug Description

When an MCP tool calls `server.elicitInput()` to request user input, Goose advertises the `elicitation` capability but does not display the form in time for the user to interact with it. The form appears only **after** the tool call has timed out and completed, making elicitation unusable.

## Steps to Reproduce

1. Connect Goose to the Mapbox MCP DevKit Server
2. Call `preview_style_tool` without providing an `accessToken` parameter:
   ```
   preview_style_tool({ styleId: "streets-v12" })
   ```
3. Observe that:
   - No elicitation form appears immediately
   - Tool appears to hang/wait indefinitely
   - After timeout period, tool fails or falls back
   - **Then** the elicitation form appears in the UI
   - Form is non-interactive/too late to provide input

## Expected Behavior

The elicitation form should:

1. Appear **immediately** when `server.elicitInput()` is called
2. Block tool execution until user provides input or cancels
3. Allow user to interact with the form before any timeout
4. Return user input to the tool for processing

This is how elicitation works correctly in:

- MCP Inspector ✅
- Cursor ✅
- VS Code with GitHub Copilot ✅

## Actual Behavior

The elicitation form:

1. Does not appear when `server.elicitInput()` is called
2. Tool execution waits/hangs with no visible UI
3. Request times out after waiting period
4. Form appears **after** timeout in the UI
5. User never had opportunity to provide input
6. Creates misleading impression that elicitation is supported

## Technical Details

### Server-side code (working in other clients)

```typescript
// Check if client supports elicitation capability
const clientCapabilities = this.server.server.getClientCapabilities();
if (!clientCapabilities?.elicitation) {
  return {
    isError: true,
    content: [{ type: 'text', text: 'Client does not support elicitation' }]
  };
}

// Goose advertises elicitation capability, so this check passes ✅

// Attempt to elicit user input
const result = await server.elicitInput({
  message: 'Preview Token Setup...',
  requestedSchema: {
    type: 'object',
    properties: {
      choice: {
        type: 'string',
        enum: ['provide', 'create', 'auto'],
        enumNames: [
          'I have a token to provide',
          'Create a new preview token with custom settings',
          'Auto-create a basic preview token for me'
        ]
      },
      token: { type: 'string', minLength: 10 }
      // ... other fields
    },
    required: ['choice']
  }
});

// This await hangs indefinitely in Goose ❌
// Form appears only after this times out
```

### What Goose advertises

Goose correctly advertises elicitation capability during MCP handshake:

```json
{
  "capabilities": {
    "elicitation": {}
  }
}
```

### Suspected Issue

The elicitation form rendering appears to be:

- Queued asynchronously rather than displayed synchronously
- Rendered after tool execution completes rather than during the `elicitInput()` call
- Not blocking the tool execution as required by MCP spec

## Impact

**High** - Renders MCP elicitation completely unusable in Goose:

- Tools that require secure user input cannot function
- Users cannot use features designed to keep sensitive data out of chat history
- Creates poor UX with delayed/non-functional form

## Workaround

Users must provide sensitive parameters directly in tool calls:

```typescript
preview_style_tool({
  styleId: 'streets-v12',
  accessToken: 'pk.secret-token-in-chat-history' // Not ideal for security
});
```

This defeats the purpose of elicitation (keeping tokens out of chat history).

## References

- MCP Elicitation Spec: https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation
- MCP SDK elicitInput: https://github.com/modelcontextprotocol/sdk
- Issue discovered in PR: https://github.com/mapbox/mcp-devkit-server/pull/57

## Suggested Fix

The elicitation form should be displayed **synchronously** when the server calls `elicitInput()`:

1. Server sends elicitation request via MCP protocol
2. Goose immediately renders form UI (blocking)
3. User interacts with form
4. Form submission/cancellation returns to server
5. Tool execution continues with result

The form render should **not** be queued or delayed until after tool completion.

## Additional Context

This bug was discovered while implementing secure token handling for the Mapbox MCP DevKit Server. The same code works perfectly in MCP Inspector, Cursor, and VS Code, suggesting the issue is specific to Goose's elicitation implementation.

## Testing

To verify a fix:

1. Install @mapbox/mcp-devkit-server: `npx @modelcontextprotocol/create-server mapbox`
2. Configure with a Mapbox access token
3. Call `preview_style_tool` without `accessToken` parameter
4. Verify form appears **immediately** and accepts user input **before** timeout
5. Verify tool completes successfully with user-provided token

---

**Report Date**: 2026-01-13
**Reporter**: Mapbox MCP DevKit Server Team
**Goose Team**: Please let us know if you need any additional information or test cases!
