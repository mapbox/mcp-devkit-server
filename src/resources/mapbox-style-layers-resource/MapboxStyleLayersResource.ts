// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { BaseResource } from '../BaseResource.js';

/**
 * Resource providing Mapbox GL JS style specification guidance
 * to help LLMs understand layer types, properties, and how to use them
 */
export class MapboxStyleLayersResource extends BaseResource {
  readonly name = 'Mapbox Style Specification Guide';
  readonly uri = 'resource://mapbox-style-layers';
  readonly description =
    'Mapbox GL JS style specification reference for layer types, paint/layout properties, and Streets v8 source layers';
  readonly mimeType = 'text/markdown';

  public async readCallback(uri: URL, _extra: unknown) {
    // Generate comprehensive markdown documentation
    const markdown = this.generateMarkdown();

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: this.mimeType,
          text: markdown
        }
      ]
    };
  }

  private generateMarkdown(): string {
    const sections: string[] = [];

    // Header
    sections.push(
      [
        '# Mapbox Style Specification Guide',
        '',
        'This guide provides the Mapbox GL JS style specification for creating custom map styles.',
        '',
        '## Streets v8 Source Layers',
        '',
        '### Source Layer → Geometry Type Mapping',
        '',
        '**Polygon layers:**',
        '- `landuse` - Land use areas (parks, residential, industrial, etc.)',
        '- `water` - Water bodies (oceans, lakes, rivers as polygons)',
        '- `building` - Building footprints with height data',
        '- `landuse_overlay` - Overlay features (wetlands, national parks)',
        '',
        '**LineString layers:**',
        '- `road` - All roads, paths, railways',
        '- `admin` - Administrative boundaries',
        '- `waterway` - Rivers, streams, canals as lines',
        '- `aeroway` - Airport runways and taxiways',
        '- `structure` - Bridges, tunnels, fences',
        '- `natural_label` - Natural feature label placement paths',
        '',
        '**Point layers:**',
        '- `place_label` - City, state, country labels',
        '- `poi_label` - Points of interest',
        '- `airport_label` - Airport labels',
        '- `transit_stop_label` - Transit stops',
        '- `motorway_junction` - Highway exits',
        '- `housenum_label` - House numbers',
        '',
        '## Placing Custom Layers on Mapbox Standard',
        '',
        'Standard is the default base style, and it behaves differently from Classic styles in two ways',
        'that break custom layers if you ignore them.',
        '',
        '### 1. Slots, not layer order',
        '',
        'On Standard, Mapbox owns the basemap layer order — you do not hand-order it, and `beforeId`',
        'against a basemap layer is not reliable because those layer names are internal to the import.',
        'Instead, put every custom layer in a **slot**:',
        '',
        '| Slot | Position in the Standard stack | Put here |',
        '| --- | --- | --- |',
        '| `bottom` | Above land / landuse / water polygons, **below** roads | Choropleths, rasters, terrain |',
        '| `middle` | Above roads and lines, **behind** 3D buildings and labels | Most data overlays — polygon fills, geofences, zone boundaries, heatmaps, routes, custom POI layers |',
        '| `top` | Above POI labels, **behind** place and transit labels | Markers, active selections |',
        '',
        'Omitting `slot` is not a neutral default: the layer lands **above every basemap layer, including',
        'street labels**. That is the most common mistake when adding layers to Standard.',
        '',
        '`slot` is a style-spec property, so the same value works on GL JS, Android, iOS and Flutter.',
        '',
        '### 2. Emissive strength, or your layer disappears at night',
        '',
        'Standard is a lit 3D scene. `fill-emissive-strength`, `line-emissive-strength` and',
        '`circle-emissive-strength` all default to `0`, which means the scene lights the layer — so under',
        'the `dusk` and `night` light presets it falls into shadow and goes nearly invisible.',
        '',
        '- Set emissive strength to `1` on every custom **fill**, **line** and **circle** layer.',
        '- **Symbol layers need nothing**: `icon-emissive-strength` and `text-emissive-strength` already',
        '  default to `1`, so icons and labels stay legible across all four presets on their own.',
        '- **fill-extrusion** is genuinely 3D and should be lit by the scene — leave it alone.',
        '- **heatmap** has no emissive-strength property at all; it is not lit by the scene.',
        '- Routes should also set `line-occlusion-opacity` (default `0` hides the occluded part entirely).',
        '',
        'Changing the light preset does **not** recolor your own layers — they keep the paint colors you',
        'gave them. Emissive strength is what keeps those colors readable when the basemap goes dark.',
        '',
        '```json',
        '{ "id": "zones", "type": "fill", "slot": "middle", "source": "zones",',
        '  "paint": { "fill-color": "#7b61ff", "fill-opacity": 0.6, "fill-emissive-strength": 1 } }',
        '',
        '{ "id": "route", "type": "line", "slot": "middle", "source": "route",',
        '  "paint": { "line-color": "#3b6df5", "line-width": 4, "line-emissive-strength": 1, "line-occlusion-opacity": 1 } }',
        '```',
        '',
        '### 3. Prefer configuration over new layers',
        '',
        'Before adding a layer to restyle something the basemap already draws, check whether Standard',
        'exposes it as a config property. Setting `theme`, `lightPreset`, a `show*` toggle or a `color*`',
        'override on the import is cheaper, survives basemap updates, and cannot land in the wrong slot.',
        'Dark mode in particular is `lightPreset: "night"` — not a different base style, and not',
        'hand-authored dark colors.',
        '',
        '## Layer Types and Properties',
        ''
      ].join('\n')
    );

    // Fill layer
    sections.push(
      [
        '### fill',
        'Used for: Polygon features (landuse, water, building, landuse_overlay)',
        '',
        '**Paint properties:**',
        '- `fill-color` - The color of the filled area (default: `#000000`)',
        '- `fill-opacity` - Opacity of the entire fill layer, 0-1 (default: `1`)',
        '- `fill-outline-color` - Color of the outline (disabled if unset)',
        '- `fill-pattern` - Name of image in sprite to use for fill pattern',
        '- `fill-antialias` - Whether to antialias the fill (default: `true`)',
        '- `fill-translate` - Geometry translation [x, y] in pixels (default: `[0, 0]`)',
        '- `fill-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)',
        '- `fill-emissive-strength` - How much the fill is lit by its own light rather than the scene, 0-1 (default: `0`). **Set to `1` on custom layers over Standard**, or the layer falls into shadow and goes nearly invisible under the `dusk`/`night` light presets',
        '',
        '**No layout properties for fill layers**',
        ''
      ].join('\n')
    );

    // Line layer
    sections.push(
      [
        '### line',
        'Used for: LineString features (road, admin, waterway, aeroway, structure, natural_label)',
        '',
        '**Paint properties:**',
        '- `line-color` - The color of the line (default: `#000000`)',
        '- `line-width` - Width of the line in pixels (default: `1`)',
        '- `line-opacity` - Opacity of the line, 0-1 (default: `1`)',
        '- `line-blur` - Blur applied to the line in pixels (default: `0`)',
        '- `line-dasharray` - Dash pattern [dash, gap, dash, gap...] (solid if unset)',
        '- `line-gap-width` - Width of inner gap in line (default: `0`)',
        '- `line-offset` - Line offset perpendicular to direction (default: `0`)',
        '- `line-pattern` - Name of image in sprite for line pattern',
        '- `line-gradient` - Gradient along the line (requires `lineMetrics: true` in source)',
        '- `line-translate` - Geometry translation [x, y] in pixels (default: `[0, 0]`)',
        '- `line-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)',
        '- `line-emissive-strength` - How much the line is lit by its own light rather than the scene, 0-1 (default: `0`). **Set to `1` on custom layers over Standard**, or the line goes nearly invisible under the `dusk`/`night` light presets',
        '- `line-occlusion-opacity` - Opacity of the portion of the line hidden behind 3D objects, 0-1 (default: `0`, i.e. completely hidden). **Set this on routes**, or the route vanishes where it passes behind 3D buildings',
        '',
        '**Layout properties:**',
        '- `line-cap` - Display of line ends: `butt`, `round`, `square` (default: `butt`)',
        '- `line-join` - Display of line joins: `bevel`, `round`, `miter` (default: `miter`)',
        '- `line-miter-limit` - Maximum miter length (default: `2`)',
        '- `line-round-limit` - Maximum round join radius (default: `1.05`)',
        '- `line-sort-key` - Sort key for layer ordering',
        ''
      ].join('\n')
    );

    // Symbol layer
    sections.push(
      [
        '### symbol',
        'Used for: Point and LineString labels (all *_label layers, natural_label, motorway_junction)',
        '',
        '**Layout properties (text):**',
        '- `text-field` - Text to display, e.g., `["get", "name"]`',
        '- `text-font` - Font stack, e.g., `["DIN Pro Regular", "Arial Unicode MS Regular"]`',
        '- `text-size` - Font size in pixels (default: `16`)',
        '- `text-max-width` - Maximum text width in ems (default: `10`)',
        '- `text-line-height` - Text line height in ems (default: `1.2`)',
        '- `text-letter-spacing` - Letter spacing in ems (default: `0`)',
        '- `text-justify` - Text justification: `auto`, `left`, `center`, `right` (default: `center`)',
        '- `text-anchor` - Text anchor: `center`, `left`, `right`, `top`, `bottom`, `top-left`, etc.',
        '- `text-max-angle` - Maximum angle for curved text (default: `45`)',
        '- `text-rotate` - Text rotation in degrees (default: `0`)',
        '- `text-padding` - Padding around text for collision (default: `2`)',
        '- `text-keep-upright` - Keep text upright when map rotates (default: `true`)',
        '- `text-transform` - Text case: `none`, `uppercase`, `lowercase` (default: `none`)',
        '- `text-offset` - Text offset [x, y] in ems (default: `[0, 0]`)',
        '- `text-allow-overlap` - Allow text to overlap (default: `false`)',
        '- `text-ignore-placement` - Ignore placement collisions (default: `false`)',
        '- `text-optional` - Hide text if icon collides (default: `false`)',
        '',
        '**Layout properties (icon):**',
        '- `icon-image` - Name of icon in sprite, e.g., `["get", "maki"]`',
        '- `icon-size` - Scale factor for icon (default: `1`)',
        '- `icon-rotate` - Icon rotation in degrees (default: `0`)',
        '- `icon-padding` - Padding around icon for collision (default: `2`)',
        '- `icon-keep-upright` - Keep icon upright (default: `false`)',
        '- `icon-offset` - Icon offset [x, y] in ems (default: `[0, 0]`)',
        '- `icon-anchor` - Icon anchor: `center`, `left`, `right`, `top`, `bottom`, etc.',
        '- `icon-pitch-alignment` - Icon alignment: `map`, `viewport`, `auto` (default: `auto`)',
        '- `icon-text-fit` - Scale icon to text: `none`, `width`, `height`, `both` (default: `none`)',
        '- `icon-text-fit-padding` - Padding for icon-text-fit [top, right, bottom, left]',
        '- `icon-allow-overlap` - Allow icon to overlap (default: `false`)',
        '- `icon-ignore-placement` - Ignore icon collisions (default: `false`)',
        '- `icon-optional` - Hide icon if text collides (default: `false`)',
        '',
        '**Layout properties (symbol):**',
        '- `symbol-placement` - Symbol placement: `point`, `line`, `line-center` (default: `point`)',
        '- `symbol-spacing` - Distance between symbols on line (default: `250`)',
        '- `symbol-avoid-edges` - Avoid symbols at tile edges (default: `false`)',
        '- `symbol-sort-key` - Sort key for symbol ordering',
        '- `symbol-z-order` - Z-order: `auto`, `viewport-y`, `source` (default: `auto`)',
        '',
        '**Paint properties (text):**',
        '- `text-color` - Color of the text (default: `#000000`)',
        '- `text-halo-color` - Color of the halo around text (default: `rgba(0, 0, 0, 0)`)',
        '- `text-halo-width` - Width of the halo (default: `0`)',
        '- `text-halo-blur` - Blur of the halo (default: `0`)',
        '- `text-opacity` - Opacity of the text, 0-1 (default: `1`)',
        '- `text-translate` - Text translation [x, y] in pixels (default: `[0, 0]`)',
        '- `text-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)',
        '',
        '**Paint properties (icon):**',
        '- `icon-color` - Tint color for SDF icons',
        '- `icon-halo-color` - Color of icon halo for SDF icons',
        '- `icon-halo-width` - Width of icon halo (default: `0`)',
        '- `icon-halo-blur` - Blur of icon halo (default: `0`)',
        '- `icon-opacity` - Opacity of the icon, 0-1 (default: `1`)',
        '- `icon-translate` - Icon translation [x, y] in pixels (default: `[0, 0]`)',
        '- `icon-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)',
        ''
      ].join('\n')
    );

    // Circle layer
    sections.push(
      [
        '### circle',
        'Used for: Point features (can be used with POI or custom point data)',
        '',
        '**Paint properties:**',
        '- `circle-color` - The color of the circle (default: `#000000`)',
        '- `circle-radius` - Circle radius in pixels (default: `5`)',
        '- `circle-opacity` - Opacity of the circle, 0-1 (default: `1`)',
        '- `circle-blur` - Amount to blur the circle (default: `0`)',
        '- `circle-stroke-color` - Color of the circle stroke',
        '- `circle-stroke-width` - Width of the circle stroke (default: `0`)',
        '- `circle-stroke-opacity` - Opacity of the circle stroke, 0-1 (default: `1`)',
        '- `circle-translate` - Circle translation [x, y] in pixels (default: `[0, 0]`)',
        '- `circle-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)',
        '- `circle-pitch-scale` - Circle scaling: `map` or `viewport` (default: `map`)',
        '- `circle-pitch-alignment` - Circle alignment: `map` or `viewport` (default: `viewport`)',
        '- `circle-emissive-strength` - How much the circle is lit by its own light rather than the scene, 0-1 (default: `0`). **Set to `1` on custom layers over Standard**. This is the one most often forgotten, because circles are usually the foreground data — cluster bubbles, proportional symbols, user-location dots — and they dim out at `night`',
        '',
        '**Layout properties:**',
        '- `circle-sort-key` - Sort key for circle ordering',
        ''
      ].join('\n')
    );

    // Fill-extrusion layer
    sections.push(
      [
        '### fill-extrusion',
        'Used for: 3D buildings (building layer with height/min_height attributes)',
        '',
        '**Paint properties:**',
        '- `fill-extrusion-color` - Base color of the extrusion (default: `#000000`)',
        '- `fill-extrusion-height` - Height in meters, e.g., `["get", "height"]` (default: `0`)',
        '- `fill-extrusion-base` - Base height in meters, e.g., `["get", "min_height"]` (default: `0`)',
        '- `fill-extrusion-opacity` - Opacity of the extrusion, 0-1 (default: `1`)',
        '- `fill-extrusion-pattern` - Name of image in sprite for pattern',
        '- `fill-extrusion-translate` - Geometry translation [x, y] in pixels (default: `[0, 0]`)',
        '- `fill-extrusion-translate-anchor` - Reference: `map` or `viewport` (default: `map`)',
        '- `fill-extrusion-vertical-gradient` - Use vertical gradient (default: `true`)',
        '',
        '**No layout properties for fill-extrusion layers**',
        ''
      ].join('\n')
    );

    // Common patterns and examples
    sections.push(
      [
        '## Common Patterns',
        '',
        '### Filtering Examples',
        '',
        '**Parks only (not cemeteries or golf courses):**',
        '```json',
        '{',
        '  "layer_type": "landuse",',
        '  "filter_properties": { "class": "park" }',
        '}',
        '```',
        '',
        '**Major roads:**',
        '```json',
        '{',
        '  "layer_type": "road",',
        '  "filter_properties": { "class": ["motorway", "trunk", "primary"] }',
        '}',
        '```',
        '',
        '**Country boundaries:**',
        '```json',
        '{',
        '  "layer_type": "admin",',
        '  "filter_properties": { "admin_level": 0, "maritime": "false" }',
        '}',
        '```',
        '',
        '**3D Buildings:**',
        '```json',
        '{',
        '  "layer_type": "building",',
        '  "filter_properties": { "extrude": "true" }',
        '}',
        '```',
        ''
      ].join('\n')
    );

    // Available fields reference
    sections.push(
      [
        '## Available Filter Fields',
        '',
        'For detailed field values in each source layer, use the style_builder_tool.',
        'The tool will provide specific guidance when a layer is not recognized.',
        '',
        '### Key Fields by Layer:',
        '',
        '**landuse:** class, type',
        '**road:** class, type, structure, toll, oneway',
        '**admin:** admin_level, disputed, maritime',
        '**building:** type, height, min_height, extrude',
        '**water:** (no filter fields - all water features)',
        '**waterway:** class, type',
        '**place_label:** class, type, capital',
        '**poi_label:** maki, class, filterrank',
        '**transit_stop_label:** mode, stop_type, network',
        ''
      ].join('\n')
    );

    // Working with styles
    sections.push(
      [
        '## Working with Styles',
        '',
        '### Using style_builder_tool',
        '',
        'The style_builder_tool is the primary way to create Mapbox styles. It:',
        '- Automatically determines the correct geometry type for each source layer',
        '- Applies appropriate paint properties based on the action (color, highlight, hide, show)',
        '- Generates proper filters from filter_properties',
        '- Provides helpful suggestions when layers are not recognized',
        '',
        '### Example Usage',
        '',
        '```',
        'style_builder_tool({',
        '  style_name: "Custom Style",',
        '  base_style: "standard",',
        '  layers: [',
        '    {',
        '      layer_type: "water",',
        '      action: "color",',
        '      color: "#0099ff"',
        '    },',
        '    {',
        '      layer_type: "landuse",',
        '      filter_properties: { class: "park" },',
        '      action: "color",',
        '      color: "#00ff00"',
        '    },',
        '    {',
        '      layer_type: "road",',
        '      filter_properties: { class: ["motorway", "trunk"] },',
        '      action: "highlight"',
        '    }',
        '  ]',
        '})',
        '```'
      ].join('\n')
    );

    return sections.join('\n');
  }
}
