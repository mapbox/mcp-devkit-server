import { z } from 'zod';

const LayerConfigSchema = z.object({
  layer_type: z
    .string()
    .describe(
      'Layer type from the resource (e.g., "water", "railways", "parks")'
    ),
  action: z
    .enum(['show', 'hide', 'color', 'highlight'])
    .describe('What to do with this layer'),
  color: z
    .string()
    .optional()
    .describe('Color value if action is "color" or "highlight"'),
  opacity: z.number().min(0).max(1).optional().describe('Opacity value'),
  width: z.number().optional().describe('Width for line layers'),
  filter: z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.unknown()),
      z.record(z.unknown())
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
      z.record(z.unknown())
    ])
    .optional()
    .describe('Custom Mapbox expression for advanced styling'),

  // Slot for Standard styles
  slot: z
    .enum(['bottom', 'middle', 'top'])
    .optional()
    .describe(
      'Layer slot for Mapbox Standard styles. Controls layer stacking order. ' +
        'Bottom: below most map features, Middle: between base and labels, Top: above all base map features (default)'
    )
});

export const StyleBuilderToolSchema = z.object({
  style_name: z.string().default('Custom Style').describe('Name for the style'),

  base_style: z
    .enum([
      'standard',
      'streets',
      'light',
      'dark',
      'satellite',
      'outdoors',
      'blank'
    ])
    .default('standard')
    .describe(
      'Base style template. ALWAYS defaults to "standard" for new styles. ' +
        'Use "standard" for all new styles unless explicitly requested otherwise. ' +
        'Classic styles (streets/light/dark) should only be used when working with existing Classic styles or upon explicit request.'
    ),

  layers: z
    .array(LayerConfigSchema)
    .describe('Layer configurations based on the mapbox-style-layers resource'),

  global_settings: z
    .object({
      background_color: z.string().optional().describe('Background/land color'),
      label_color: z.string().optional().describe('Default label color'),
      mode: z.enum(['light', 'dark']).optional().describe('Light or dark mode')
    })
    .optional()
    .describe('Global style settings'),

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
