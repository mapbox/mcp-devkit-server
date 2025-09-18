import { BaseTool } from '../BaseTool.js';
import {
  StyleBuilderToolSchema,
  type StyleBuilderToolInput
} from './StyleBuilderTool.schema.js';
import { MAPBOX_STYLE_LAYERS } from '../../constants/mapboxStyleLayers.js';
import { STREETS_V8_FIELDS } from '../../constants/mapboxStreetsV8Fields.js';
import type { Layer, Filter, MapboxStyle } from '../../types/mapbox-style.js';

// Type for dynamically created layer definitions
type DynamicLayerDefinition = {
  id: string;
  type: 'fill' | 'line' | 'symbol' | 'circle' | 'fill-extrusion';
  sourceLayer: string;
  description: string;
  paintProperties: Array<{
    property: string;
    description: string;
    example: unknown;
  }>;
  commonFilters: string[];
  examples: string[];
};

// Geometry types from Mapbox tilestats API for Streets v8
// This maps actual source-layer names to their geometry types
const SOURCE_LAYER_GEOMETRY: Record<
  string,
  'Point' | 'LineString' | 'Polygon'
> = {
  landuse: 'Polygon',
  waterway: 'LineString',
  water: 'Polygon',
  aeroway: 'LineString',
  structure: 'LineString',
  building: 'Polygon',
  landuse_overlay: 'Polygon',
  road: 'LineString',
  admin: 'LineString',
  place_label: 'Point',
  airport_label: 'Point',
  transit_stop_label: 'Point',
  natural_label: 'LineString', // Note: Can be both Point and LineString, but primarily LineString
  poi_label: 'Point',
  motorway_junction: 'Point',
  housenum_label: 'Point'
};

export class StyleBuilderTool extends BaseTool<typeof StyleBuilderToolSchema> {
  name = 'style_builder_tool';
  description = `Generate Mapbox style JSON for creating new styles or updating existing ones.

The tool intelligently resolves layer types and filter properties using Streets v8 data.
You don't need exact layer names - the tool automatically finds the correct layer based on your filters.

BASE STYLES:
• standard (DEFAULT): Modern Mapbox Standard with best performance
• streets/light/dark/satellite/outdoors: Classic styles
• blank: Empty canvas for full customization

STANDARD STYLE CONFIG:
Use standard_config to customize the basemap:
• Theme: default/faded/monochrome
• Light: day/night/dawn/dusk
• Show/hide: labels, roads, 3D buildings
• Colors: water, roads, parks, etc.

LAYER ACTIONS:
• color: Apply a specific color
• highlight: Make prominent
• hide: Remove from view
• show: Display with defaults

AUTO-DETECTION:
The tool automatically finds the correct layer from your filter_properties.
Examples:
• { class: 'park' } → finds 'landuse' layer
• { type: 'wetland' } → finds 'landuse_overlay' layer
• { maki: 'restaurant' } → finds 'poi_label' layer
• { toll: true } → finds 'road' layer

Invalid layer names are auto-corrected based on the filter properties you provide.

For detailed documentation: resource://mapbox-style-layers`;

  constructor() {
    super({ inputSchema: StyleBuilderToolSchema });
  }

  protected async execute(input: StyleBuilderToolInput) {
    try {
      const result = this.buildStyle(input);
      const { style, corrections } = result;

      // Build corrections message if any
      const correctionsMessage =
        corrections.length > 0
          ? `\n**Auto-corrections Applied:**\n${corrections.join('\n')}\n`
          : '';

      return {
        content: [
          {
            type: 'text' as const,
            text: `**Style Built Successfully**

**Name:** ${input.style_name}
**Base:** ${input.base_style}
**Layers Configured:** ${input.layers.length}
${input.standard_config ? `**Standard Config:** ${Object.keys(input.standard_config).length} properties set` : ''}
${correctionsMessage}
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

  private buildStyle(input: StyleBuilderToolInput): {
    style: MapboxStyle;
    corrections: string[];
  } {
    const layers: Layer[] = [];
    const allCorrections: string[] = [];
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

      // Try to get layer from MAPBOX_STYLE_LAYERS first
      let layerDef:
        | (typeof MAPBOX_STYLE_LAYERS)[keyof typeof MAPBOX_STYLE_LAYERS]
        | DynamicLayerDefinition
        | null = MAPBOX_STYLE_LAYERS[config.layer_type];

      // If not found, try to create a dynamic layer definition
      if (!layerDef) {
        layerDef = this.createDynamicLayerDefinition(config.layer_type);
        if (!layerDef) {
          // Try to find the correct layer based on filter properties
          const correctLayer = this.findCorrectLayerForFilters(config);
          if (correctLayer) {
            allCorrections.push(
              `• Layer type "${config.layer_type}" not found. Using "${correctLayer}" instead (contains the filtered fields).`
            );
            // Update the config with the correct layer type
            config.layer_type = correctLayer;
            // Try again with the correct layer
            layerDef =
              MAPBOX_STYLE_LAYERS[correctLayer] ||
              this.createDynamicLayerDefinition(correctLayer);
          } else {
            // If no filter properties or can't find a match, skip with warning
            console.warn(`Unknown layer type: "${config.layer_type}"`);
            if (
              config.filter_properties &&
              Object.keys(config.filter_properties).length > 0
            ) {
              // Only provide suggestions if they had filter properties
              const availableLayers = this.getAvailableLayersInfo(config);
              console.warn(availableLayers);
            }
            continue;
          }
        }
      }

      const result = this.createLayer(
        layerDef,
        config,
        input.global_settings,
        isUsingStandard
      );
      if (result.layer) {
        layers.push(result.layer);
      }
      if (result.corrections.length > 0) {
        allCorrections.push(...result.corrections);
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

      // Build the import configuration
      const importConfig: any = {
        id: 'basemap',
        url: 'mapbox://styles/mapbox/standard'
      };

      // Add Standard style configuration if provided
      if (
        input.standard_config &&
        Object.keys(input.standard_config).length > 0
      ) {
        importConfig.config = input.standard_config;
      }

      style.imports = [importConfig];
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
    } else {
      // Blank style or no base style specified - no imports, just basic sources
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

    return { style, corrections: allCorrections };
  }

  private createLayer(
    layerDef:
      | (typeof MAPBOX_STYLE_LAYERS)[keyof typeof MAPBOX_STYLE_LAYERS]
      | NonNullable<ReturnType<typeof this.createDynamicLayerDefinition>>,
    config: StyleBuilderToolInput['layers'][0],
    globalSettings?: StyleBuilderToolInput['global_settings'],
    isUsingStandard?: boolean
  ): { layer: Layer | null; corrections: string[] } {
    // Generate a unique ID for the layer based on its properties
    let layerId = `${layerDef.id || config.layer_type}-custom`;

    // If there are filter properties, create a unique suffix from them
    if (config.filter_properties) {
      // Create a deterministic hash from the filter properties
      const filterKeys = Object.entries(config.filter_properties)
        .map(([key, value]) => `${key}-${value}`)
        .join('-');
      layerId = `${layerDef.id}-${filterKeys}`;
    }

    const layer: Layer = {
      id: layerId,
      type: layerDef.type as Layer['type']
    };

    // Add slot for Standard style
    if (isUsingStandard) {
      // Smart slot assignment if not explicitly provided:
      // - Layers with filter_properties go to 'top' for visibility
      // - Regular roads go to 'middle'
      // - Labels go to 'top'

      if (config.slot) {
        // User explicitly set the slot - respect their choice
        layer.slot = config.slot;
      } else if (
        config.filter_properties &&
        Object.keys(config.filter_properties).length > 0
      ) {
        // ANY layer with filter properties should be on top for visibility
        // This includes: toll roads, bridges, tunnels, bike lanes, restricted roads, etc.
        layer.slot = 'top';
      } else if (config.layer_type.includes('label')) {
        // Labels should always be on top
        layer.slot = 'top';
      } else if (this.isRoadLayer(config.layer_type)) {
        // Regular roads without filters in the middle
        layer.slot = 'middle';
      } else {
        // Default for other layers
        layer.slot = 'middle';
      }
    }

    // Add source configuration
    if (layerDef.sourceLayer) {
      layer.source = 'composite';
      layer['source-layer'] = layerDef.sourceLayer;
    }

    // Generate comprehensive filter with auto-correction
    const filterResult = this.generateComprehensiveFilter(config, layerDef);
    if (filterResult.filter) {
      layer.filter = filterResult.filter;
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
      // Special handling for boundaries - fade at higher zooms
      if (
        config.layer_type === 'country_boundaries' ||
        config.layer_type === 'state_boundaries'
      ) {
        const baseOpacity =
          config.opacity !== undefined
            ? config.opacity
            : this.getDefaultOpacity(config.layer_type, layerDef.type);

        // Create zoom-based interpolation for boundaries
        paint[opacityProp] = [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          baseOpacity, // Full opacity at world view
          6,
          baseOpacity * 0.8, // Slightly faded at country view
          10,
          baseOpacity * 0.6, // More faded at region view
          14,
          baseOpacity * 0.4, // Very faded at city view
          18,
          baseOpacity * 0.2 // Almost invisible at street level
        ];
      } else if (this.isRoadLayer(config.layer_type)) {
        // Special handling for roads - more subtle at lower zooms
        const baseOpacity =
          config.opacity !== undefined
            ? config.opacity
            : this.getDefaultOpacity(config.layer_type, layerDef.type);

        // For highlighted/navigation roads, use higher opacity
        const isNavigationHighlight =
          config.action === 'highlight' || config.layer_type === 'motorways';

        if (isNavigationHighlight) {
          // Navigation-focused roads should be more prominent
          paint[opacityProp] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            Math.max(baseOpacity * 0.6, 0.6), // More visible at country view
            8,
            Math.max(baseOpacity * 0.75, 0.75), // Good visibility at region view
            11,
            Math.max(baseOpacity * 0.85, 0.85), // Strong at city level
            14,
            Math.max(baseOpacity * 0.95, 0.95), // Nearly full at neighborhood
            16,
            1.0 // Full opacity at street level
          ];
        } else {
          // Regular roads - subtle at low zooms
          paint[opacityProp] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            baseOpacity * 0.3, // Very subtle at country view
            8,
            baseOpacity * 0.5, // Half opacity at region view
            11,
            baseOpacity * 0.7, // More visible at city level
            14,
            baseOpacity * 0.85, // Nearly full at neighborhood level
            16,
            baseOpacity // Full opacity at street level
          ];
        }
      } else {
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
        const defaultWidth = this.getDefaultLineWidth(
          config.layer_type,
          config.action === 'highlight'
        );

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
    if (
      'layoutProperties' in layerDef &&
      layerDef.layoutProperties &&
      layerDef.layoutProperties.length > 0
    ) {
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
      } else if ('layoutProperties' in layerDef && layerDef.layoutProperties) {
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

    return { layer, corrections: filterResult.corrections };
  }

  private parseFilterString(filterStr: string): unknown | null {
    // Parse filter strings like "class: motorway|trunk" or "admin_level: 0, maritime: false"
    const filters: unknown[] = [];

    // Check if this contains multiple properties (multiple colons not within quotes)
    const colonMatches = filterStr.match(/:/g) || [];

    if (colonMatches.length === 1) {
      // Single property, possibly with multiple values separated by |
      const [property, values] = filterStr.split(':').map((s) => s.trim());
      const valueList = values.split('|').map((v) => {
        const trimmed = v.trim();
        // Special handling for admin layer properties that use string booleans
        // maritime and disputed use "true"/"false" as strings, not booleans
        if (
          property === 'maritime' ||
          property === 'disputed' ||
          property === 'toll'
        ) {
          return trimmed; // Keep as string "true" or "false"
        }
        // Handle boolean strings for other properties
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        // Try to parse as number
        const num = Number(trimmed);
        return isNaN(num) ? trimmed : num;
      });

      // Always use match format for consistency with Mapbox Studio
      filters.push(['match', ['get', property], valueList, true, false]);
    } else {
      // Multiple properties separated by comma
      const conditions = filterStr.split(',').map((s) => s.trim());

      for (const condition of conditions) {
        if (condition.includes(':')) {
          const [property, values] = condition.split(':').map((s) => s.trim());
          const valueList = values.split('|').map((v) => {
            const trimmed = v.trim();
            // Special handling for properties that use string booleans
            if (
              property === 'maritime' ||
              property === 'disputed' ||
              property === 'toll'
            ) {
              return trimmed; // Keep as string
            }
            // Handle boolean strings for other properties
            if (trimmed === 'true') return true;
            if (trimmed === 'false') return false;
            // Try to parse as number
            const num = Number(trimmed);
            return isNaN(num) ? trimmed : num;
          });

          // Always use match format for consistency with Mapbox Studio
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
      const layerDef =
        MAPBOX_STYLE_LAYERS[config.layer_type] ||
        this.createDynamicLayerDefinition(config.layer_type);
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

    // Add Standard style configuration summary if present
    if (
      input.standard_config &&
      Object.keys(input.standard_config).length > 0
    ) {
      parts.push(`\n**Standard Style Configuration:**`);
      const config = input.standard_config;

      // Visibility settings
      const visibilitySettings = [];
      if (config.showPlaceLabels !== undefined)
        visibilitySettings.push(
          `Place labels: ${config.showPlaceLabels ? 'shown' : 'hidden'}`
        );
      if (config.showRoadLabels !== undefined)
        visibilitySettings.push(
          `Road labels: ${config.showRoadLabels ? 'shown' : 'hidden'}`
        );
      if (config.showPointOfInterestLabels !== undefined)
        visibilitySettings.push(
          `POI labels: ${config.showPointOfInterestLabels ? 'shown' : 'hidden'}`
        );
      if (config.showTransitLabels !== undefined)
        visibilitySettings.push(
          `Transit labels: ${config.showTransitLabels ? 'shown' : 'hidden'}`
        );
      if (config.showPedestrianRoads !== undefined)
        visibilitySettings.push(
          `Pedestrian roads: ${config.showPedestrianRoads ? 'shown' : 'hidden'}`
        );
      if (config.show3dObjects !== undefined)
        visibilitySettings.push(
          `3D objects: ${config.show3dObjects ? 'shown' : 'hidden'}`
        );
      if (config.showAdminBoundaries !== undefined)
        visibilitySettings.push(
          `Admin boundaries: ${config.showAdminBoundaries ? 'shown' : 'hidden'}`
        );

      if (visibilitySettings.length > 0) {
        parts.push(`• Visibility: ${visibilitySettings.join(', ')}`);
      }

      // Theme settings
      if (config.theme) parts.push(`• Theme: ${config.theme}`);
      if (config.lightPreset)
        parts.push(`• Light preset: ${config.lightPreset}`);

      // Color overrides
      const colorOverrides = [];
      if (config.colorMotorways)
        colorOverrides.push(`motorways: ${config.colorMotorways}`);
      if (config.colorTrunks)
        colorOverrides.push(`trunks: ${config.colorTrunks}`);
      if (config.colorRoads) colorOverrides.push(`roads: ${config.colorRoads}`);
      if (config.colorWater) colorOverrides.push(`water: ${config.colorWater}`);
      if (config.colorGreenspace)
        colorOverrides.push(`greenspace: ${config.colorGreenspace}`);
      if (config.colorAdminBoundaries)
        colorOverrides.push(`admin boundaries: ${config.colorAdminBoundaries}`);

      if (colorOverrides.length > 0) {
        parts.push(`• Color overrides: ${colorOverrides.join(', ')}`);
      }

      // Other settings
      if (config.densityPointOfInterestLabels !== undefined) {
        parts.push(`• POI density: ${config.densityPointOfInterestLabels}`);
      }
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

  /**
   * Calculate similarity between two strings (simple Levenshtein-like score)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact match
    if (s1 === s2) return 1;

    // Substring match - high score if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
      const lengthRatio =
        Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
      return 0.7 + 0.2 * lengthRatio;
    }

    // Calculate common characters
    let common = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) common++;
    }

    return common / Math.max(s1.length, s2.length);
  }

  /**
   * Find the closest matching value for a field using intelligent matching
   */
  private findClosestFieldValue(
    fieldName: string,
    inputValue: string | number | boolean,
    validValues: readonly any[]
  ): { value: any; corrected: boolean; message?: string } {
    // For non-string values, just check if it's valid
    if (typeof inputValue !== 'string') {
      const isValid = validValues.includes(inputValue);
      return {
        value: inputValue,
        corrected: false,
        message: isValid
          ? undefined
          : `Invalid ${fieldName} value: ${inputValue}. Valid values: ${validValues.slice(0, 10).join(', ')}${validValues.length > 10 ? '...' : ''}`
      };
    }

    // 1. Check for exact match (case-insensitive)
    const exactMatch = validValues.find(
      (v) =>
        typeof v === 'string' && v.toLowerCase() === inputValue.toLowerCase()
    );
    if (exactMatch) {
      return {
        value: exactMatch,
        corrected: exactMatch !== inputValue,
        message:
          exactMatch !== inputValue
            ? `Auto-corrected casing: "${inputValue}" → "${exactMatch}"`
            : undefined
      };
    }

    // 2. Try common variations (only if they result in a valid value)
    const variations = [
      inputValue.replace(/\s+/g, '_'), // spaces to underscores
      inputValue.replace(/\s+/g, '-'), // spaces to hyphens
      inputValue.replace(/_/g, '-'), // underscores to hyphens
      inputValue.replace(/-/g, '_'), // hyphens to underscores
      inputValue.replace(/[\s_-]+/g, '') // remove all separators
    ];

    for (const variation of variations) {
      const match = validValues.find(
        (v) =>
          typeof v === 'string' && v.toLowerCase() === variation.toLowerCase()
      );
      if (match) {
        return {
          value: match,
          corrected: true,
          message: `Auto-corrected: "${inputValue}" → "${match}"`
        };
      }
    }

    // 3. Find best match using similarity scoring
    const stringValues = validValues.filter(
      (v) => typeof v === 'string'
    ) as string[];
    if (stringValues.length > 0) {
      const scores = stringValues.map((v) => ({
        value: v,
        score: this.calculateSimilarity(inputValue, v)
      }));

      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);

      // If we have a good match (>70% similarity), use it
      if (scores[0].score > 0.7) {
        return {
          value: scores[0].value,
          corrected: true,
          message: `Auto-corrected: "${inputValue}" → "${scores[0].value}" (${Math.round(scores[0].score * 100)}% match)`
        };
      }

      // If we have a decent match (>50% similarity) and it's significantly better than the next one
      if (
        scores[0].score > 0.5 &&
        (!scores[1] || scores[0].score > scores[1].score * 1.5)
      ) {
        return {
          value: scores[0].value,
          corrected: true,
          message: `Auto-corrected: "${inputValue}" → "${scores[0].value}" (best guess)`
        };
      }
    }

    // 4. No good match found - return original with error message
    const suggestions = validValues.slice(0, 10).join(', ');
    return {
      value: inputValue,
      corrected: false,
      message: `Warning: "${inputValue}" is not a valid ${fieldName} value. Valid values include: ${suggestions}${validValues.length > 10 ? '...' : ''}`
    };
  }

  /**
   * Intelligently resolve filter properties by checking if they're field names or values
   */
  private resolveFilterProperty(
    sourceLayer: string,
    property: string,
    value: any
  ): {
    resolvedProperty: string;
    resolvedValue: any;
    correction?: string;
  } {
    const layerFields = STREETS_V8_FIELDS[
      sourceLayer as keyof typeof STREETS_V8_FIELDS
    ] as any;
    if (!layerFields) {
      return { resolvedProperty: property, resolvedValue: value };
    }

    // Case 1: Property is an actual field name in this layer (e.g., "toll", "oneway", "bike_lane")
    if (property in layerFields) {
      const fieldDef = layerFields[property];

      // Validate/correct the value for this field
      if (fieldDef && 'values' in fieldDef && Array.isArray(fieldDef.values)) {
        const result = this.findClosestFieldValue(
          property,
          value,
          fieldDef.values
        );
        return {
          resolvedProperty: property,
          resolvedValue: result.value,
          correction: result.message
        };
      }
      return { resolvedProperty: property, resolvedValue: value };
    }

    // Case 2: Property might be a value that belongs to a field (e.g., "wetland" should be type: "wetland")
    // Priority order for searching fields
    const fieldPriority = [
      'type',
      'class',
      'maki',
      'structure',
      'surface',
      'mode',
      'stop_type'
    ];

    // First, try the priority fields
    for (const fieldName of fieldPriority) {
      const fieldDef = layerFields[fieldName];
      if (
        !fieldDef ||
        !('values' in fieldDef) ||
        !Array.isArray(fieldDef.values)
      )
        continue;

      // Check if our property name matches a value in this field
      for (const validValue of fieldDef.values) {
        if (
          String(validValue).toLowerCase() === String(property).toLowerCase()
        ) {
          return {
            resolvedProperty: fieldName,
            resolvedValue: validValue,
            correction: `Interpreted "${property}" as ${fieldName}="${validValue}"`
          };
        }
      }

      // Check for partial matches
      for (const validValue of fieldDef.values) {
        const propLower = String(property).toLowerCase();
        const valLower = String(validValue).toLowerCase();
        if (valLower.includes(propLower) || propLower.includes(valLower)) {
          return {
            resolvedProperty: fieldName,
            resolvedValue: validValue,
            correction: `Interpreted "${property}" as ${fieldName}="${validValue}" (partial match)`
          };
        }
      }
    }

    // Case 3: Search all other fields if no match in priority fields
    for (const [fieldName, fieldDef] of Object.entries(layerFields)) {
      if (fieldPriority.includes(fieldName)) continue; // Already checked
      if (!fieldDef || typeof fieldDef !== 'object') continue;
      if (!('values' in fieldDef) || !Array.isArray((fieldDef as any).values))
        continue;

      const values = (fieldDef as any).values;
      for (const validValue of values) {
        if (
          String(validValue).toLowerCase() === String(property).toLowerCase()
        ) {
          return {
            resolvedProperty: fieldName,
            resolvedValue: validValue,
            correction: `Interpreted "${property}" as ${fieldName}="${validValue}"`
          };
        }
      }
    }

    // Case 4: No match found - keep original but warn
    return {
      resolvedProperty: property,
      resolvedValue: value,
      correction: `Warning: "${property}" not found as field or value in ${sourceLayer} layer`
    };
  }

  private buildAdvancedFilter(
    sourceLayer: string,
    filterConfig: Record<
      string,
      string | number | boolean | (string | number | boolean)[]
    >
  ): { filter: Filter | null; corrections: string[] } {
    const filters: unknown[] = [];
    const corrections: string[] = [];

    // Get field definitions for this source layer
    const layerFields =
      STREETS_V8_FIELDS[sourceLayer as keyof typeof STREETS_V8_FIELDS];
    if (!layerFields) return { filter: null, corrections: [] };

    // Resolve each property to determine if it's a field name or value
    const resolvedConfig: Record<string, any> = {};

    for (const [property, value] of Object.entries(filterConfig)) {
      if (value === undefined || value === null) continue;

      const resolved = this.resolveFilterProperty(sourceLayer, property, value);

      if (resolved.correction) {
        corrections.push(resolved.correction);
      }

      // Accumulate values for the same property
      if (resolvedConfig[resolved.resolvedProperty]) {
        // If we already have this property, combine values into array
        const existing = resolvedConfig[resolved.resolvedProperty];
        if (Array.isArray(existing)) {
          existing.push(resolved.resolvedValue);
        } else {
          resolvedConfig[resolved.resolvedProperty] = [
            existing,
            resolved.resolvedValue
          ];
        }
      } else {
        resolvedConfig[resolved.resolvedProperty] = resolved.resolvedValue;
      }
    }

    // Now build filters from resolved config
    for (const [property, value] of Object.entries(resolvedConfig)) {
      if (value === undefined || value === null) continue;

      const fieldDef = layerFields[property as keyof typeof layerFields] as any;

      // Special handling for toll property - it's a presence check, not a value check
      // The toll field only has 'true' when present, otherwise it's not in the data
      if (
        property === 'toll' &&
        (value === true || value === 'true' || value === 1 || value === '1')
      ) {
        // Use "has" expression to check if toll property exists
        filters.push(['has', 'toll']);
        continue;
      }

      if (!fieldDef) {
        console.warn(
          `Warning: Field "${property}" does not exist in layer "${sourceLayer}". Skipping filter.`
        );
        continue;
      }

      // Check if this field uses string booleans by looking at its defined values
      const isStringBooleanField =
        fieldDef &&
        'values' in fieldDef &&
        Array.isArray(fieldDef.values) &&
        fieldDef.values.length > 0 &&
        (fieldDef.values.includes('true') || fieldDef.values.includes('false'));

      // Convert values for properties that expect string booleans
      let processedValue = value;
      if (isStringBooleanField) {
        if (Array.isArray(value)) {
          processedValue = value.map((v) => {
            // Handle all truthy values
            if (v === true || v === 1 || v === '1' || v === 'true')
              return 'true';
            // Handle all falsy values
            if (v === false || v === 0 || v === '0' || v === 'false')
              return 'false';
            return String(v);
          });
        } else {
          // Handle all truthy values
          if (
            value === true ||
            value === 1 ||
            value === '1' ||
            value === 'true'
          ) {
            processedValue = 'true';
          } else if (
            value === false ||
            value === 0 ||
            value === '0' ||
            value === 'false'
          ) {
            processedValue = 'false';
          } else {
            processedValue = String(value);
          }
        }
      }

      // Validate and auto-correct values against defined values
      if (
        fieldDef &&
        'values' in fieldDef &&
        Array.isArray(fieldDef.values) &&
        fieldDef.values.length > 0
      ) {
        const validValues = fieldDef.values;

        if (Array.isArray(processedValue)) {
          // For arrays, validate and correct each value
          const correctedValues = [];
          for (const val of processedValue) {
            const result = this.findClosestFieldValue(
              property,
              val,
              validValues
            );
            if (result.message) {
              corrections.push(`  ${property}: ${result.message}`);
            }
            correctedValues.push(result.value);
          }
          processedValue = correctedValues;
        } else {
          // For single values, validate and correct
          const result = this.findClosestFieldValue(
            property,
            processedValue,
            validValues
          );
          if (result.message) {
            corrections.push(`  ${property}: ${result.message}`);
          }
          processedValue = result.value;
        }
      }

      // Use Mapbox Studio's match format for all property filters
      // For presence-based fields like 'toll', we already handled them above
      if (Array.isArray(processedValue) && processedValue.length > 0) {
        // Array of values - use as is
        filters.push(['match', ['get', property], processedValue, true, false]);
      } else if (processedValue !== undefined && processedValue !== null) {
        // Single value - wrap in array for consistent match format
        filters.push([
          'match',
          ['get', property],
          [processedValue],
          true,
          false
        ]);
      }
    }

    const filter =
      filters.length === 0
        ? null
        : filters.length === 1
          ? (filters[0] as Filter)
          : (['all', ...filters] as Filter);

    return { filter, corrections };
  }

  private generateComprehensiveFilter(
    config: StyleBuilderToolInput['layers'][0],
    layerDef:
      | (typeof MAPBOX_STYLE_LAYERS)[keyof typeof MAPBOX_STYLE_LAYERS]
      | DynamicLayerDefinition
      | null
  ): { filter: Filter | null; corrections: string[] } {
    // If custom filter is provided, process it through buildAdvancedFilter
    if (
      config.filter &&
      typeof config.filter === 'object' &&
      !Array.isArray(config.filter)
    ) {
      // It's a simple object like {type: 'wetland'}, process it
      if (layerDef && 'sourceLayer' in layerDef && layerDef.sourceLayer) {
        return this.buildAdvancedFilter(
          layerDef.sourceLayer,
          config.filter as Record<
            string,
            string | number | boolean | (string | number | boolean)[]
          >
        );
      }
    } else if (config.filter && Array.isArray(config.filter)) {
      // It's already a Mapbox expression, use it as-is
      return { filter: config.filter as Filter, corrections: [] };
    }

    const filters: Filter[] = [];
    const allCorrections: string[] = [];

    // First, add common filters from layer definition
    if (
      layerDef &&
      layerDef.commonFilters &&
      layerDef.commonFilters.length > 0
    ) {
      // Handle multiple filter conditions - join with comma for multiple properties
      // Each element can be either a single property or a property with pipe-separated values
      const filterStr = layerDef.commonFilters.join(', ');
      const commonFilter = this.parseFilterString(filterStr);
      if (commonFilter) {
        filters.push(commonFilter as Filter);
      }
    }

    // Then, add filter_properties if provided
    if (
      config.filter_properties &&
      layerDef &&
      'sourceLayer' in layerDef &&
      layerDef.sourceLayer
    ) {
      const result = this.buildAdvancedFilter(
        layerDef.sourceLayer,
        config.filter_properties
      );
      if (result.filter) {
        filters.push(result.filter);
      }
      if (result.corrections.length > 0) {
        allCorrections.push(...result.corrections);
      }
    }

    // Combine filters if there are multiple
    const filter =
      filters.length === 0
        ? null
        : filters.length === 1
          ? filters[0]
          : (['all', ...filters] as Filter);

    return { filter, corrections: allCorrections };
  }

  private isRoadLayer(layerType: string): boolean {
    return [
      'roads',
      'motorways',
      'primary_roads',
      'secondary_roads',
      'streets',
      'paths',
      'railways'
    ].includes(layerType);
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

      // Administrative boundaries - thinner with zoom interpolation
      country_boundaries: [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        0.5, // Very thin at world view
        4,
        0.8, // Slightly thicker at country level
        8,
        1.2, // Moderate at region level
        12,
        1.5, // Slightly thicker at city level
        16,
        1.8 // Maximum thickness at street level
      ],
      state_boundaries: [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        0.3, // Almost invisible at world view
        6,
        0.6, // Thin at country level
        10,
        1.0, // Moderate at region level
        14,
        1.3, // Slightly thicker at city level
        18,
        1.5 // Maximum thickness at street level
      ]
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

      // Roads - varied opacity for navigation clarity
      motorways: 0.85, // High visibility for navigation
      primary_roads: 0.75, // Clear but not dominant
      secondary_roads: 0.65, // Visible but subdued
      streets: 0.55, // Background context
      paths: 0.45, // Subtle
      railways: 0.7, // Clear but distinct
      roads: 0.6, // General roads

      // Buildings - subtle presence
      buildings: 0.6,
      building_3d: 0.7,

      // Administrative - very subtle, fading at higher zooms
      country_boundaries: 0.5, // More subtle base opacity
      state_boundaries: 0.4, // Even more subtle for states

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

  private createDynamicLayerDefinition(layerType: string) {
    // Check if this layer type exists as a source-layer
    // No conversion needed - source-layer names already use underscores
    const sourceLayer = layerType;

    // Check if this source-layer exists in STREETS_V8_FIELDS or our geometry mapping
    const hasInStreetsV8 = sourceLayer in STREETS_V8_FIELDS;
    const hasInGeometry = sourceLayer in SOURCE_LAYER_GEOMETRY;

    if (!hasInStreetsV8 && !hasInGeometry) {
      return null;
    }

    // Get geometry type from our hardcoded mapping
    const geometry = SOURCE_LAYER_GEOMETRY[sourceLayer];
    if (!geometry) {
      // Source-layer exists in STREETS_V8_FIELDS but not in our geometry mapping
      // This shouldn't happen with Streets v8, but let's handle it gracefully
      console.warn(`No geometry type found for source-layer: ${sourceLayer}`);
      return null;
    }

    // Determine layer type based on geometry
    let type: 'fill' | 'line' | 'symbol' | 'circle' | 'fill-extrusion';
    let paintProperties: Array<{
      property: string;
      description: string;
      example: any;
    }> = [];

    switch (geometry) {
      case 'Polygon':
        // Special case for buildings with 3D
        if (sourceLayer === 'building' && layerType.includes('3d')) {
          type = 'fill-extrusion';
          paintProperties = [
            {
              property: 'fill-extrusion-color',
              description: 'Building color',
              example: '#AAAAAA'
            },
            {
              property: 'fill-extrusion-height',
              description: 'Building height',
              example: ['get', 'height']
            },
            {
              property: 'fill-extrusion-base',
              description: 'Building base height',
              example: ['get', 'min_height']
            },
            {
              property: 'fill-extrusion-opacity',
              description: 'Building opacity',
              example: 0.8
            }
          ];
        } else {
          type = 'fill';
          paintProperties = [
            {
              property: 'fill-color',
              description: 'Fill color',
              example: '#000000'
            },
            {
              property: 'fill-opacity',
              description: 'Fill opacity',
              example: 0.5
            },
            {
              property: 'fill-outline-color',
              description: 'Outline color',
              example: '#000000'
            }
          ];
        }
        break;

      case 'LineString':
        // Admin boundaries and natural features are often rendered as lines
        type = 'line';
        paintProperties = [
          {
            property: 'line-color',
            description: 'Line color',
            example: '#000000'
          },
          { property: 'line-width', description: 'Line width', example: 2 },
          {
            property: 'line-opacity',
            description: 'Line opacity',
            example: 0.8
          }
        ];
        break;

      case 'Point':
        // Points can be either circle or symbol layers
        // Labels and text-based layers should be symbols
        if (
          sourceLayer.includes('label') ||
          sourceLayer === 'motorway_junction'
        ) {
          type = 'symbol';
          paintProperties = [
            {
              property: 'text-color',
              description: 'Text color',
              example: '#000000'
            },
            {
              property: 'text-halo-color',
              description: 'Text halo color',
              example: '#FFFFFF'
            },
            {
              property: 'text-halo-width',
              description: 'Text halo width',
              example: 1
            }
          ];
        } else {
          // Default to circle for point features without labels
          type = 'circle';
          paintProperties = [
            {
              property: 'circle-color',
              description: 'Circle color',
              example: '#000000'
            },
            {
              property: 'circle-radius',
              description: 'Circle radius',
              example: 5
            },
            {
              property: 'circle-opacity',
              description: 'Circle opacity',
              example: 0.8
            }
          ];
        }
        break;

      default:
        // This shouldn't happen with our hardcoded geometry mapping
        console.warn(`Unknown geometry type: ${geometry}`);
        type = 'fill';
        paintProperties = [
          {
            property: 'fill-color',
            description: 'Fill color',
            example: '#000000'
          },
          {
            property: 'fill-opacity',
            description: 'Fill opacity',
            example: 0.5
          }
        ];
    }

    return {
      id: sourceLayer, // Use source-layer name as the id
      type: type as any,
      sourceLayer: sourceLayer,
      description: `${sourceLayer} layer (${geometry} geometry)`,
      paintProperties,
      commonFilters: [],
      examples: []
    };
  }

  private findCorrectLayerForFilters(
    config: StyleBuilderToolInput['layers'][0]
  ): string | null {
    // If no filter properties, we can't determine the correct layer
    if (!config.filter_properties) {
      return null;
    }

    // Score each source layer based on how well it matches the filter properties
    const layerScores: Record<string, number> = {};
    const filterEntries = Object.entries(config.filter_properties);

    for (const [sourceLayer, fields] of Object.entries(STREETS_V8_FIELDS)) {
      let score = 0;
      const layerFields = fields as Record<
        string,
        { values?: readonly string[]; description?: string }
      >;

      for (const [fieldName, fieldValue] of filterEntries) {
        // Check if this field exists in this layer
        if (fieldName in layerFields) {
          score += 10; // Base score for having the field

          const fieldDef = layerFields[fieldName];
          if (fieldDef.values && Array.isArray(fieldDef.values)) {
            // Check if the value exists in this field's allowed values
            const valuesToCheck = Array.isArray(fieldValue)
              ? fieldValue
              : [fieldValue];

            for (const val of valuesToCheck) {
              const normalizedVal = String(val)
                .toLowerCase()
                .replace(/[_-\s]/g, '');

              // Exact match (after normalization)
              const exactMatch = fieldDef.values.some(
                (v) =>
                  String(v)
                    .toLowerCase()
                    .replace(/[_-\s]/g, '') === normalizedVal
              );

              if (exactMatch) {
                score += 20; // High score for exact value match
              } else {
                // Partial match
                const partialMatch = fieldDef.values.some(
                  (v) =>
                    String(v)
                      .toLowerCase()
                      .replace(/[_-\s]/g, '')
                      .includes(normalizedVal) ||
                    normalizedVal.includes(
                      String(v)
                        .toLowerCase()
                        .replace(/[_-\s]/g, '')
                    )
                );

                if (partialMatch) {
                  score += 5; // Lower score for partial match
                }
              }
            }
          } else {
            // Field exists but has no predefined values (like name fields)
            // Still counts but with lower score
            score += 5;
          }
        }
      }

      if (score > 0) {
        layerScores[sourceLayer] = score;
      }
    }

    // Find the layer with the highest score
    let bestLayer: string | null = null;
    let bestScore = 0;

    for (const [layer, score] of Object.entries(layerScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestLayer = layer;
      }
    }

    // If we found a match and it's different from what was requested, return it
    if (bestLayer && bestLayer !== config.layer_type) {
      return bestLayer;
    }

    return null;
  }

  private getAvailableLayersInfo(
    config: StyleBuilderToolInput['layers'][0]
  ): string {
    const messages: string[] = [];

    // First, list the valid layer types from MAPBOX_STYLE_LAYERS
    const validPreDefinedLayers = Object.keys(MAPBOX_STYLE_LAYERS);
    messages.push(
      `Valid pre-defined layer types: ${validPreDefinedLayers.join(', ')}`
    );

    // List valid source layers from STREETS_V8_FIELDS
    const validSourceLayers = Object.keys(STREETS_V8_FIELDS);
    messages.push(
      `Valid Streets v8 source layers: ${validSourceLayers.join(', ')}`
    );

    // If they specified filter properties, suggest layers that contain those fields
    if (config.filter_properties) {
      const suggestions: string[] = [];

      for (const [fieldName, fieldValue] of Object.entries(
        config.filter_properties
      )) {
        // Find which layers contain this field
        const layersWithField: string[] = [];

        for (const [sourceLayer, fields] of Object.entries(STREETS_V8_FIELDS)) {
          const layerFields = fields as Record<
            string,
            { values?: readonly string[]; description?: string }
          >;
          if (fieldName in layerFields) {
            const fieldDef = layerFields[fieldName];
            if (fieldDef.values && fieldDef.values.length > 0) {
              // Show some example values for this field in this layer
              const exampleValues = fieldDef.values.slice(0, 5).join(', ');
              const moreValues =
                fieldDef.values.length > 5
                  ? `, ... (${fieldDef.values.length} total)`
                  : '';
              layersWithField.push(
                `${sourceLayer} (${fieldName}: ${exampleValues}${moreValues})`
              );
            } else {
              layersWithField.push(`${sourceLayer} (has ${fieldName} field)`);
            }
          }
        }

        if (layersWithField.length > 0) {
          suggestions.push(
            `Layers with field "${fieldName}": ${layersWithField.join(', ')}`
          );
        }

        // Also look for value matches
        const layersWithValue: string[] = [];
        const valueStr = String(fieldValue)
          .toLowerCase()
          .replace(/[_-\s]/g, '');

        for (const [sourceLayer, fields] of Object.entries(STREETS_V8_FIELDS)) {
          const layerFields = fields as Record<
            string,
            { values?: readonly string[]; description?: string }
          >;

          for (const [layerFieldName, fieldDef] of Object.entries(
            layerFields
          )) {
            if (fieldDef.values && Array.isArray(fieldDef.values)) {
              const matchingValues = fieldDef.values.filter(
                (v) =>
                  String(v)
                    .toLowerCase()
                    .replace(/[_-\s]/g, '')
                    .includes(valueStr) ||
                  valueStr.includes(
                    String(v)
                      .toLowerCase()
                      .replace(/[_-\s]/g, '')
                  )
              );

              if (matchingValues.length > 0) {
                layersWithValue.push(
                  `${sourceLayer}.${layerFieldName} has: ${matchingValues.slice(0, 3).join(', ')}`
                );
              }
            }
          }
        }

        if (layersWithValue.length > 0) {
          suggestions.push(
            `Layers with value similar to "${fieldValue}": ${layersWithValue.slice(0, 5).join(', ')}`
          );
        }
      }

      if (suggestions.length > 0) {
        messages.push(
          `\nSuggestions based on your filters:\n${suggestions.join('\n')}`
        );
      }
    }

    return messages.join('\n');
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
