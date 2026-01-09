# MCP Registry Submission - Action Checklist

Quick checklist for submitting to the official MCP Registry.

## Pre-Submission Checklist

- [x] Package published to npm: `@mapbox/mcp-devkit-server@0.4.6`
- [x] `server.json` configured with updated description
- [x] `mcpName` set in package.json: `io.github.mapbox/mcp-devkit-server`
- [x] GitHub repository is public and accessible
- [ ] Latest version built and tested (`npm run build && npm test`)
- [ ] README.md updated with clear installation instructions
- [ ] Environment variables documented

## Registry Submission Steps

### Step 1: Install mcp-publisher

Choose your platform:

**macOS:**

```bash
brew install mcp-publisher
```

**Linux:**

```bash
curl -fsSL https://mcp-get.com/install.sh | sh
```

**Windows:**
Download from: https://github.com/modelcontextprotocol/registry/releases

**Verify installation:**

```bash
mcp-publisher --version
```

### Step 2: Review server.json

```bash
cat server.json
```

Verify:

- [x] Name: `io.github.mapbox/mcp-devkit-server`
- [x] Description mentions: style creation, validation, accessibility, token management
- [x] Version matches package.json: `0.4.6`
- [x] Repository URL correct
- [x] npm package identifier: `@mapbox/mcp-devkit-server`

### Step 3: Authenticate

```bash
mcp-publisher login github
```

This will:

1. Open browser for GitHub OAuth
2. Request permission to verify repository ownership
3. Store credentials locally (~/.mcp-publisher/)

**Expected output:**

```
✅ Successfully authenticated with GitHub
```

### Step 4: Publish

```bash
mcp-publisher publish
```

**Expected output:**

```
✅ Validating server.json...
✅ Verifying npm package exists...
✅ Checking GitHub repository access...
✅ Publishing to registry...
✅ Successfully published io.github.mapbox/mcp-devkit-server@0.4.6
```

### Step 5: Verify

Visit the registry and search:

- URL: https://registry.modelcontextprotocol.io
- Search: "mapbox devkit" or "io.github.mapbox/mcp-devkit-server"

**Expected result:**

- Server appears in search results
- Description, version, and repository link are correct
- Installation instructions are clear

## Post-Submission Checklist

### Immediate (Same Day)

- [ ] Verify listing on registry
- [ ] Test installation from registry: `npx @mapbox/mcp-devkit-server`
- [ ] Share announcement on Twitter/X: "🎉 Mapbox DevKit MCP Server is now in the official @MCP registry! [link]"
- [ ] Post in Anthropic Discord #mcp channel
- [ ] Add badge to README: "Available on MCP Registry"

### Week 1

- [ ] Publish blog post on mapbox.com
- [ ] Email Mapbox developer newsletter
- [ ] Post on Mapbox community forum
- [ ] Create demo video for YouTube
- [ ] Update Mapbox API documentation

### Week 2-4

- [ ] Write Dev.to article: "Building Maps with AI: A Guide"
- [ ] Write Hashnode article: "From Prototype to Production with Mapbox DevKit"
- [ ] Share on Reddit: r/ClaudeAI, r/webdev, r/gis
- [ ] Present at virtual meetup
- [ ] Submit talk proposals for conferences

### Month 2+

- [ ] Track metrics: npm downloads, GitHub stars, registry views
- [ ] Collect user testimonials
- [ ] Create case studies
- [ ] Plan v1.0 release with new features

## Registry Marketing Assets

### GitHub README Badge

Add to README.md:

```markdown
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-Available-blue)](https://registry.modelcontextprotocol.io/server/io.github.mapbox/mcp-devkit-server)
```

### Social Media Copy

**Twitter/X:**

```
🎉 Mapbox DevKit MCP Server is now in the official MCP Registry!

Build production-ready maps with AI assistance:
✅ Custom style creation
✅ Accessibility validation (WCAG)
✅ Secure token management
✅ 25+ developer tools

Try it: npx @mapbox/mcp-devkit-server

#MCP #Mapbox #AI
```

**LinkedIn:**

```
Exciting news! The Mapbox DevKit MCP Server is now available in the official Model Context Protocol Registry.

This AI-powered development toolkit helps developers:
• Create custom map styles through natural conversation
• Validate styles for production readiness (expressions, accessibility, optimization)
• Manage access tokens with proper security from day one
• Learn cartography best practices through built-in skills

It's designed to complement the main Mapbox MCP Server—use that for geospatial features in your app, and use DevKit for building the map itself.

Get started: https://registry.modelcontextprotocol.io

#DeveloperTools #AI #Geospatial #Mapbox
```

### Hacker News

**Title:** "Mapbox DevKit MCP Server – AI-powered toolkit for building map applications"

**Submission URL:** https://registry.modelcontextprotocol.io/server/io.github.mapbox/mcp-devkit-server

**Comment:**

```
Hey HN! I'm sharing the Mapbox DevKit MCP Server—an AI-powered development toolkit for building Mapbox applications.

It helps developers create and validate map styles, manage access tokens securely, check WCAG accessibility, and learn cartography best practices through natural language conversations with AI assistants like Claude.

Key features:
- 25+ tools for map development (style creation, validation, token management)
- 7 orchestrated workflow prompts (e.g., "prepare style for production")
- 5 agent skills that teach cartography and security best practices
- Production validation: expression syntax, WCAG compliance, optimization

It's different from the main Mapbox MCP Server (which provides geospatial features like geocoding and routing). This one is specifically for developers building map applications.

Would love feedback from folks building map applications or using AI coding assistants!

GitHub: https://github.com/mapbox/mcp-devkit-server
```

## Troubleshooting

### Issue: Authentication fails

**Error:** "Failed to authenticate with GitHub"

**Solution:**

1. Check GitHub account has access to mapbox organization
2. Verify repository is public
3. Try: `mcp-publisher logout && mcp-publisher login github`

### Issue: Validation error

**Error:** "server.json validation failed"

**Solution:**

1. Check schema version is current
2. Verify all required fields present
3. Run: `cat server.json | jq .` to validate JSON syntax

### Issue: Package not found

**Error:** "npm package @mapbox/mcp-devkit-server not found"

**Solution:**

1. Verify package is published: `npm view @mapbox/mcp-devkit-server`
2. Check version in server.json matches npm
3. Wait a few minutes for npm registry to update

## Support Contacts

**Registry issues:**

- GitHub: https://github.com/modelcontextprotocol/registry/issues

**MCP questions:**

- Discord: https://discord.gg/anthropic (#mcp channel)
- Spec: https://github.com/modelcontextprotocol/specification

**This server:**

- GitHub: https://github.com/mapbox/mcp-devkit-server/issues
- Internal: [Add internal contact info]

## Success Metrics to Track

After submission, monitor:

### Week 1

- [ ] Registry page views
- [ ] npm package downloads
- [ ] GitHub stars/forks
- [ ] Social media engagement

### Month 1

- [ ] Active installations (via npm)
- [ ] GitHub issues/discussions
- [ ] Community feedback/testimonials
- [ ] Blog post views

### Quarter 1

- [ ] Production deployments
- [ ] Developer retention
- [ ] Feature requests
- [ ] Community contributions

---

**Last Updated:** [Date]
**Owner:** [Name/Team]
**Status:** Ready for submission
