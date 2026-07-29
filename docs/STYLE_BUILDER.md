# Mapbox Style Builder Tool

## Overview

The Style Builder tool is a utility for creating and modifying Mapbox styles programmatically. You describe what you want in conversation and the assistant calls the tool with structured parameters — a `base_style`, a `layers` array, the config surface for that base, and `custom_sources` for your own data. It covers layers, labels, boundaries, roads, POIs, and more.

**Mapbox Standard is the default and the right choice for almost every style.** It is configured rather than authored: you set `theme`, `lightPreset`, `show*` toggles and `color*` overrides on the import, and add layers only for data the basemap doesn't carry. Classic bases are for when a classic style is explicitly wanted, and they work differently in every respect — see [Standard and Classic Take Different Options](#standard-and-classic-take-different-options).

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
- **A choropleth is the exception: set `slot: "bottom"` explicitly.** The overlay default is right
  for a zone or geofence but wrong for a fill whose colour encodes a value, which wants the road
  network reading over it. The builder reports the slot it inferred either way, so the line to check
  is in the auto-corrections.
- Lines from your own data get `line-occlusion-opacity`, since the canonical user line is a
  route and a route vanishing behind buildings is a bug. Basemap roads are left alone, where
  being hidden by a building is correct.

## Standard and Classic Take Different Options

The two targets are configured differently, and passing options for the wrong one is
**rejected rather than ignored** — so a setting that would have done nothing tells you
immediately instead of shipping a style that looks unchanged. That applies to `slot` too, which
lives on the layer rather than at the top level: pass it with a Classic `base_style` and the build
stops.

|                   | Standard                                                      | Classic                                                       |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| Appearance        | `standard_config` (`theme`, `lightPreset`, `show*`, `color*`) | `global_settings` (`background_color`, `label_color`, `mode`) |
| Slots             | yes                                                           | no — order the `layers` array                                 |
| Emissive strength | yes (lit scene)                                               | no lighting to shadow layers                                  |
| Style import      | imports `mapbox://styles/mapbox/standard`                     | none — the style is self-contained                            |
| Background layer  | supplied by the import                                        | authored into the style                                       |
| Dark mode         | `lightPreset: "night"`                                        | `mode: "dark"`, or a dark-named `base_style`                  |
| Basemap features  | drawn by the import, restyled through config                  | only what you list in `layers` is drawn                       |
| `action: "hide"`  | sets the matching `show*` config toggle                       | omits the layer from the stack                                |

On Classic, `label_color` sets `text-color` on label layers, and a colour set on an individual
layer takes precedence over it.

### What a Classic `base_style` Actually Gives You

A Classic base is **not a style import**, by design: the style stays self-contained, with no
`imports` array and no dependency on another style. The builder authors the stack, so **only the
layers you list get drawn** — ask for `dark-v11` and pass no layers and you get a dark background
and nothing else.

The consequence is that the builder cannot reproduce the named style. It has no access to that
style's palette, and inventing one would mean attributing made-up cartography to a Mapbox style. So
the base name decides exactly two things:

| From the base name | Bases                                                                      | Effect                                                     |
| ------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Dark               | `dark-v11`, `navigation-night-v1`, `satellite-v9`, `satellite-streets-v12` | `#1a1a1a` land, white `text-color`, black label halo       |
| Light              | `streets-v12`, `light-v11`, `outdoors-v12`, `navigation-day-v1`            | `#f8f4f0` land, default label colour                       |
| Imagery            | `satellite-v9`, `satellite-streets-v12`                                    | `mapbox.satellite` raster layer in place of the background |

**Bases within a group are equivalent.** `dark-v11` and `navigation-night-v1` produce the same
output, because nothing available to the builder distinguishes them. That is intentional: the
alternative is a difference invented to look like fidelity it doesn't have.

An explicit `global_settings` value overrides all of it, and the land colour follows the mode you
set rather than the one the base named.

If you want the real `dark-v11` — its actual palette, road hierarchy and label treatment — reference
`mapbox://styles/mapbox/dark-v11` directly in your map, or use `base_style: "standard"` with
`lightPreset: "night"`. This tool builds a new style; it is not a way to fetch an existing one.

### Hiding Things

`action: "hide"` means different things per target, because on Standard the feature is not yours to
remove:

- **Classic** — the layer is left out of the stack, which is what hides the feature.
- **Standard** — the basemap draws it through the import, so omitting a layer hides nothing. The
  builder sets the matching config toggle instead: `poi_label` →
  `showPointOfInterestLabels`, `place_label` → `showPlaceLabels`, `transit_stop_label` →
  `showTransitLabels`, `building` → `show3dObjects`, `admin` → `showAdminBoundaries`.
- Standard exposes no toggle for water, landuse or the road network itself, so `hide` on those is
  **rejected** rather than silently doing nothing. Make them recede with `theme: "faded"` or
  `"monochrome"` and the `color*` overrides. (`showRoadLabels` hides road labels and shields;
  `showPedestrianRoads` hides paths — neither removes the carriageways.)

### Recolouring the Basemap on Standard

Adding a Streets v8 layer over Standard does not restyle the basemap's own layer — it draws a
second copy on top, which you then keep in sync by hand and which picks up defaults (a fill
outline, an opacity) the basemap never had. The builder still generates it, because an overdraw is
the right answer when the recolour is filtered to a subset the config cannot express, but it tells
you which config property retints the basemap itself: `colorWater`, `colorGreenspace`,
`colorRoads`, `colorAdminBoundaries`, `colorPlaceLabels`, `colorPointOfInterestLabels`.

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
7. **A feature you hid is still on the map**: You are on Standard, where the import draws it. Use
   the matching `show*` config toggle — see [Hiding Things](#hiding-things)
8. **A Classic style came out nearly empty**: A Classic base authors nothing for you. List every
   feature you want in `layers`, or use `base_style: "standard"`
9. **Recolouring the basemap on Standard left the old colour visible underneath**: The custom layer
   is a second copy, not a replacement. Use the `standard_config` `color*` override
10. **Performance Issues**: Reduce layer count or simplify filters for better performance
11. **Zoom Range Problems**: Verify minzoom and maxzoom settings on layers

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
- Sprite and font resources must be hosted and accessible
- Complex expressions may need manual refinement
- A Classic base does not reproduce the named style's layers — you author every layer you want
- On Standard the builder cannot reach into the imported basemap: it configures it, or draws over it

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
