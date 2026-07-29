// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

const LayerConfigSchema = z.object({
  layer_type: z
    .string()
    .describe(
      'Streets v8 feature to style, e.g. "water", "road", "landuse". With source_id set this ' +
        'is only a human-readable name for your own layer.'
    ),

  source_id: z
    .string()
    .optional()
    .describe(
      'Key of a custom_sources entry, to style YOUR OWN data instead of a Streets v8 feature. ' +
        'render_type is required when set, and the layer gets overlay placement.'
    ),

  source_layer: z
    .string()
    .optional()
    .describe(
      'Layer name inside a custom vector tileset. Required for custom_sources type "vector".'
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
      'How to render the layer. "auto" picks from geometry. Use "line" for outlines and borders ' +
        'even on polygons (e.g. building outlines), "fill-extrusion" for 3D, "circle" for dots, ' +
        '"symbol" for labels, "heatmap" for density. Required when source_id is set.'
    ),

  action: z
    .enum(['show', 'hide', 'color', 'highlight'])
    .describe(
      'What to do with this layer. "hide" on Standard sets the matching standard_config toggle, ' +
        'since the basemap feature belongs to the import; water, landuse and roads have no toggle ' +
        'and are rejected. On Classic, and for a layer of your own, "hide" omits the layer.'
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
      'Where the layer sits in the Standard stack. Set it on every custom layer: omitting it is ' +
        'not a default, the layer draws above every basemap layer including street labels. ' +
        'bottom = below roads (choropleths, rasters); middle = above roads, behind labels and 3D ' +
        '(most overlays, routes, geofences); top = above POI labels (markers, selections). ' +
        'Standard only — rejected on a Classic base, where you order the layers array instead.'
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
      'ALWAYS "standard" unless a Classic style is explicitly asked for. A Classic base is not ' +
        'an import and does not reproduce the named style — only the layers you list get drawn. ' +
        'The name sets light vs dark ("dark-v11", "navigation-night-v1" and the satellite bases ' +
        'are dark) and whether mapbox.satellite imagery sits underneath.'
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
      'Your own GeoJSON or tilesets, keyed by an id a layer references via source_id — zones, ' +
        'routes, store locations, choropleth values. "composite" (and "satellite" on a satellite ' +
        "base) are the basemap's own ids and are rejected."
    ),

  global_settings: z
    .object({
      background_color: z
        .string()
        .optional()
        .describe(
          'Background/land color. Classic only — on Standard use standard_config.colorLand.'
        ),
      label_color: z
        .string()
        .optional()
        .describe(
          'Default text-color for symbol layers, beaten by a per-layer color. Classic only.'
        ),
      mode: z
        .enum(['light', 'dark'])
        .optional()
        .describe(
          'Light or dark mode. Classic only: it recolors only the layers this tool emits, so it ' +
            'cannot darken a Standard basemap — use standard_config.lightPreset "night" there. ' +
            'Defaults to what the Classic base_style names, so set it only to override that.'
        )
    })
    .optional()
    .describe(
      'Appearance for Classic styles, overriding what base_style implies. Rejected on Standard.'
    ),

  standard_config: z
    .object({
      // Boolean configuration properties
      showPedestrianRoads: z
        .boolean()
        .optional()
        .describe('Show/hide pedestrian roads and paths'),
      showPlaceLabels: z
        .boolean()
        .optional()
        .describe('Show/hide place label layers'),
      showPointOfInterestLabels: z
        .boolean()
        .optional()
        .describe('Show/hide POI icons and text'),
      showRoadLabels: z
        .boolean()
        .optional()
        .describe('Show/hide road labels and shields'),
      showTransitLabels: z
        .boolean()
        .optional()
        .describe('Show/hide transit icons and text'),
      show3dObjects: z
        .boolean()
        .optional()
        .describe(
          'Show/hide ALL 3D objects — buildings, trees, landmarks, facades. For buildings ' +
            'alone use show3dBuildings.'
        ),
      show3dBuildings: z
        .boolean()
        .optional()
        .describe(
          'Show/hide 3D buildings, leaving trees and landmarks in place. What action:"hide" ' +
            'on a "building" layer sets.'
        ),
      show3dTrees: z.boolean().optional().describe('Show/hide 3D trees only'),
      show3dLandmarks: z
        .boolean()
        .optional()
        .describe('Show/hide 3D landmarks only'),
      show3dFacades: z
        .boolean()
        .optional()
        .describe('Show/hide 3D facade detail, leaving building volumes'),
      showLandmarkIcons: z
        .boolean()
        .optional()
        .describe('Show/hide landmark icons'),
      showLandmarkIconLabels: z
        .boolean()
        .optional()
        .describe('Show/hide landmark icon labels'),
      showAdminBoundaries: z
        .boolean()
        .optional()
        .describe('Show/hide administrative boundaries'),
      showIndoor: z
        .boolean()
        .optional()
        .describe('Show/hide indoor maps (venue floorplans)'),
      showIndoorLabels: z
        .boolean()
        .optional()
        .describe('Show/hide indoor map labels'),
      showRoadsAndTransit: z
        .boolean()
        .optional()
        .describe(
          'Standard Satellite only, so REJECTED here — listed so passing it is an error rather ' +
            'than a silently dropped key. The road network cannot be toggled off on Standard.'
        ),

      // String configuration properties
      theme: z
        .enum(['default', 'faded', 'monochrome', 'custom'])
        .optional()
        .describe('Basemap theme'),
      'theme-data': z
        .string()
        .optional()
        .describe('Custom theme via Base64 LUT image'),
      lightPreset: z
        .enum(['dusk', 'dawn', 'day', 'night'])
        .optional()
        .describe('Time-of-day lighting. "night" is how you do dark mode'),
      font: z.string().optional().describe('Basemap font family'),
      colorModePointOfInterestLabels: z
        .string()
        .optional()
        .describe('POI label color mode'),
      backgroundPointOfInterestLabels: z
        .string()
        .optional()
        .describe('POI label background style'),

      // Numeric configuration properties
      densityPointOfInterestLabels: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('POI label density (1-5, default 3)'),
      fuelingStationModePointOfInterestLabels: z
        .string()
        .optional()
        .describe('Fueling-station POI label display mode'),

      // Color override properties
      colorPlaceLabels: z
        .string()
        .optional()
        .describe('Color for place labels'),
      colorRoadLabels: z.string().optional().describe('Color for road labels'),
      colorLand: z
        .string()
        .optional()
        .describe(
          'Color for the land surface — the Standard equivalent of a Classic background color'
        ),
      colorGreenspace: z
        .string()
        .optional()
        .describe('Color for greenspace areas'),
      colorBuildings: z.string().optional().describe('Color for buildings'),
      colorCommercial: z
        .string()
        .optional()
        .describe('Color for commercial land-use areas'),
      colorEducation: z
        .string()
        .optional()
        .describe('Color for education land-use areas'),
      colorMedical: z
        .string()
        .optional()
        .describe('Color for medical land-use areas'),
      colorIndustrial: z
        .string()
        .optional()
        .describe('Color for industrial land-use areas'),
      colorWater: z.string().optional().describe('Color for water features'),
      colorAdminBoundaries: z
        .string()
        .optional()
        .describe('Color for administrative boundaries'),
      colorPointOfInterestLabels: z
        .string()
        .optional()
        .describe('Color for POI labels'),
      colorMotorways: z
        .string()
        .optional()
        .describe('Color for motorways/highways'),
      colorTrunks: z.string().optional().describe('Color for trunk roads'),
      colorRoads: z.string().optional().describe('Color for regular roads'),
      colorBuildingHighlight: z
        .string()
        .optional()
        .describe('Color for highlighted buildings'),
      colorBuildingSelect: z
        .string()
        .optional()
        .describe('Color for selected buildings'),
      colorPlaceLabelHighlight: z
        .string()
        .optional()
        .describe('Color for highlighted place labels'),
      colorPlaceLabelSelect: z
        .string()
        .optional()
        .describe('Color for selected place labels'),
      colorIndoorLabelHighlight: z
        .string()
        .optional()
        .describe('Color for highlighted indoor labels'),
      colorIndoorLabelSelect: z
        .string()
        .optional()
        .describe('Color for selected indoor labels')
    })
    .optional()
    .describe(
      'Config for the imported Mapbox Standard basemap. Standard-only: rejected on a Classic ' +
        'base_style, which takes global_settings instead.'
    )
});

export type StyleBuilderToolInput = z.infer<typeof StyleBuilderToolSchema>;
