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
    .describe('Custom Mapbox expression for advanced styling')
});

export const StyleBuilderToolSchema = z.object({
  style_name: z.string().default('Custom Style').describe('Name for the style'),

  base_style: z
    .enum(['streets', 'light', 'dark', 'satellite', 'outdoors', 'blank'])
    .default('streets')
    .describe('Base style template to start from'),

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
    .describe('Global style settings')
});

export type StyleBuilderToolInput = z.infer<typeof StyleBuilderToolSchema>;
