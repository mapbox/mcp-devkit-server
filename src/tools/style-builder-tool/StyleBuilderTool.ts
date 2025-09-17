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
  description = `Generate Mapbox style JSON for creating new styles or updating existing ones. Supports Mapbox Standard (default), Classic, and Blank base styles with full control over layers, expressions, and visual properties.

USAGE:
1. Use this tool to generate style JSON configuration
2. For NEW styles: Use the generated JSON with create_style_tool
3. For EXISTING styles: Use portions of the JSON with update_style_tool to modify specific layers

BASE STYLES:
• standard (default): Modern Mapbox Standard with imports, requires slot property
• streets/light/dark/satellite/outdoors: Classic styles (deprecated but supported)
• blank: Empty style for full customization

LAYER ORDERING:
• In ALL styles: Later layers in array render on top of earlier layers
• Standard style: 'slot' determines which section, array order matters within each slot
• Classic/Blank: Array order is the only control for layer stacking
Example: [background, water, roads, labels] = labels render on top

MAPBOX STANDARD - SLOT PROPERTY:
When using Standard base style, each layer needs a 'slot' to control stacking:
• bottom: Below most map features (land, water)
• middle: Between base features and labels
• top: Above all base map features (default for visibility)
Within each slot, array order still applies - later layers render on top

RESOURCE GUIDE:
The resource://mapbox-style-layers contains comprehensive documentation including:
• All available layer types with descriptions
• Paint and layout properties for each layer type
• Common filters and expressions
• Example configurations

AVAILABLE LAYER TYPES:
• water, waterway - Oceans, lakes, rivers
• landuse, parks - Land areas like parks, hospitals, schools
• buildings, building_3d - Building footprints and 3D extrusions
• ROAD TYPES (use these specific types for best results):
  - motorways - Highway/freeway roads (class: motorway)
  - primary_roads - Major roads (class: primary, trunk)
  - secondary_roads - Secondary roads (class: secondary)
  - streets - Local streets (class: street, street_limited)
  - paths - Walking/cycling paths (class: path, pedestrian)
  - railways - Rail lines
  - roads - Generic/all roads (avoid using - use specific types above instead)
• country_boundaries, state_boundaries - Administrative borders
• place_labels, road_labels, poi_labels - Text labels
• landcover - Natural features like forests, grass
• airports - Airport features
• transit - Bus stops, subway entrances, rail stations (filter by maki: bus, entrance, rail-metro)

IMPORTANT FOR ROADS:
• Always use specific road layer types (motorways, primary_roads, etc.) instead of generic 'roads'
• Each road type automatically includes proper filters and zoom-based width interpolation
• Don't specify fixed widths - the tool automatically applies appropriate zoom-based scaling

ACTIONS YOU CAN APPLY:
• color - Set the layer's color (roads will use smart defaults if not specified)
• highlight - Make layer prominent with enhanced color/width
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
    const isUsingStandard = input.base_style === 'standard';

    // Only add background layer for non-Standard styles
    // Standard style provides its own background through imports
    if (!isUsingStandard) {
      const bgColor =
        input.global_settings?.background_color ||
        (input.global_settings?.mode === 'dark' ? '#1a1a1a' : '#f8f4f0');

      const backgroundLayer: Layer = {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': bgColor
        }
      };

      layers.push(backgroundLayer);
    }

    // Build each configured layer
    for (const config of input.layers) {
      if (config.action === 'hide') continue;

      const layerDef = MAPBOX_STYLE_LAYERS[config.layer_type];
      if (!layerDef) {
        console.warn(`Unknown layer type: ${config.layer_type}`);
        continue;
      }

      const layer = this.createLayer(
        layerDef,
        config,
        input.global_settings,
        isUsingStandard
      );
      if (layer) {
        layers.push(layer);
      }
    }

    // Note: We no longer automatically add layers that weren't explicitly requested
    // The user should specify all desired layers in the input

    // Create the base style object with minimal properties
    // Additional properties will be added based on base style type
    const style: MapboxStyle = {
      version: 8,
      name: input.style_name
    } as MapboxStyle;

    // Determine which base style to use
    const isClassicStyle = [
      'streets',
      'light',
      'dark',
      'satellite',
      'outdoors'
    ].includes(input.base_style);

    // For standard style, use imports to inherit from Mapbox Standard
    if (input.base_style === 'standard') {
      // Follow the exact order from the working Mapbox Studio example
      style.metadata = {
        'mapbox:autocomposite': true,
        'mapbox:uiParadigm': 'imports',
        'mapbox:sdk-support': {
          js: '3.14.0',
          android: '11.14.0',
          ios: '11.14.0'
        },
        'mapbox:groups': {}
      };
      style.center = [0, 0];
      style.zoom = 2;
      style.imports = [
        {
          id: 'basemap',
          url: 'mapbox://styles/mapbox/standard'
        }
      ];
      style.sources = {
        composite: {
          url: 'mapbox://mapbox.mapbox-streets-v8',
          type: 'vector'
        }
      };
      style.sprite = 'mapbox://sprites/mapbox/streets-v12';
      style.glyphs = 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf';
      style.projection = { name: 'globe' };
      style.layers = layers;

      // Explicitly set terrain to null for API compatibility
      // @ts-expect-error - The API expects null but TypeScript type doesn't allow it
      style.terrain = null;
    } else if (isClassicStyle) {
      // For classic styles (being deprecated), use traditional sources
      style.center = [0, 0];
      style.zoom = 2;
      style.sources = {
        composite: {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2'
        }
      };
      style.sprite = 'mapbox://sprites/mapbox/streets-v12';
      style.glyphs = 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf';
      style.layers = layers;
    } else if (input.base_style === 'blank') {
      // Blank style - no imports, just basic sources
      style.center = [0, 0];
      style.zoom = 2;
      style.sources = {
        composite: {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2'
        }
      };
      style.sprite = 'mapbox://sprites/mapbox/streets-v12';
      style.glyphs = 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf';
      style.layers = layers;
    }

    return style;
  }

  private createLayer(
    layerDef: (typeof MAPBOX_STYLE_LAYERS)[keyof typeof MAPBOX_STYLE_LAYERS],
    config: StyleBuilderToolInput['layers'][0],
    globalSettings?: StyleBuilderToolInput['global_settings'],
    isUsingStandard?: boolean
  ): Layer | null {
    const layer: Layer = {
      id: `${layerDef.id}-custom`,
      type: layerDef.type as Layer['type']
    };

    // Add slot for Standard style
    if (isUsingStandard) {
      // Use custom slot if provided, otherwise default to 'top' for visibility
      layer.slot = config.slot || 'top';
    }

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

    // Use the user-provided color if available, otherwise use defaults
    let effectiveColor = config.color;

    // Ensure hex colors have # prefix
    if (
      effectiveColor &&
      !effectiveColor.startsWith('#') &&
      !effectiveColor.startsWith('rgb') &&
      !effectiveColor.startsWith('hsl')
    ) {
      effectiveColor = '#' + effectiveColor;
    }

    // Only provide a default color if none was specified
    if (
      !effectiveColor &&
      (config.action === 'color' || config.action === 'highlight')
    ) {
      effectiveColor = this.getHarmoniousColor(
        config.layer_type,
        config.action
      );
    }

    // Apply color based on action
    if (
      (config.action === 'color' || config.action === 'highlight') &&
      effectiveColor
    ) {
      const colorProp = this.getColorProperty(layerDef.type);
      if (colorProp) {
        paint[colorProp] = this.generateExpression(
          effectiveColor,
          config,
          'color'
        );
      }
    }

    // Apply opacity - use specified value or smart defaults
    const opacityProp = this.getOpacityProperty(layerDef.type);
    if (opacityProp) {
      // For Standard style overlays, use higher opacity by default
      // This keeps colors vibrant and easily distinguishable
      const opacity =
        config.opacity !== undefined
          ? config.opacity
          : isUsingStandard
            ? 0.75
            : this.getDefaultOpacity(config.layer_type, layerDef.type);

      // Only apply if not full opacity (to keep styles cleaner)
      if (opacity < 1.0) {
        paint[opacityProp] = this.generateExpression(
          opacity,
          config,
          'opacity'
        );
      }
    }

    // Apply width for line layers with better defaults
    if (layerDef.type === 'line') {
      if (config.width !== undefined) {
        // Use the user-provided width
        const width = config.width;

        // Always use zoom interpolation for roads
        if (typeof width === 'number' && width > 0) {
          // Create zoom-based interpolation that respects the provided width
          // but ensures it scales properly with zoom
          paint['line-width'] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            width * 0.4, // Thinner at low zoom
            10,
            width * 0.6, // Building up
            14,
            width * 0.85, // Near full width at city zoom
            18,
            width // Full width at high zoom
          ];
        } else {
          paint['line-width'] = this.generateExpression(width, config, 'width');
        }
      } else {
        // Apply smart default widths based on road type with zoom interpolation
        const defaultWidth = this.getDefaultLineWidth(config.layer_type);
        if (defaultWidth) {
          paint['line-width'] = defaultWidth;
        }
      }
    }

    // For highlight action, make it prominent but refined
    if (config.action === 'highlight') {
      if (!effectiveColor) {
        const colorProp = this.getColorProperty(layerDef.type);
        if (colorProp) {
          paint[colorProp] = this.generateExpression(
            this.getHarmoniousColor(config.layer_type, 'highlight'),
            config,
            'color'
          );
        }
      }
      if (!config.width && layerDef.type === 'line' && !paint['line-width']) {
        // Use refined highlight width
        const highlightWidth = this.getDefaultLineWidth(
          config.layer_type,
          true
        );
        paint['line-width'] = highlightWidth || 1.8;
      }
      // For highlights, use moderately higher opacity
      if (
        config.opacity === undefined &&
        !paint[this.getOpacityProperty(layerDef.type) || '']
      ) {
        const opacityProp = this.getOpacityProperty(layerDef.type);
        if (opacityProp) {
          // Use 0.6 for road highlights, 0.8 for other features
          const highlightOpacity =
            config.layer_type.includes('road') ||
            config.layer_type.includes('street') ||
            config.layer_type.includes('motorway')
              ? 0.6
              : 0.8;
          paint[opacityProp] = this.generateExpression(
            highlightOpacity,
            config,
            'opacity'
          );
        }
      }
    }

    // Apply defaults from layer definition with harmonious colors
    for (const prop of layerDef.paintProperties) {
      if (!(prop.property in paint)) {
        // Use harmonious defaults
        if (prop.property.includes('color')) {
          if (
            prop.example &&
            typeof prop.example === 'string' &&
            prop.example.startsWith('#')
          ) {
            paint[prop.property] = prop.example;
          } else {
            paint[prop.property] = this.getHarmoniousColor(
              config.layer_type,
              'default'
            );
          }
        } else if (prop.property === 'line-width') {
          // Skip line-width defaults, we handle those with smart zoom scaling above
          continue;
        } else if (prop.example !== undefined) {
          paint[prop.property] = prop.example;
        }
      }
    }

    // Special handling for symbol layers to ensure better text readability
    if (layer.type === 'symbol') {
      // Ensure text has proper halo for readability
      if (!paint['text-halo-color']) {
        paint['text-halo-color'] =
          globalSettings?.mode === 'dark' ? '#000000' : '#ffffff';
      }
      if (!paint['text-halo-width']) {
        paint['text-halo-width'] = 1.5;
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

    // Add layout properties with better defaults for specific layer types
    if (layerDef.layoutProperties && layerDef.layoutProperties.length > 0) {
      const layout: Record<string, unknown> = {};

      // Special handling for transit and POI layers
      if (
        config.layer_type === 'transit' ||
        config.layer_type === 'poi_labels'
      ) {
        layout['text-field'] = ['get', 'name'];
        layout['icon-image'] = [
          'get',
          config.layer_type === 'transit' ? 'network' : 'maki'
        ];
        layout['text-anchor'] = 'top';
        layout['text-offset'] = [0, 0.8];
        layout['icon-size'] = 1;
        layout['text-font'] = ['DIN Pro Regular', 'Arial Unicode MS Regular'];
        layout['text-size'] = 12;
      } else if (config.layer_type === 'place_labels') {
        layout['text-field'] = ['get', 'name'];
        layout['text-font'] = ['DIN Pro Medium', 'Arial Unicode MS Regular'];
        layout['text-size'] = [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          12,
          18,
          24
        ];
      } else if (config.layer_type === 'road_labels') {
        layout['symbol-placement'] = 'line';
        layout['text-field'] = ['get', 'name'];
        layout['text-font'] = ['DIN Pro Regular', 'Arial Unicode MS Regular'];
        layout['text-size'] = 12;
        layout['text-rotation-alignment'] = 'map';
      } else {
        // Default layout from definition
        for (const prop of layerDef.layoutProperties) {
          if (prop.example !== undefined) {
            layout[prop.property] = prop.example;
          }
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

  private getDefaultLineWidth(
    layerType: string,
    isHighlight: boolean = false
  ): unknown | null {
    // Reasonable default line widths with zoom interpolation (25% thicker)
    const roadWidths: Record<string, unknown> = {
      roads: [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        0.6,
        10,
        1.9,
        14,
        3.8,
        18,
        5.0
      ],
      motorways: [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        1.0,
        10,
        2.5,
        14,
        4.4,
        18,
        6.3
      ],
      primary_roads: [
        'interpolate',
        ['linear'],
        ['zoom'],
        7,
        0.8,
        11,
        1.9,
        14,
        3.1,
        18,
        4.4
      ],
      secondary_roads: [
        'interpolate',
        ['linear'],
        ['zoom'],
        10,
        0.6,
        12,
        1.3,
        14,
        2.5,
        18,
        3.1
      ],
      streets: [
        'interpolate',
        ['linear'],
        ['zoom'],
        12,
        0.4,
        14,
        1.0,
        16,
        1.9,
        18,
        2.5
      ],
      paths: [
        'interpolate',
        ['linear'],
        ['zoom'],
        13,
        0.5,
        15,
        0.8,
        17,
        1.0,
        19,
        1.2
      ],
      railways: [
        'interpolate',
        ['linear'],
        ['zoom'],
        8,
        0.8,
        12,
        1.2,
        16,
        1.8,
        20,
        2.5
      ],
      waterway: [
        'interpolate',
        ['exponential', 1.3],
        ['zoom'],
        8,
        1.0,
        20,
        4.0
      ],

      // Administrative boundaries
      country_boundaries: 2.0,
      state_boundaries: 1.5
    };

    // If highlighting, slightly increase the widths
    if (isHighlight && roadWidths[layerType]) {
      const baseExpression = roadWidths[layerType] as unknown[];
      const modifiedExpression = [...baseExpression];
      // Increase each width value by 20%
      for (let i = 0; i < modifiedExpression.length; i++) {
        if (typeof modifiedExpression[i] === 'number' && i % 2 === 0 && i > 3) {
          modifiedExpression[i] = (modifiedExpression[i] as number) * 1.2;
        }
      }
      return modifiedExpression;
    }

    return roadWidths[layerType] || null;
  }

  private getDefaultOpacity(layerType: string, layerDefType: string): number {
    // Sophisticated opacity values for different layer types
    const opacityMap: Record<string, number> = {
      // Water features - slightly transparent for depth
      water: 0.85,
      waterway: 0.75,

      // Natural features - soft and subtle
      parks: 0.65,
      landuse: 0.45,
      landcover: 0.4,

      // Roads - much more subtle opacity
      motorways: 0.4,
      primary_roads: 0.35,
      secondary_roads: 0.3,
      streets: 0.25,
      paths: 0.2,
      railways: 0.3,
      roads: 0.3, // General roads

      // Buildings - subtle presence
      buildings: 0.6,
      building_3d: 0.7,

      // Administrative - very subtle
      country_boundaries: 0.8,
      state_boundaries: 0.6,

      // Infrastructure
      airports: 0.7,
      transit: 0.75,

      // Labels should be fully opaque for readability
      place_labels: 1.0,
      road_labels: 1.0,
      poi_labels: 1.0
    };

    // Symbol layers should always be fully opaque
    if (layerDefType === 'symbol') {
      return 1.0;
    }

    return opacityMap[layerType] || 0.7;
  }

  private getHarmoniousColor(layerType: string, action: string): string {
    // Define default colors for when user doesn't specify
    const colorPalette = {
      // Transportation colors - vibrant defaults
      motorways: '#ff0000', // Pure red
      primary_roads: '#ff6600', // Orange
      secondary_roads: '#ffaa00', // Yellow-orange
      streets: '#999999', // Medium gray
      paths: '#666666', // Dark gray
      railways: '#555555', // Very dark gray
      roads: '#ff3333', // Generic road red

      // Water features (nice blues)
      water: '#4A90E2', // Nice blue
      waterway: '#5BA0F2', // Lighter blue

      // Natural features (greens)
      parks: '#90C090', // Park green
      landuse: '#A0D0A0', // Light green
      landcover: '#B0E0B0', // Pale green

      // Administrative (purples)
      country_boundaries: '#9966CC', // Purple
      state_boundaries: '#B399D4', // Light purple

      // Labels (dark tones for readability)
      place_labels: '#333333', // Dark gray
      road_labels: '#444444', // Medium dark gray
      poi_labels: '#555555', // Gray

      // Infrastructure
      buildings: '#D4C4B0', // Tan
      building_3d: '#C4B4A0', // Darker tan
      airports: '#CC99CC', // Light purple
      transit: '#6699CC', // Blue-gray

      // Default/highlight colors
      default: '#808080', // Neutral gray
      highlight: '#FF0000' // Red for highlights
    };

    // Return color based on layer type and action
    if (action === 'highlight') {
      // Use slightly more saturated versions for highlights
      const highlightColors: Record<string, string> = {
        motorways: '#C0C0C0', // Medium gray for highlights
        primary_roads: '#CCCCCC', // Slightly darker gray
        secondary_roads: '#D0D0D0', // Light-medium gray
        streets: '#D8D8D8', // Light gray
        roads: '#CCCCCC', // Generic road highlight
        water: '#7FA3CC',
        parks: '#88B889',
        country_boundaries: '#9B7FB8',
        state_boundaries: '#B299CC',
        transit: '#6B8FAA',
        airports: '#D09099'
      };
      return highlightColors[layerType] || colorPalette.highlight;
    }

    return (
      colorPalette[layerType as keyof typeof colorPalette] ||
      colorPalette.default
    );
  }
}
