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

- Light and dark modes — on Mapbox Standard these are the same style with a different
  `lightPreset` (`day`, `dawn`, `dusk`, `night`), not two separate styles. The preset can be
  switched at runtime without reloading the style
- Seasonal variations
- Brand-specific color schemes

## Working with Mapbox Standard

Standard is the default base style, and it works differently from Classic styles in ways that
matter for anything you add on top.

**Configure before you add layers.** Standard exposes its basemap through style-import config:
`theme` (`default`/`faded`/`monochrome`), `lightPreset`, `show*` toggles for labels, POIs, roads
and 3D objects, and `color*` overrides for water, roads, greenspace, labels and boundaries.
Setting one of those is cheaper than adding a layer, survives basemap updates, and can't land in
the wrong place in the stack. Reach for a custom layer only for data the basemap doesn't carry.

**Every custom layer needs a slot.** Mapbox owns the basemap layer order on Standard, so you don't
hand-order layers into it — you place each one in a slot:

| Slot     | Position                                                | Put here                                                       |
| -------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| `bottom` | Above land / landuse / water, **below** roads           | Choropleths, rasters, terrain                                  |
| `middle` | Above roads and lines, **behind** 3D buildings & labels | Data overlays, zone fills, heatmaps, routes, custom POI layers |
| `top`    | Above POI labels, **behind** place & transit labels     | Markers, active selections                                     |

Omitting `slot` is not a neutral default — the layer draws above every basemap layer, including
street labels. The builder infers a slot from the layer type when you leave it off, and tells you
which one it picked.

**Custom fill, line and circle layers need emissive strength.** Standard is a lit scene, and
`fill-emissive-strength`, `line-emissive-strength` and `circle-emissive-strength` all default to
`0` — meaning the scene lights the layer, so it falls into shadow and goes nearly invisible under
the `dusk` and `night` presets. The builder sets these to `1` for you on Standard styles. Symbol
layers need nothing (icon and text emissive strength already default to `1`), and `fill-extrusion`
is left alone because it is real 3D geometry that should be lit by the scene.

Routes should also set `line-occlusion-opacity`; its default of `0` hides the part of the line
that passes behind 3D buildings.

## Adding Your Own Data

The `layer_type` lookup covers Mapbox Streets v8 basemap features — roads, landuse, water,
POIs. It does not cover your data. For that, declare a source in `custom_sources` and point a
layer at it with `source_id`:

```json
{
  "style_name": "Delivery",
  "base_style": "standard",
  "custom_sources": {
    "zones": { "type": "geojson", "data": "https://example.com/zones.geojson" },
    "route": { "type": "geojson", "data": "https://example.com/route.geojson" }
  },
  "layers": [
    {
      "layer_type": "Delivery zones",
      "source_id": "zones",
      "render_type": "fill",
      "action": "color",
      "color": "#7b61ff",
      "opacity": 0.6
    },
    {
      "layer_type": "Route",
      "source_id": "route",
      "render_type": "line",
      "action": "color",
      "color": "#3b6df5",
      "width": 4
    }
  ]
}
```

Notes:

- **`render_type` is required** for these layers. A GeoJSON URL or a tileset gives the builder
  nothing to inspect, so it cannot pick between fill, line and circle for you.
- For `type: "vector"`, also set `source_layer` — the layer name inside the tileset. GeoJSON
  has no source layers.
- **Placement differs from basemap layers on purpose.** A basemap fill (parks, water) goes in
  `bottom`, under the road network. A fill of your own data is an overlay, so it goes in
  `middle` — above roads, behind labels and 3D buildings. Symbols go in `top`.
- Lines from your own data get `line-occlusion-opacity`, since the canonical user line is a
  route and a route vanishing behind buildings is a bug. Basemap roads are left alone, where
  being hidden by a building is correct.

## Standard and Classic Take Different Options

The two targets are configured differently, and passing options for the wrong one is
**rejected rather than ignored** — so a setting that would have done nothing tells you
immediately instead of shipping a style that looks unchanged.

|                   | Standard                                                      | Classic                                                       |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Appearance        | `standard_config` (`theme`, `lightPreset`, `show*`, `color*`) | `global_settings` (`background_color`, `label_color`, `mode`) |
| Slots             | yes                                                           | no                                                            |
| Emissive strength | yes (lit scene)                                               | no lighting to shadow layers                                  |
| Background layer  | supplied by the import                                        | authored into the style                                       |
| Dark mode         | `lightPreset: "night"`                                        | `mode: "dark"`                                                |

On Classic, `label_color` sets `text-color` on label layers, and a colour set on an individual
layer takes precedence over it.

## Best Practices

1. **Configure Before Layering**: On Standard, try `standard_config` before adding a custom layer
2. **Start Simple**: Begin with basic requirements and iteratively add complexity
3. **Test at Multiple Zooms**: Ensure your style works well across zoom levels
4. **Test at Night**: Preview with `lightPreset: "night"`, not just the default `day` — a missing
   emissive strength is invisible in day-time review and obvious at night
5. **Consider Performance**: More layers and complex filters can impact rendering speed
6. **Use Consistent Naming**: When creating custom layers, use clear, descriptive IDs
7. **Document Your Choices**: Keep notes on why certain styling decisions were made

## Troubleshooting

### Common Issues

1. **Resources Not Loading**: Remember that sprite and glyph resources may not be accessible in Claude Desktop
2. **Layer Conflicts**: Check layer ordering if elements appear hidden
3. **Custom layer covers the street labels**: The layer has no `slot`, or is in `top` when it
   should be in `bottom` or `middle`
4. **Custom layer looks right by day and disappears at night**: The layer is missing its
   `fill-`/`line-`/`circle-emissive-strength`, so the night preset lights it into shadow
5. **Route vanishes behind buildings**: Set `line-occlusion-opacity`, which defaults to `0`
6. **Dark mode looks half-applied**: `global_settings.mode: "dark"` only recolors custom layers.
   On Standard, set `standard_config.lightPreset: "night"` instead
7. **Performance Issues**: Reduce layer count or simplify filters for better performance
8. **Zoom Range Problems**: Verify minzoom and maxzoom settings on layers

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
