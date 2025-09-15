# Mapbox Style Builder Tool

## Overview

The Style Builder tool is a powerful utility for creating and modifying Mapbox styles programmatically. It provides a conversational interface to build complex map styles with various customizations for layers, labels, boundaries, roads, POIs, and more.

## Important Limitations

⚠️ **Resource Access Limitation**: Style resources (sprites, glyphs, and other assets) cannot currently be accessed through clients like Claude Desktop. This is a known limitation when using the tool through MCP (Model Context Protocol) interfaces.

## Getting Started

To start building a style, you can initiate the conversation with prompts like:

- "Can you help me building a style, what customizations can I make?"
- "Create a new Mapbox style with specific features"
- "Modify my existing style to add/remove layers"

The tool can be used for both **creating new styles** and **modifying existing styles**.

## Example Style Creation Prompts

### 1. Comprehensive Style with All Labels

**Prompt**: "Create a style with all possible labels enabled, make every label have a different look so that they can be distinguished. Include also all boundaries (countries, provinces). And all roads with different colors and opacities. POIs with icons."

This creates a maximally detailed style where:

- Every label type has distinct visual properties
- All administrative boundaries are visible
- Roads are color-coded by type
- POIs display with appropriate icons

### 2. Selective Administrative and Road Display

**Prompt**: "Create a style with only administrative boundaries having admin_level 0 or 1, and roads with class motorway and oneway true"

This creates a minimalist style focusing on:

- Country and state/province boundaries only
- Motorways that are one-way streets
- Clean, uncluttered appearance

### 3. Zoom-Based Road Visibility

**Prompt**: "Create a style with minor roads only visible above zoom 14, service roads only above zoom 16, with zoom-based width increase"

This creates a progressive detail style where:

- Road visibility depends on zoom level
- Road widths increase smoothly with zoom
- Performance optimized for different zoom ranges

### 4. Comprehensive POI Filtering

**Prompt**: "Create a style with only POIs showing maki icons for restaurants, cafes, and bars, each in different colors"

This creates a food & beverage focused style with:

- Selective POI display
- Color-coded categories
- Clear maki icon representation

### 5. Complex Boundary Rules

**Prompt**: "Create a style with international boundaries (admin_level 0) that are not maritime and not disputed in solid black, disputed ones in red dashed"

This creates a politically-aware style with:

- Different styling for disputed boundaries
- Maritime boundary filtering
- Visual hierarchy for boundary types

## Common Customizations

The Style Builder supports extensive customizations including:

### Layers

- Add/remove specific layer types
- Modify layer ordering
- Apply filters and conditions

### Labels

- Control text size, font, and color
- Set visibility by zoom level
- Adjust label density and overlap behavior

### Roads

- Customize by road class (motorway, trunk, primary, secondary, etc.)
- Apply different styles for bridges and tunnels
- Control casing and width properties

### Boundaries

- Filter by administrative level
- Style disputed boundaries differently
- Control maritime boundary display

### POIs (Points of Interest)

- Filter by category or specific types
- Customize icons and colors
- Control density and zoom-based visibility

### Buildings

- 3D extrusion settings
- Color by height or type
- Opacity and visibility controls

### Terrain and Hillshading

- Add terrain layers
- Adjust hillshade intensity
- Control exaggeration factors

## Advanced Features

### Working with Existing Styles

The tool can modify existing Mapbox styles:

- Import a style by ID or URL
- Make targeted modifications
- Preserve existing customizations while adding new features

### Performance Optimization

The builder can optimize styles for:

- Mobile devices (reduced layer count)
- High-density displays
- Specific zoom ranges

### Theme Variations

Create multiple versions of a style:

- Light and dark modes
- Seasonal variations
- Brand-specific color schemes

## Best Practices

1. **Start Simple**: Begin with basic requirements and iteratively add complexity
2. **Test at Multiple Zooms**: Ensure your style works well across zoom levels
3. **Consider Performance**: More layers and complex filters can impact rendering speed
4. **Use Consistent Naming**: When creating custom layers, use clear, descriptive IDs
5. **Document Your Choices**: Keep notes on why certain styling decisions were made

## Troubleshooting

### Common Issues

1. **Resources Not Loading**: Remember that sprite and glyph resources may not be accessible in Claude Desktop
2. **Layer Conflicts**: Check layer ordering if elements appear hidden
3. **Performance Issues**: Reduce layer count or simplify filters for better performance
4. **Zoom Range Problems**: Verify minzoom and maxzoom settings on layers

### Getting Help

When encountering issues, provide:

- The style configuration you're trying to achieve
- Any error messages received
- The platform/client you're using

## Technical Details

The Style Builder tool:

- Generates Mapbox GL JS compatible style specifications
- Follows the Mapbox Style Specification v8
- Supports all standard Mapbox layer types
- Can output styles for use in Mapbox GL JS, native SDKs, and Mapbox Studio

## Limitations and Considerations

- Some advanced Studio-only features may not be available
- Custom data sources need to be added separately
- Sprite and font resources must be hosted and accessible
- Complex expressions may need manual refinement

## Integration with Other Tools

Once you've built or modified a style using the Style Builder:

### Creating a New Style

Use the **CreateStyleTool** to save your generated style to your Mapbox account:

- The tool will create a new style with your specifications
- Returns a style ID that you can use for further modifications

### Updating an Existing Style

Use the **UpdateStyleTool** to apply modifications to an existing style:

- Provide the style ID or name of the style you want to update (if the name uniquely identifies it)
- The tool will update the style with your new specifications

### Previewing Your Style

Use the **PreviewStyleTool** to generate a preview URL:

- Instantly view your style in a browser
- Test different zoom levels and locations
- Share the preview link with team members

**Example workflow for new style:**

1. "Build a style with only roads and labels"
2. "Now create this style in my account" → Uses CreateStyleTool
3. "Generate a preview link for this style" → Uses PreviewStyleTool

**Example workflow for modifying existing style:**

1. "Modify my 'Winter Theme' style to add POIs with restaurant icons"
2. "Update the style in my account" → Uses UpdateStyleTool (finds style by name)
3. "Generate a preview link for this style" → Uses PreviewStyleTool

**Alternative with style ID:**

1. "Modify style clxyz123... to add building extrusions"
2. "Update the style in my account" → Uses UpdateStyleTool (uses style ID)
3. "Generate a preview link for this style" → Uses PreviewStyleTool

## Next Steps

After creating or modifying your style:

1. Test in your target environment using the preview URL
2. Use the style in your applications with the style ID
3. Optimize for your specific use case
4. Consider creating variations for different contexts
5. Your styles are also viewable and editable in Mapbox Studio if needed

For more information on Mapbox styles, refer to the [Mapbox Style Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/).
