# MCP Registry Submission Guide

This document outlines the steps to submit the Mapbox DevKit MCP Server to the official MCP Registry.

## Prerequisites

- ✅ Node.js 22+ installed
- ✅ npm account (package already published: `@mapbox/mcp-devkit-server`)
- ✅ GitHub account with access to `mapbox` organization
- ✅ `server.json` file configured (already in repository)
- ✅ `mcpName` set in `package.json` (already configured)

## Submission Steps

### 1. Install mcp-publisher

Choose one of the following methods:

**macOS (Homebrew):**

```bash
brew install mcp-publisher
```

**Linux (curl):**

```bash
curl -fsSL https://mcp-get.com/install.sh | sh
```

**Windows:**
Download from: https://github.com/modelcontextprotocol/registry/releases

### 2. Verify server.json

The `server.json` file is already configured with:

- ✅ Name: `io.github.mapbox/mcp-devkit-server`
- ✅ Description: Developer-focused toolkit positioning
- ✅ Package: `@mapbox/mcp-devkit-server` (npm)
- ✅ Version: Synced with package.json
- ✅ Environment variables: `MAPBOX_ACCESS_TOKEN`
- ✅ Transport: stdio

**Review the file:**

```bash
cat server.json
```

### 3. Authenticate with GitHub

```bash
mcp-publisher login github
```

This will:

- Open a browser for GitHub OAuth
- Request permission to verify repository ownership
- Store credentials locally

### 4. Publish to Registry

```bash
mcp-publisher publish
```

The tool will:

- Validate `server.json` schema
- Verify npm package exists
- Check GitHub repository access
- Submit to registry at https://registry.modelcontextprotocol.io

### 5. Verify Publication

Once published, verify at:

- **Registry**: https://registry.modelcontextprotocol.io
- **Search for**: "mapbox devkit" or "io.github.mapbox/mcp-devkit-server"

## Updating the Registry Entry

When releasing new versions:

1. **Update version** in both `package.json` and `server.json`
2. **Publish to npm**: `npm publish`
3. **Update registry**: `mcp-publisher publish`

The registry will automatically detect and publish the update.

## Troubleshooting

### Authentication Issues

**Problem**: `mcp-publisher login github` fails

**Solution**: Ensure you have:

- GitHub account with access to `mapbox` organization
- Correct repository permissions
- Network access to GitHub OAuth

### Validation Errors

**Problem**: `server.json` validation fails

**Solution**:

- Check schema version is current
- Verify all required fields are present
- Ensure npm package exists: `npm view @mapbox/mcp-devkit-server`

### Version Mismatch

**Problem**: Registry shows old version

**Solution**:

- Ensure `server.json` version matches `package.json`
- Run version sync: `npm run sync-manifest`
- Republish: `mcp-publisher publish`

## Registry Policies

The MCP Registry has moderation guidelines:

- ❌ No spam or malicious servers
- ❌ No impersonation
- ❌ No trademark violations
- ✅ Must be publicly accessible
- ✅ Must follow MCP specification

## Support

- **Registry issues**: https://github.com/modelcontextprotocol/registry/issues
- **MCP spec questions**: https://github.com/modelcontextprotocol/specification
- **This server issues**: https://github.com/mapbox/mcp-devkit-server/issues

## Resources

- [Official MCP Registry](https://registry.modelcontextprotocol.io)
- [Registry Documentation](https://registry.modelcontextprotocol.io/docs)
- [mcp-publisher CLI](https://github.com/modelcontextprotocol/registry)
- [MCP Specification](https://spec.modelcontextprotocol.io)
