// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

const LayerConfigSchema = z.object({
  layer_type: z
    .string()
    .describe(
      'Layer type from the resource (e.g., "water", "railways", "parks"). ' +
        'When source_id is set the layer comes from your own data rather than Streets v8, ' +
        'so this is ignored — use it as a human-readable name.'
    ),

  source_id: z
    .string()
    .optional()
    .describe(
      'Key of an entry in custom_sources. Set this to style YOUR OWN data — delivery zones, ' +
        'a route, store locations — instead of a Streets v8 basemap layer. When set, ' +
        'render_type is required (geometry cannot be inferred from a URL), the Streets v8 ' +
        'lookup is skipped, and the layer gets an overlay slot rather than a basemap one.'
    ),

  source_layer: z
    .string()
    .optional()
    .describe(
      'Source layer name within a custom vector tile source. Required for custom_sources ' +
        'entries of type "vector"; ignored for GeoJSON, which has no source layers.'
    ),

  render_type: z
    .enum([
      'fill',
      'line',
      'symbol',
      'circle',
      'fill-extrusion',
      'heatmap',
      'auto'
    ])
    .optional()
    .default('auto')
    .describe(
      'How to render this layer visually. Default "auto" chooses based on geometry type.\n' +
        'Override to achieve specific visual effects:\n' +
        '• "line" - For outlines, borders, strokes (e.g., building outlines, road borders)\n' +
        '• "fill" - For solid filled areas (e.g., solid color buildings, water bodies)\n' +
        '• "fill-extrusion" - For 3D extrusions (e.g., 3D buildings)\n' +
        '• "symbol" - For text labels or icons\n' +
        '• "circle" - For dot visualization (e.g., POI dots, data points)\n' +
        '• "heatmap" - For density maps (points only)\n' +
        'IMPORTANT: Use "line" for outlines even on polygon features like buildings.'
    ),

  action: z
    .enum(['show', 'hide', 'color', 'highlight'])
    .describe(
      'What to do with this layer. "hide" works differently per target: on Classic the layer is ' +
        'simply left out of the stack, while on Standard a basemap feature belongs to the import ' +
        'and keeps drawing, so the tool sets the matching standard_config toggle instead ' +
        '(poi_label, place_label, transit_stop_label, building, admin). Standard exposes no toggle ' +
        'for water, landuse or the road network, so "hide" on those is rejected — use ' +
        'standard_config theme and color* overrides to make them recede. A layer of your own ' +
        '(source_id set) is hidden by omission on either target, since it is yours to leave out ' +
        "rather than the import's to remove."
    ),
  color: z
    .string()
    .optional()
    .describe('Color value if action is "color" or "highlight"'),
  opacity: z.number().min(0).max(1).optional().describe('Opacity value'),
  width: z
    .number()
    .optional()
    .describe('Width for line layers or outline thickness'),
  filter: z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.unknown()),
      z.record(z.string(), z.unknown())
    ])
    .optional()
    .describe('Custom filter expression'),

  // Comprehensive property-based filtering
  filter_properties: z
    .record(
      z.string(),
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.union([z.string(), z.number(), z.boolean()]))
      ])
    )
    .optional()
    .describe(
      'Filter by specific properties. Examples: ' +
        '{ class: "motorway" } for only motorways, ' +
        '{ class: ["motorway", "trunk"] } for multiple road types, ' +
        '{ structure: "bridge" } for only bridges, ' +
        '{ admin_level: 0, disputed: "false" } for undisputed country boundaries'
    ),

  // Expression-based styling
  zoom_based: z.boolean().optional().describe('Make styling zoom-dependent'),
  min_zoom: z
    .number()
    .min(0)
    .max(24)
    .optional()
    .describe('Minimum zoom level for zoom-based styling'),
  max_zoom: z
    .number()
    .min(0)
    .max(24)
    .optional()
    .describe('Maximum zoom level for zoom-based styling'),

  // Data-driven styling
  property_based: z
    .string()
    .optional()
    .describe('Feature property to base styling on (e.g., "class", "type")'),
  property_values: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .optional()
    .describe('Map of property values to styles'),

  // Advanced expressions
  expression: z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.unknown()),
      z.record(z.string(), z.unknown())
    ])
    .optional()
    .describe('Custom Mapbox expression for advanced styling'),

  // Slot for Standard styles
  slot: z
    .enum(['bottom', 'middle', 'top'])
    .optional()
    .describe(
      'Layer slot for Mapbox Standard styles. Set this on every custom layer — omitting it is ' +
        'not "default placement", it means the layer draws above every basemap layer including ' +
        'street labels. Omit it on Standard and the tool infers one and reports its choice. ' +
        'bottom: above land/landuse/water polygons but below roads — choropleths, rasters, terrain. ' +
        'middle: above roads and lines but behind 3D buildings and labels — most data overlays, zone ' +
        'fills, heatmaps, routes, custom POI layers. ' +
        'top: above POI labels but behind place and transit labels — markers, active selections. ' +
        'Standard only: a Classic style is a layer stack you order yourself, so passing slot with a ' +
        'Classic base_style is rejected rather than ignored — order the layers array instead.'
    )
});

export const StyleBuilderToolSchema = z.object({
  style_name: z.string().default('Custom Style').describe('Name for the style'),

  base_style: z
    .enum([
      'standard',
      'streets-v12',
      'light-v11',
      'dark-v11',
      'satellite-v9',
      'satellite-streets-v12',
      'outdoors-v12',
      'navigation-day-v1',
      'navigation-night-v1'
    ])
    .default('standard')
    .describe(
      'Base style template. ALWAYS use "standard" as the default for all new styles. ' +
        'Standard style provides the best performance and modern features. ' +
        'Only use Classic styles (streets/light/dark/satellite/outdoors/navigation) when explicitly requested with "create a classic style" or when working with an existing Classic style. ' +
        'A Classic base is not an import and does not reproduce the named style — this tool ' +
        'authors the layer stack, so only the layers you list get drawn. The base decides light ' +
        'vs dark ("dark-v11", "navigation-night-v1" and the satellite bases are dark) and whether ' +
        'mapbox.satellite imagery sits underneath ("satellite-v9", "satellite-streets-v12"); ' +
        'bases within a group are otherwise equivalent.'
    ),

  layers: z
    .array(LayerConfigSchema)
    .describe('Layer configurations based on the mapbox-style-layers resource'),

  custom_sources: z
    .record(
      z.string(),
      z.union([
        z.object({
          type: z.literal('geojson'),
          data: z
            .union([z.string(), z.record(z.string(), z.any())])
            .describe(
              'GeoJSON URL, or an inline FeatureCollection/Feature object'
            )
        }),
        z.object({
          type: z.literal('vector'),
          url: z
            .string()
            .describe('Tileset URL, e.g. "mapbox://username.tilesetid"')
        })
      ])
    )
    .optional()
    .describe(
      'Your own data sources, keyed by an id a layer then references via source_id. This is how ' +
        'you put your GeoJSON or tilesets on the map — delivery zones, routes, store locations, ' +
        'choropleth values. Layers built from them get an overlay slot, emissive strength to ' +
        'survive the night preset, and line-occlusion-opacity so routes are not hidden by 3D ' +
        'buildings. "composite" is reserved for the basemap source (as is "satellite" on a ' +
        'satellite base) and is rejected, since it would replace the basemap rather than join it.'
    ),

  global_settings: z
    .object({
      background_color: z
        .string()
        .optional()
        .describe(
          'Background/land color. Classic only — Standard supplies its own background through the import, so this is rejected there. Use standard_config color overrides instead.'
        ),
      label_color: z
        .string()
        .optional()
        .describe(
          'Default text-color for symbol layers, overridden by a per-layer color. Classic only — on Standard use the standard_config colorPlaceLabels / colorRoadLabels / colorPointOfInterestLabels overrides.'
        ),
      mode: z
        .enum(['light', 'dark'])
        .optional()
        .describe(
          'Light or dark mode for Classic styles. It only recolors the layers this tool emits, so it cannot darken a Standard basemap — use standard_config.lightPreset "night", which relights the whole scene. Defaults to whichever the Classic base_style names ("dark-v11", "navigation-night-v1" and the satellite bases are dark), so set it only to override that.'
        )
    })
    .optional()
    .describe(
      'Global style settings for Classic styles, overriding what the Classic base_style implies. ' +
        'Rejected on Standard, which takes standard_config instead.'
    ),

  standard_config: z
    .object({
      // Boolean configuration properties
      showPedestrianRoads: z
        .boolean()
        .optional()
        .describe(
          'Show/hide the base pedestrian roads and paths from the Standard style'
        ),
      showPlaceLabels: z
        .boolean()
        .optional()
        .describe(
          'Show/hide the base place label layers from the Standard style'
        ),
      showPointOfInterestLabels: z
        .boolean()
        .optional()
        .describe(
          'Show/hide the base POI icons and text from the Standard style'
        ),
      showRoadLabels: z
        .boolean()
        .optional()
        .describe(
          'Show/hide the base road labels and shields from the Standard style'
        ),
      showTransitLabels: z
        .boolean()
        .optional()
        .describe(
          'Show/hide the base transit icons and text from the Standard style'
        ),
      show3dObjects: z
        .boolean()
        .optional()
        .describe(
          'Show/hide the base 3D objects like buildings and landmarks from the Standard style'
        ),
      showLandmarkIcons: z
        .boolean()
        .optional()
        .describe('Show/hide the base landmark icons from the Standard style'),
      showLandmarkIconLabels: z
        .boolean()
        .optional()
        .describe(
          'Show/hide the base landmark icon labels from the Standard style'
        ),
      showAdminBoundaries: z
        .boolean()
        .optional()
        .describe(
          'Show/hide the base administrative boundaries from the Standard style'
        ),
      showRoadsAndTransit: z
        .boolean()
        .optional()
        .describe(
          'Show/hide the base roads and transit networks from the Standard style (Standard-Satellite)'
        ),

      // String configuration properties
      theme: z
        .enum(['default', 'faded', 'monochrome', 'custom'])
        .optional()
        .describe('Theme for the base Standard style layers'),
      'theme-data': z
        .string()
        .optional()
        .describe('Custom color theme for the base style via Base64 LUT image'),
      lightPreset: z
        .enum(['dusk', 'dawn', 'day', 'night'])
        .optional()
        .describe('Time-of-day lighting for the base Standard style'),
      font: z
        .string()
        .optional()
        .describe('Font family for the base Standard style text'),
      colorModePointOfInterestLabels: z
        .string()
        .optional()
        .describe('Color mode for the base POI labels'),
      backgroundPointOfInterestLabels: z
        .string()
        .optional()
        .describe('Background style for the base POI labels'),

      // Numeric configuration properties
      densityPointOfInterestLabels: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('Density of base POI labels (1-5, default 3)'),

      // Color override properties
      colorPlaceLabels: z
        .string()
        .optional()
        .describe('Override color for the base place labels in Standard style'),
      colorRoadLabels: z
        .string()
        .optional()
        .describe('Override color for the base road labels in Standard style'),
      colorGreenspace: z
        .string()
        .optional()
        .describe(
          'Override color for the base greenspace areas in Standard style'
        ),
      colorWater: z
        .string()
        .optional()
        .describe(
          'Override color for the base water features in Standard style'
        ),
      colorAdminBoundaries: z
        .string()
        .optional()
        .describe(
          'Override color for the base administrative boundaries in Standard style'
        ),
      colorPointOfInterestLabels: z
        .string()
        .optional()
        .describe('Override color for the base POI labels in Standard style'),
      colorMotorways: z
        .string()
        .optional()
        .describe(
          'Override color for the base motorways/highways in Standard style'
        ),
      colorTrunks: z
        .string()
        .optional()
        .describe('Override color for the base trunk roads in Standard style'),
      colorRoads: z
        .string()
        .optional()
        .describe(
          'Override color for the base regular roads in Standard style'
        ),
      colorBuildingHighlight: z
        .string()
        .optional()
        .describe(
          'Override color for the base highlighted buildings in Standard style'
        ),
      colorBuildingSelect: z
        .string()
        .optional()
        .describe(
          'Override color for the base selected buildings in Standard style'
        ),
      colorPlaceLabelHighlight: z
        .string()
        .optional()
        .describe(
          'Override color for the base highlighted place labels in Standard style'
        ),
      colorPlaceLabelSelect: z
        .string()
        .optional()
        .describe(
          'Override color for the base selected place labels in Standard style'
        )
    })
    .optional()
    .describe(
      'Configuration for the base Mapbox Standard style. These properties customize the underlying Standard style features - you can still add your own custom layers on top using the layers parameter. The Standard style provides a rich basemap that you can configure and enhance with additional layers.'
    )
});

export type StyleBuilderToolInput = z.infer<typeof StyleBuilderToolSchema>;
