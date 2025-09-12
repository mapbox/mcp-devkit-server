import { BaseTool } from '../BaseTool.js';
import {
  StyleBuilderToolSchema,
  type StyleBuilderToolInput
} from './StyleBuilderTool.schema.js';
import { MAPBOX_STYLE_LAYERS } from '../../constants/mapboxStyleLayers.js';
import { STREETS_V8_FIELDS } from '../../constants/mapboxStreetsV8Fields.js';
import type { MapboxStyle, Layer, Filter } from '../../types/mapbox-style.js';

export class StyleBuilderTool extends BaseTool<typeof StyleBuilderToolSchema> {
  name = 'style_builder_tool';
  description = `Build custom Mapbox styles with precise control over layers and visual properties, including zoom-based and data-driven expressions.

HOW TO CREATE A STYLE:
1. First, consult resource://mapbox-style-layers to see all available layer types
2. Use this tool to generate a style configuration
3. Apply the style using create_style_tool or update_style_tool

AVAILABLE LAYER TYPES:
• water, waterway - Oceans, lakes, rivers
• landuse, parks - Land areas like parks, hospitals, schools
• buildings, building_3d - Building footprints and 3D extrusions
• roads (motorways, primary_roads, secondary_roads, streets, paths, railways)
• country_boundaries, state_boundaries - Administrative borders
• place_labels, road_labels, poi_labels - Text labels
• landcover - Natural features like forests, grass
• airports - Airport features
• transit - Bus stops, subway entrances, rail stations (filter by maki: bus, entrance, rail-metro)

ACTIONS YOU CAN APPLY:
• color - Set the layer's color
• highlight - Make layer prominent with color/width
• hide - Remove layer from view
• show - Display layer with default styling

EXPRESSION FEATURES:
• Zoom-based styling - "Make roads wider at higher zoom levels"
• Data-driven styling - "Color roads based on their class"
• Property-based filters - "Show only international airports"
• Interpolated values - "Fade buildings in between zoom 14 and 16"

ADVANCED FILTERING:
• "Show only motorways and trunk roads"
• "Display only bridges, not tunnels"
• "Show only paved roads"
• "Display only disputed boundaries"
• "Show only major rail lines, not service rails"
• "Filter POIs by maki icon type (restaurants, hospitals, etc.)"
• "Show only bus stops (transit layer with maki: bus)"
• "Display subway entrances (transit with maki: entrance)"

COMPREHENSIVE EXAMPLES:
• "Show only motorways that are bridges"
• "Display major rails but exclude tunnels"
• "Color roads: motorways red, primary orange, secondary yellow"
• "Show only toll roads that are paved"
• "Display only civil airports, not military"
• "Show country boundaries excluding maritime ones"
• "Color bus stops red and subway entrances blue (transit with different maki values)"

For detailed layer properties and filters, check resource://mapbox-style-layers

TRANSIT FILTERING EXAMPLE:
To show only bus stops: use layer_type: 'transit' with filter_properties: { maki: 'bus' }
To show multiple transit types: filter_properties: { maki: ['bus', 'entrance', 'rail-metro'] }`;

  constructor() {
    super({ inputSchema: StyleBuilderToolSchema });
  }

  protected async execute(input: StyleBuilderToolInput) {
    try {
      const style = this.buildStyle(input);

      return {
        content: [
          {
            type: 'text' as const,
            text: `**Style Built Successfully**

**Name:** ${input.style_name}
**Base:** ${input.base_style}
**Layers Configured:** ${input.layers.length}

${this.generateSummary(input)}

**Generated Style JSON:**
\`\`\`json
${JSON.stringify(style, null, 2)}
\`\`\`

**Next Steps:**
• Use \`create_style_tool\` with this JSON to create the style in your Mapbox account
• Use \`update_style_tool\` to apply these layers to an existing style
• Use \`preview_style_tool\` to see how this style looks`
          }
        ],
        isError: false
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `**Error building style:** ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }

  private buildStyle(input: StyleBuilderToolInput): MapboxStyle {
    const layers: Layer[] = [];

    // Add background layer
    const bgColor =
      input.global_settings?.background_color ||
      (input.global_settings?.mode === 'dark' ? '#1a1a1a' : '#f8f4f0');

    layers.push({
      id: 'background',
      type: 'background',
      paint: {
        'background-color': bgColor
      }
    });

    // Build each configured layer
    for (const config of input.layers) {
      if (config.action === 'hide') continue;

      const layerDef = MAPBOX_STYLE_LAYERS[config.layer_type];
      if (!layerDef) {
        console.warn(`Unknown layer type: ${config.layer_type}`);
        continue;
      }

      const layer = this.createLayer(layerDef, config, input.global_settings);
      if (layer) {
        layers.push(layer);
      }
    }

    // Add default essential layers if not specified
    const configuredTypes = new Set(input.layers.map((l) => l.layer_type));
    const essentialLayers = ['water'];

    for (const layerType of essentialLayers) {
      if (!configuredTypes.has(layerType)) {
        const layerDef = MAPBOX_STYLE_LAYERS[layerType];
        if (layerDef) {
          const layer = this.createLayer(
            layerDef,
            {
              layer_type: layerType,
              action: 'show'
            },
            input.global_settings
          );
          if (layer) {
            layers.push(layer);
          }
        }
      }
    }

    return {
      version: 8,
      name: input.style_name,
      sources: {
        composite: {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2'
        }
      },
      sprite: 'mapbox://sprites/mapbox/streets-v12',
      glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
      layers
    };
  }

  private createLayer(
    layerDef: (typeof MAPBOX_STYLE_LAYERS)[keyof typeof MAPBOX_STYLE_LAYERS],
    config: StyleBuilderToolInput['layers'][0],
    globalSettings?: StyleBuilderToolInput['global_settings']
  ): Layer | null {
    const layer: Layer = {
      id: `${layerDef.id}-custom`,
      type: layerDef.type as Layer['type']
    };

    // Add source configuration
    if (layerDef.sourceLayer) {
      layer.source = 'composite';
      layer['source-layer'] = layerDef.sourceLayer;
    }

    // Generate comprehensive filter
    const filter = this.generateComprehensiveFilter(config, layerDef);
    if (filter) {
      layer.filter = filter;
    }

    // Build paint properties
    const paint: Record<string, unknown> = {};

    // Apply color based on action
    if (
      (config.action === 'color' || config.action === 'highlight') &&
      config.color
    ) {
      const colorProp = this.getColorProperty(layerDef.type);
      if (colorProp) {
        paint[colorProp] = this.generateExpression(
          config.color,
          config,
          'color'
        );
      }
    }

    // Apply opacity if specified
    if (config.opacity !== undefined) {
      const opacityProp = this.getOpacityProperty(layerDef.type);
      if (opacityProp) {
        paint[opacityProp] = this.generateExpression(
          config.opacity,
          config,
          'opacity'
        );
      }
    }

    // Apply width for line layers
    if (config.width !== undefined && layerDef.type === 'line') {
      paint['line-width'] = this.generateExpression(
        config.width,
        config,
        'width'
      );
    }

    // For highlight action, make it prominent
    if (config.action === 'highlight') {
      if (!config.color) {
        const colorProp = this.getColorProperty(layerDef.type);
        if (colorProp) {
          paint[colorProp] = this.generateExpression(
            '#ff0000',
            config,
            'color'
          );
        }
      }
      if (!config.width && layerDef.type === 'line') {
        paint['line-width'] = this.generateExpression(3, config, 'width');
      }
      if (config.opacity === undefined) {
        const opacityProp = this.getOpacityProperty(layerDef.type);
        if (opacityProp) {
          paint[opacityProp] = this.generateExpression(1, config, 'opacity');
        }
      }
    }

    // Apply defaults from layer definition
    for (const prop of layerDef.paintProperties) {
      if (!(prop.property in paint)) {
        // Use a reasonable default
        if (prop.property.includes('color') && !prop.example) {
          paint[prop.property] = '#808080'; // Default gray
        } else if (prop.example !== undefined) {
          paint[prop.property] = prop.example;
        }
      }
    }

    // Adjust for dark mode
    if (globalSettings?.mode === 'dark') {
      if (layer.type === 'symbol') {
        paint['text-color'] = paint['text-color'] || '#ffffff';
        paint['text-halo-color'] = '#000000';
      }
    }

    if (Object.keys(paint).length > 0) {
      layer.paint = paint;
    }

    // Add layout properties if needed
    if (layerDef.layoutProperties && layerDef.layoutProperties.length > 0) {
      const layout: Record<string, unknown> = {};
      for (const prop of layerDef.layoutProperties) {
        if (prop.example !== undefined) {
          layout[prop.property] = prop.example;
        }
      }
      if (Object.keys(layout).length > 0) {
        layer.layout = layout;
      }
    }

    return layer;
  }

  private parseFilterString(filterStr: string): unknown | null {
    // Parse filter strings like "class: park, cemetery" or "admin_level: 0, maritime: false"
    const filters: unknown[] = [];

    // Split by comma if there are multiple conditions
    const conditions = filterStr.split(',').map((s) => s.trim());

    for (const condition of conditions) {
      if (condition.includes(':')) {
        const [property, values] = condition.split(':').map((s) => s.trim());
        const valueList = values.split('|').map((v) => {
          const trimmed = v.trim();
          // Handle boolean strings
          if (trimmed === 'true') return true;
          if (trimmed === 'false') return false;
          // Try to parse as number
          const num = Number(trimmed);
          return isNaN(num) ? trimmed : num;
        });

        if (valueList.length === 1) {
          filters.push(['==', ['get', property], valueList[0]]);
        } else {
          filters.push(['match', ['get', property], valueList, true, false]);
        }
      }
    }

    if (filters.length === 0) return null;
    if (filters.length === 1) return filters[0];
    return ['all', ...filters];
  }

  private getColorProperty(layerType: string): string | null {
    const colorProps: Record<string, string> = {
      fill: 'fill-color',
      line: 'line-color',
      symbol: 'text-color',
      circle: 'circle-color',
      background: 'background-color',
      'fill-extrusion': 'fill-extrusion-color'
    };

    return colorProps[layerType] || null;
  }

  private getOpacityProperty(layerType: string): string | null {
    const opacityProps: Record<string, string> = {
      fill: 'fill-opacity',
      line: 'line-opacity',
      symbol: 'text-opacity',
      circle: 'circle-opacity',
      background: 'background-opacity',
      'fill-extrusion': 'fill-extrusion-opacity'
    };

    return opacityProps[layerType] || null;
  }

  private generateSummary(input: StyleBuilderToolInput): string {
    const parts: string[] = ['**Layer Configurations:**'];

    for (const config of input.layers) {
      const layerDef = MAPBOX_STYLE_LAYERS[config.layer_type];
      const description = layerDef?.description || config.layer_type;

      switch (config.action) {
        case 'color':
          parts.push(`• ${description}: Set to ${config.color}`);
          break;
        case 'highlight':
          parts.push(
            `• ${description}: Highlighted${config.color ? ` in ${config.color}` : ''}`
          );
          break;
        case 'hide':
          parts.push(`• ${description}: Hidden`);
          break;
        case 'show':
          parts.push(`• ${description}: Shown`);
          break;
      }
    }

    if (input.global_settings?.mode) {
      parts.push(`\n**Mode:** ${input.global_settings.mode}`);
    }

    return parts.join('\n');
  }

  private generateExpression(
    value: string | number,
    config: StyleBuilderToolInput['layers'][0],
    propertyType: 'color' | 'opacity' | 'width'
  ): unknown {
    // If custom expression is provided, use it
    if (config.expression) {
      return config.expression;
    }

    // Generate property-based styling (data-driven)
    if (config.property_based && config.property_values) {
      const entries = Object.entries(config.property_values);
      const expression: unknown[] = ['match', ['get', config.property_based]];

      for (const [propValue, styleValue] of entries) {
        expression.push(propValue);
        expression.push(styleValue);
      }

      // Add default value
      expression.push(value);
      return expression;
    }

    // Generate zoom-based interpolation
    if (config.zoom_based) {
      const minZoom = config.min_zoom ?? 10;
      const maxZoom = config.max_zoom ?? 18;

      if (propertyType === 'width') {
        // For width, interpolate from smaller to larger
        const minWidth = typeof value === 'number' ? value * 0.5 : 1;
        const maxWidth = typeof value === 'number' ? value * 2 : 6;

        return [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          minZoom,
          minWidth,
          maxZoom,
          maxWidth
        ];
      } else if (propertyType === 'opacity') {
        // For opacity, can fade in/out with zoom
        const minOpacity =
          typeof value === 'number' ? Math.max(0, value - 0.3) : 0.3;
        const maxOpacity = typeof value === 'number' ? value : 1;

        return [
          'interpolate',
          ['linear'],
          ['zoom'],
          minZoom,
          minOpacity,
          maxZoom,
          maxOpacity
        ];
      } else if (propertyType === 'color') {
        // For color, use step function for discrete changes
        const midZoom = (minZoom + maxZoom) / 2;
        return [
          'step',
          ['zoom'],
          value, // Default color
          midZoom,
          value // Could be enhanced to transition between colors
        ];
      }
    }

    // Return static value if no expression needed
    return value;
  }

  private generateDataDrivenExpression(
    property: string,
    valueMap: Record<string, unknown>,
    defaultValue: unknown
  ): unknown {
    const expression: unknown[] = ['match', ['get', property]];

    for (const [key, value] of Object.entries(valueMap)) {
      expression.push(key);
      expression.push(value);
    }

    expression.push(defaultValue);
    return expression;
  }

  private generateZoomInterpolation(
    minZoom: number,
    maxZoom: number,
    minValue: number,
    maxValue: number,
    interpolationType: 'linear' | 'exponential' = 'linear'
  ): unknown {
    const interpolation =
      interpolationType === 'exponential' ? ['exponential', 1.5] : ['linear'];

    return [
      'interpolate',
      interpolation,
      ['zoom'],
      minZoom,
      minValue,
      maxZoom,
      maxValue
    ];
  }

  private buildAdvancedFilter(
    sourceLayer: string,
    filterConfig: Record<
      string,
      string | number | boolean | (string | number | boolean)[]
    >
  ): Filter | null {
    const filters: unknown[] = [];

    // Get field definitions for this source layer
    const layerFields =
      STREETS_V8_FIELDS[sourceLayer as keyof typeof STREETS_V8_FIELDS];
    if (!layerFields) return null;

    // Build filter expressions for each property
    for (const [property, value] of Object.entries(filterConfig)) {
      if (value === undefined || value === null) continue;

      const fieldDef = layerFields[property as keyof typeof layerFields];
      if (!fieldDef) continue;

      // Handle array of values (multiple selections)
      if (Array.isArray(value)) {
        if (value.length === 1) {
          filters.push(['==', ['get', property], value[0]]);
        } else if (value.length > 1) {
          filters.push(['match', ['get', property], value, true, false]);
        }
      }
      // Handle single value
      else {
        filters.push(['==', ['get', property], value]);
      }
    }

    if (filters.length === 0) return null;
    if (filters.length === 1) return filters[0] as Filter;
    return ['all', ...filters] as Filter;
  }

  private generateComprehensiveFilter(
    config: StyleBuilderToolInput['layers'][0],
    layerDef: (typeof MAPBOX_STYLE_LAYERS)[keyof typeof MAPBOX_STYLE_LAYERS]
  ): Filter | null {
    // If custom filter is provided, use it
    if (config.filter) {
      return config.filter as Filter;
    }

    // If filter_properties is provided, build from that
    if (config.filter_properties && layerDef.sourceLayer) {
      return this.buildAdvancedFilter(
        layerDef.sourceLayer,
        config.filter_properties
      );
    }

    // Otherwise, use common filters from layer definition
    if (layerDef.commonFilters && layerDef.commonFilters.length > 0) {
      const filterStr = layerDef.commonFilters.join(', ');
      return this.parseFilterString(filterStr) as Filter;
    }

    return null;
  }
}
