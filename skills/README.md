# Mapbox Agent Skills

This directory contains [Agent Skills](https://agentskills.io) that provide domain expertise and best practices for building maps with Mapbox. These skills complement the MCP server by teaching AI assistants how to make better decisions about map design, security, and implementation patterns.

## What are Agent Skills?

Agent Skills are folders containing instructions, scripts, and resources that AI agents can discover and use to perform tasks more effectively. Unlike MCP tools (which provide actions) or prompts (which provide workflows), skills provide **domain expertise** - the "know-how" that helps agents make informed decisions.

Think of skills as giving Claude a specialized education in cartography, security, and Mapbox development best practices.

## Available Skills

### 🎨 mapbox-cartography

**Expert guidance on map design principles, color theory, visual hierarchy, typography, and cartographic best practices.**

Use this skill when:

- Designing a new map style
- Choosing colors for map elements
- Making decisions about visual hierarchy
- Optimizing for specific use cases
- Ensuring accessibility
- Creating themed maps (dark mode, vintage, etc.)

**Key topics:**

- Core cartographic principles (visual hierarchy, color theory)
- Typography best practices for maps
- Map context considerations (audience, platform, use case)
- Zoom level strategies
- Color palette templates
- Common mapping scenarios (restaurant finders, real estate, etc.)

[View skill →](./mapbox-cartography/SKILL.md)

### 🔐 mapbox-token-security

**Security best practices for Mapbox access tokens, including scope management, URL restrictions, and rotation strategies.**

Use this skill when:

- Creating new tokens
- Deciding between public vs secret tokens
- Setting up token restrictions
- Implementing token rotation
- Investigating security incidents
- Conducting security audits

**Key topics:**

- Token types and when to use them (public, secret, temporary)
- Scope management (principle of least privilege)
- URL restrictions and patterns
- Token storage and handling
- Rotation strategies
- Monitoring and auditing
- Incident response plans

[View skill →](./mapbox-token-security/SKILL.md)

### 📐 mapbox-style-patterns

**Common style patterns, layer configurations, and recipes for typical mapping scenarios.**

Use this skill when:

- Starting a new map style for a specific use case
- Looking for layer configuration examples
- Implementing common mapping patterns
- Optimizing existing styles
- Need proven recipes for typical scenarios

**Key topics:**

- Restaurant/POI finder pattern
- Real estate map pattern
- Data visualization base map pattern
- Navigation/routing map pattern
- Dark mode / night theme pattern
- Layer optimization patterns
- Common modifications (3D buildings, terrain, custom markers)

[View skill →](./mapbox-style-patterns/SKILL.md)

## How Skills Work with the MCP Server

The Mapbox MCP DevKit Server and Agent Skills work together:

| Component        | Purpose               | Example                                        |
| ---------------- | --------------------- | ---------------------------------------------- |
| **MCP Tools**    | Execute actions       | `create_style_tool`, `list_tokens_tool`        |
| **MCP Prompts**  | Orchestrate workflows | `create-and-preview-style` workflow            |
| **Agent Skills** | Provide expertise     | Map design principles, security best practices |

**Example workflow:**

```
User: "Create a map for my restaurant finder app"

Without Skills:
Claude → Uses create_style_tool with basic styling

With Skills:
Claude →
1. [mapbox-cartography skill] Understands restaurant maps need:
   - High contrast for restaurant markers
   - Muted background (food photos will overlay)
   - Clear street labels for navigation
   - Mobile-optimized design

2. [mapbox-token-security skill] Knows to create public token with:
   - Only styles:read scope (principle of least privilege)
   - URL restrictions to app domain

3. [mapbox-style-patterns skill] Applies POI Finder pattern:
   - Desaturated base map
   - Orange markers (#FF6B35) for visibility
   - White roads on light gray background

4. → Uses style_builder_tool with informed design decisions
5. → Uses create_style_tool with optimized configuration
6. → Uses create_token_tool with secure settings
7. → Uses preview_style_tool to generate shareable link
```

## Using Skills

### With Claude Code

Skills in this directory are automatically discovered by Claude Code when placed in:

- Project-level: `.claude/skills/` (recommended for this repository)
- Global: `~/.claude/skills/` (available across all projects)

To use these skills in Claude Code:

```bash
# Option 1: Symlink from project root (recommended)
mkdir -p .claude
ln -s ../skills .claude/skills

# Option 2: Copy to global skills directory
cp -r skills/* ~/.claude/skills/
```

For more information, see [Claude Code Skills documentation](https://code.claude.com/docs/en/skills).

### With Claude API

Upload skills via the Skills API:

```bash
# Create a zip of the skill directory
cd skills/mapbox-cartography
zip -r mapbox-cartography.zip .

# Upload via API
curl https://api.anthropic.com/v1/skills \
  -H "anthropic-version: 2025-08-25" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-beta: skills-2025-10-02" \
  -F file=@mapbox-cartography.zip
```

For more information, see [Claude API Skills guide](https://docs.anthropic.com/en/build-with-claude/skills-guide).

### With Claude.ai

1. Go to Settings → Features
2. Upload skill as a zip file
3. Claude will automatically use the skill when relevant

For more information, see [Using Skills in Claude](https://support.claude.com/en/articles/12512180-using-skills-in-claude).

## Skill Structure

Each skill follows the Agent Skills specification:

```
skill-name/
├── SKILL.md              # Main skill file (required)
│   ├── YAML frontmatter  # name, description
│   └── Markdown content  # Instructions and guidance
└── [optional files]      # Additional resources
```

**SKILL.md format:**

```yaml
---
name: skill-name
description: What the skill does and when to use it
---
# Skill Name

[Instructions and guidance for Claude to follow]
```

## Creating Custom Skills

To create your own Mapbox-related skill:

1. **Create a new directory** in `skills/`
2. **Create SKILL.md** with YAML frontmatter and instructions
3. **Add reference materials** (optional)
4. **Test with Claude Code** or upload to API
5. **Share with team** via git or Skills API

**Guidelines:**

- Keep instructions clear and actionable
- Provide concrete examples
- Include decision trees when applicable
- Reference official Mapbox documentation
- Test with real scenarios

For more best practices, see [Agent Skills authoring guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

## License

These skills are provided under the same license as the Mapbox MCP DevKit Server (MIT License).

## Resources

- [Agent Skills Overview](https://agentskills.io)
- [Agent Skills Specification](https://github.com/anthropics/skills)
- [Claude Skills Documentation](https://docs.anthropic.com/en/agents-and-tools/agent-skills/overview)
- [Mapbox Documentation](https://docs.mapbox.com)
- [Mapbox Style Specification](https://docs.mapbox.com/style-spec/)

## Contributing

We welcome contributions of new skills or improvements to existing ones! Please:

1. Follow the existing skill structure
2. Test your skill thoroughly
3. Include clear examples
4. Submit a pull request with description

For questions or suggestions, please open an issue.
