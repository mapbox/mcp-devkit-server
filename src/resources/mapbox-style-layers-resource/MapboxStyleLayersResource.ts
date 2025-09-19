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

  protected async readCallback(uri: URL) {
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
    sections.push('# Mapbox Style Specification Guide');
    sections.push('');
    sections.push(
      'This guide provides the Mapbox GL JS style specification for creating custom map styles.'
    );
    sections.push('');

    // Source layers and geometry types
    sections.push('## Streets v8 Source Layers');
    sections.push('');
    sections.push('### Source Layer → Geometry Type Mapping');
    sections.push('');
    sections.push('**Polygon layers:**');
    sections.push(
      '- `landuse` - Land use areas (parks, residential, industrial, etc.)'
    );
    sections.push(
      '- `water` - Water bodies (oceans, lakes, rivers as polygons)'
    );
    sections.push('- `building` - Building footprints with height data');
    sections.push(
      '- `landuse_overlay` - Overlay features (wetlands, national parks)'
    );
    sections.push('');
    sections.push('**LineString layers:**');
    sections.push('- `road` - All roads, paths, railways');
    sections.push('- `admin` - Administrative boundaries');
    sections.push('- `waterway` - Rivers, streams, canals as lines');
    sections.push('- `aeroway` - Airport runways and taxiways');
    sections.push('- `structure` - Bridges, tunnels, fences');
    sections.push('- `natural_label` - Natural feature label placement paths');
    sections.push('');
    sections.push('**Point layers:**');
    sections.push('- `place_label` - City, state, country labels');
    sections.push('- `poi_label` - Points of interest');
    sections.push('- `airport_label` - Airport labels');
    sections.push('- `transit_stop_label` - Transit stops');
    sections.push('- `motorway_junction` - Highway exits');
    sections.push('- `housenum_label` - House numbers');
    sections.push('');
    sections.push('## Layer Types and Properties');
    sections.push('');

    sections.push('### fill');
    sections.push(
      'Used for: Polygon features (landuse, water, building, landuse_overlay)'
    );
    sections.push('');
    sections.push('**Paint properties:**');
    sections.push(
      '- `fill-color` - The color of the filled area (default: `#000000`)'
    );
    sections.push(
      '- `fill-opacity` - Opacity of the entire fill layer, 0-1 (default: `1`)'
    );
    sections.push(
      '- `fill-outline-color` - Color of the outline (disabled if unset)'
    );
    sections.push(
      '- `fill-pattern` - Name of image in sprite to use for fill pattern'
    );
    sections.push(
      '- `fill-antialias` - Whether to antialias the fill (default: `true`)'
    );
    sections.push(
      '- `fill-translate` - Geometry translation [x, y] in pixels (default: `[0, 0]`)'
    );
    sections.push(
      '- `fill-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)'
    );
    sections.push('');
    sections.push('**No layout properties for fill layers**');
    sections.push('');

    sections.push('### line');
    sections.push(
      'Used for: LineString features (road, admin, waterway, aeroway, structure, natural_label)'
    );
    sections.push('');
    sections.push('**Paint properties:**');
    sections.push(
      '- `line-color` - The color of the line (default: `#000000`)'
    );
    sections.push(
      '- `line-width` - Width of the line in pixels (default: `1`)'
    );
    sections.push('- `line-opacity` - Opacity of the line, 0-1 (default: `1`)');
    sections.push(
      '- `line-blur` - Blur applied to the line in pixels (default: `0`)'
    );
    sections.push(
      '- `line-dasharray` - Dash pattern [dash, gap, dash, gap...] (solid if unset)'
    );
    sections.push(
      '- `line-gap-width` - Width of inner gap in line (default: `0`)'
    );
    sections.push(
      '- `line-offset` - Line offset perpendicular to direction (default: `0`)'
    );
    sections.push(
      '- `line-pattern` - Name of image in sprite for line pattern'
    );
    sections.push(
      '- `line-gradient` - Gradient along the line (requires `lineMetrics: true` in source)'
    );
    sections.push(
      '- `line-translate` - Geometry translation [x, y] in pixels (default: `[0, 0]`)'
    );
    sections.push(
      '- `line-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)'
    );
    sections.push('');
    sections.push('**Layout properties:**');
    sections.push(
      '- `line-cap` - Display of line ends: `butt`, `round`, `square` (default: `butt`)'
    );
    sections.push(
      '- `line-join` - Display of line joins: `bevel`, `round`, `miter` (default: `miter`)'
    );
    sections.push('- `line-miter-limit` - Maximum miter length (default: `2`)');
    sections.push(
      '- `line-round-limit` - Maximum round join radius (default: `1.05`)'
    );
    sections.push('- `line-sort-key` - Sort key for layer ordering');
    sections.push('');

    sections.push('### symbol');
    sections.push(
      'Used for: Point and LineString labels (all *_label layers, natural_label, motorway_junction)'
    );
    sections.push('');
    sections.push('**Layout properties (text):**');
    sections.push('- `text-field` - Text to display, e.g., `["get", "name"]`');
    sections.push(
      '- `text-font` - Font stack, e.g., `["DIN Pro Regular", "Arial Unicode MS Regular"]`'
    );
    sections.push('- `text-size` - Font size in pixels (default: `16`)');
    sections.push(
      '- `text-max-width` - Maximum text width in ems (default: `10`)'
    );
    sections.push(
      '- `text-line-height` - Text line height in ems (default: `1.2`)'
    );
    sections.push(
      '- `text-letter-spacing` - Letter spacing in ems (default: `0`)'
    );
    sections.push(
      '- `text-justify` - Text justification: `auto`, `left`, `center`, `right` (default: `center`)'
    );
    sections.push(
      '- `text-anchor` - Text anchor: `center`, `left`, `right`, `top`, `bottom`, `top-left`, etc.'
    );
    sections.push(
      '- `text-max-angle` - Maximum angle for curved text (default: `45`)'
    );
    sections.push('- `text-rotate` - Text rotation in degrees (default: `0`)');
    sections.push(
      '- `text-padding` - Padding around text for collision (default: `2`)'
    );
    sections.push(
      '- `text-keep-upright` - Keep text upright when map rotates (default: `true`)'
    );
    sections.push(
      '- `text-transform` - Text case: `none`, `uppercase`, `lowercase` (default: `none`)'
    );
    sections.push(
      '- `text-offset` - Text offset [x, y] in ems (default: `[0, 0]`)'
    );
    sections.push(
      '- `text-allow-overlap` - Allow text to overlap (default: `false`)'
    );
    sections.push(
      '- `text-ignore-placement` - Ignore placement collisions (default: `false`)'
    );
    sections.push(
      '- `text-optional` - Hide text if icon collides (default: `false`)'
    );
    sections.push('');
    sections.push('**Layout properties (icon):**');
    sections.push(
      '- `icon-image` - Name of icon in sprite, e.g., `["get", "maki"]`'
    );
    sections.push('- `icon-size` - Scale factor for icon (default: `1`)');
    sections.push('- `icon-rotate` - Icon rotation in degrees (default: `0`)');
    sections.push(
      '- `icon-padding` - Padding around icon for collision (default: `2`)'
    );
    sections.push(
      '- `icon-keep-upright` - Keep icon upright (default: `false`)'
    );
    sections.push(
      '- `icon-offset` - Icon offset [x, y] in ems (default: `[0, 0]`)'
    );
    sections.push(
      '- `icon-anchor` - Icon anchor: `center`, `left`, `right`, `top`, `bottom`, etc.'
    );
    sections.push(
      '- `icon-pitch-alignment` - Icon alignment: `map`, `viewport`, `auto` (default: `auto`)'
    );
    sections.push(
      '- `icon-text-fit` - Scale icon to text: `none`, `width`, `height`, `both` (default: `none`)'
    );
    sections.push(
      '- `icon-text-fit-padding` - Padding for icon-text-fit [top, right, bottom, left]'
    );
    sections.push(
      '- `icon-allow-overlap` - Allow icon to overlap (default: `false`)'
    );
    sections.push(
      '- `icon-ignore-placement` - Ignore icon collisions (default: `false`)'
    );
    sections.push(
      '- `icon-optional` - Hide icon if text collides (default: `false`)'
    );
    sections.push('');
    sections.push('**Layout properties (symbol):**');
    sections.push(
      '- `symbol-placement` - Symbol placement: `point`, `line`, `line-center` (default: `point`)'
    );
    sections.push(
      '- `symbol-spacing` - Distance between symbols on line (default: `250`)'
    );
    sections.push(
      '- `symbol-avoid-edges` - Avoid symbols at tile edges (default: `false`)'
    );
    sections.push('- `symbol-sort-key` - Sort key for symbol ordering');
    sections.push(
      '- `symbol-z-order` - Z-order: `auto`, `viewport-y`, `source` (default: `auto`)'
    );
    sections.push('');
    sections.push('**Paint properties (text):**');
    sections.push('- `text-color` - Color of the text (default: `#000000`)');
    sections.push(
      '- `text-halo-color` - Color of the halo around text (default: `rgba(0, 0, 0, 0)`)'
    );
    sections.push('- `text-halo-width` - Width of the halo (default: `0`)');
    sections.push('- `text-halo-blur` - Blur of the halo (default: `0`)');
    sections.push('- `text-opacity` - Opacity of the text, 0-1 (default: `1`)');
    sections.push(
      '- `text-translate` - Text translation [x, y] in pixels (default: `[0, 0]`)'
    );
    sections.push(
      '- `text-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)'
    );
    sections.push('');
    sections.push('**Paint properties (icon):**');
    sections.push('- `icon-color` - Tint color for SDF icons');
    sections.push('- `icon-halo-color` - Color of icon halo for SDF icons');
    sections.push('- `icon-halo-width` - Width of icon halo (default: `0`)');
    sections.push('- `icon-halo-blur` - Blur of icon halo (default: `0`)');
    sections.push('- `icon-opacity` - Opacity of the icon, 0-1 (default: `1`)');
    sections.push(
      '- `icon-translate` - Icon translation [x, y] in pixels (default: `[0, 0]`)'
    );
    sections.push(
      '- `icon-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)'
    );
    sections.push('');

    sections.push('### circle');
    sections.push(
      'Used for: Point features (can be used with POI or custom point data)'
    );
    sections.push('');
    sections.push('**Paint properties:**');
    sections.push(
      '- `circle-color` - The color of the circle (default: `#000000`)'
    );
    sections.push('- `circle-radius` - Circle radius in pixels (default: `5`)');
    sections.push(
      '- `circle-opacity` - Opacity of the circle, 0-1 (default: `1`)'
    );
    sections.push('- `circle-blur` - Amount to blur the circle (default: `0`)');
    sections.push('- `circle-stroke-color` - Color of the circle stroke');
    sections.push(
      '- `circle-stroke-width` - Width of the circle stroke (default: `0`)'
    );
    sections.push(
      '- `circle-stroke-opacity` - Opacity of the circle stroke, 0-1 (default: `1`)'
    );
    sections.push(
      '- `circle-translate` - Circle translation [x, y] in pixels (default: `[0, 0]`)'
    );
    sections.push(
      '- `circle-translate-anchor` - Reference for translate: `map` or `viewport` (default: `map`)'
    );
    sections.push(
      '- `circle-pitch-scale` - Circle scaling: `map` or `viewport` (default: `map`)'
    );
    sections.push(
      '- `circle-pitch-alignment` - Circle alignment: `map` or `viewport` (default: `viewport`)'
    );
    sections.push('');
    sections.push('**Layout properties:**');
    sections.push('- `circle-sort-key` - Sort key for circle ordering');
    sections.push('');

    sections.push('### fill-extrusion');
    sections.push(
      'Used for: 3D buildings (building layer with height/min_height attributes)'
    );
    sections.push('');
    sections.push('**Paint properties:**');
    sections.push(
      '- `fill-extrusion-color` - Base color of the extrusion (default: `#000000`)'
    );
    sections.push(
      '- `fill-extrusion-height` - Height in meters, e.g., `["get", "height"]` (default: `0`)'
    );
    sections.push(
      '- `fill-extrusion-base` - Base height in meters, e.g., `["get", "min_height"]` (default: `0`)'
    );
    sections.push(
      '- `fill-extrusion-opacity` - Opacity of the extrusion, 0-1 (default: `1`)'
    );
    sections.push(
      '- `fill-extrusion-pattern` - Name of image in sprite for pattern'
    );
    sections.push(
      '- `fill-extrusion-translate` - Geometry translation [x, y] in pixels (default: `[0, 0]`)'
    );
    sections.push(
      '- `fill-extrusion-translate-anchor` - Reference: `map` or `viewport` (default: `map`)'
    );
    sections.push(
      '- `fill-extrusion-vertical-gradient` - Use vertical gradient (default: `true`)'
    );
    sections.push('');
    sections.push('**No layout properties for fill-extrusion layers**');
    sections.push('');

    sections.push('## Common Patterns');
    sections.push('');
    sections.push('### Filtering Examples');
    sections.push('');
    sections.push('**Parks only (not cemeteries or golf courses):**');
    sections.push('```json');
    sections.push('{');
    sections.push('  "layer_type": "landuse",');
    sections.push('  "filter_properties": { "class": "park" }');
    sections.push('}');
    sections.push('```');
    sections.push('');
    sections.push('**Major roads:**');
    sections.push('```json');
    sections.push('{');
    sections.push('  "layer_type": "road",');
    sections.push(
      '  "filter_properties": { "class": ["motorway", "trunk", "primary"] }'
    );
    sections.push('}');
    sections.push('```');
    sections.push('');
    sections.push('**Country boundaries:**');
    sections.push('```json');
    sections.push('{');
    sections.push('  "layer_type": "admin",');
    sections.push(
      '  "filter_properties": { "admin_level": 0, "maritime": "false" }'
    );
    sections.push('}');
    sections.push('```');
    sections.push('');
    sections.push('**3D Buildings:**');
    sections.push('```json');
    sections.push('{');
    sections.push('  "layer_type": "building",');
    sections.push('  "filter_properties": { "extrude": "true" }');
    sections.push('}');
    sections.push('```');
    sections.push('');

    // Available fields reference
    sections.push('## Available Filter Fields');
    sections.push('');
    sections.push(
      'For detailed field values in each source layer, use the style_builder_tool.'
    );
    sections.push(
      'The tool will provide specific guidance when a layer is not recognized.'
    );
    sections.push('');
    sections.push('### Key Fields by Layer:');
    sections.push('');
    sections.push('**landuse:** class, type');
    sections.push('**road:** class, type, structure, toll, oneway');
    sections.push('**admin:** admin_level, disputed, maritime');
    sections.push('**building:** type, height, min_height, extrude');
    sections.push('**water:** (no filter fields - all water features)');
    sections.push('**waterway:** class, type');
    sections.push('**place_label:** class, type, capital');
    sections.push('**poi_label:** maki, class, filterrank');
    sections.push('**transit_stop_label:** mode, stop_type, network');
    sections.push('');

    sections.push('## Working with Styles');
    sections.push('');
    sections.push('### Using style_builder_tool');
    sections.push('');
    sections.push(
      'The style_builder_tool is the primary way to create Mapbox styles. It:'
    );
    sections.push(
      '- Automatically determines the correct geometry type for each source layer'
    );
    sections.push(
      '- Applies appropriate paint properties based on the action (color, highlight, hide, show)'
    );
    sections.push('- Generates proper filters from filter_properties');
    sections.push(
      '- Provides helpful suggestions when layers are not recognized'
    );
    sections.push('');
    sections.push('### Example Usage');
    sections.push('');
    sections.push('```');
    sections.push('style_builder_tool({');
    sections.push('  style_name: "Custom Style",');
    sections.push('  base_style: "standard",');
    sections.push('  layers: [');
    sections.push('    {');
    sections.push('      layer_type: "water",');
    sections.push('      action: "color",');
    sections.push('      color: "#0099ff"');
    sections.push('    },');
    sections.push('    {');
    sections.push('      layer_type: "landuse",');
    sections.push('      filter_properties: { class: "park" },');
    sections.push('      action: "color",');
    sections.push('      color: "#00ff00"');
    sections.push('    },');
    sections.push('    {');
    sections.push('      layer_type: "road",');
    sections.push('      filter_properties: { class: ["motorway", "trunk"] },');
    sections.push('      action: "highlight"');
    sections.push('    }');
    sections.push('  ]');
    sections.push('})');
    sections.push('```');

    return sections.join('\n');
  }
}
