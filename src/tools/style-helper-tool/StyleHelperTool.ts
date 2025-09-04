import { BaseTool } from '../BaseTool.js';
import {
  StyleHelperToolSchema,
  type StyleHelperToolInput
} from './StyleHelperTool.schema.js';

export class StyleHelperTool extends BaseTool<typeof StyleHelperToolSchema> {
  name = 'style_helper_tool';
  description =
    'Interactive helper for creating custom Mapbox styles with specific features and colors';

  constructor() {
    super({ inputSchema: StyleHelperToolSchema });
  }

  protected async execute(input: StyleHelperToolInput) {
    const step = input.step || 'start';

    switch (step) {
      case 'start':
        return this.handleStart();
      case 'features':
        return this.handleFeatures(input);
      case 'colors':
        return this.handleColors(input);
      case 'generate':
        return this.handleGenerate(input);
      default:
        return this.handleStart();
    }
  }

  private handleStart() {
    return {
      content: [
        {
          type: 'text' as const,
          text: `**Mapbox Style Helper - Initialized**

**Current step: 1 of 4**

**Waiting for:** Style name

---
**Status: REQUIRES USER INPUT FOR NAME**`
        }
      ],
      isError: false
    };
  }

  private handleFeatures(input: StyleHelperToolInput) {
    if (!input.name) {
      return this.handleStart();
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `**Style:** ${input.name}

**Current step: 2 of 4**

**Waiting for:** Feature toggles

**Available options:**
• show_place_labels (true/false)
• show_road_labels (true/false)
• show_pois (true/false)
• show_buildings (true/false)
• show_parks (true/false)
• show_transit (true/false)

---
**Status: REQUIRES USER FEATURE SELECTION**`
        }
      ],
      isError: false
    };
  }

  private handleColors(input: StyleHelperToolInput) {
    if (!input.name) {
      return this.handleStart();
    }

    const features = this.getFeatureSummary(input);

    return {
      content: [
        {
          type: 'text' as const,
          text: `**Style:** ${input.name}
**Features:** ${features}

**Current step: 3 of 4**

**Waiting for:** Color values

**Required:**
• road_color (hex)
• water_color (hex)
• land_color (hex)
• label_color (hex)

**Optional:**
• building_color (hex)
• park_color (hex)

---
**Status: REQUIRES USER COLOR SELECTION**`
        }
      ],
      isError: false
    };
  }

  private handleGenerate(input: StyleHelperToolInput) {
    if (
      !input.name ||
      !input.road_color ||
      !input.water_color ||
      !input.land_color ||
      !input.label_color
    ) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Missing required colors. Please complete all color steps.'
          }
        ],
        isError: true
      };
    }

    const style = this.generateStyle(input);

    return {
      content: [
        {
          type: 'text' as const,
          text: `**COMPLETED: Style Generated**

**Name:** ${input.name}

**Final Configuration:**
• POIs: ${input.show_pois ? 'shown' : 'hidden'}
• Road Labels: ${input.show_road_labels ? 'shown' : 'hidden'}
• Place Labels: ${input.show_place_labels ? 'shown' : 'hidden'}
• Transit: ${input.show_transit ? 'shown' : 'hidden'}
• Buildings: ${input.show_buildings ? 'shown' : 'hidden'}
• Parks: ${input.show_parks ? 'shown' : 'hidden'}

**Colors:**
• Roads: ${input.road_color}
• Water: ${input.water_color}
• Buildings: ${input.building_color || '#e0e0e0'}
• Land: ${input.land_color}
• Parks: ${input.park_color || '#d0e5d0'}
• Labels: ${input.label_color}

**Generated Style JSON:**
\`\`\`json
${JSON.stringify(style, null, 2)}
\`\`\`

---
**Status: STYLE GENERATION COMPLETE**`
        }
      ],
      isError: false
    };
  }

  private generateStyle(input: StyleHelperToolInput) {
    const layers: Record<string, unknown>[] = [
      // Background
      {
        id: 'land',
        type: 'background',
        paint: {
          'background-color': input.land_color
        }
      },
      // Water
      {
        id: 'water',
        type: 'fill',
        source: 'composite',
        'source-layer': 'water',
        paint: {
          'fill-color': input.water_color
        }
      }
    ];

    // Parks (if enabled)
    if (input.show_parks) {
      layers.push({
        id: 'landuse_park',
        type: 'fill',
        source: 'composite',
        'source-layer': 'landuse',
        filter: ['==', ['get', 'class'], 'park'],
        paint: {
          'fill-color': input.park_color || '#d0e5d0',
          'fill-opacity': 0.8
        }
      });
    }

    // Roads - simplified with just two layers
    layers.push({
      id: 'road',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      },
      paint: {
        'line-color': input.road_color,
        'line-width': [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          5,
          0.5,
          18,
          20
        ]
      }
    });

    // Buildings (if enabled)
    if (input.show_buildings) {
      layers.push({
        id: 'building',
        type: 'fill',
        source: 'composite',
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-color': input.building_color || '#e0e0e0',
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 1]
        }
      });
    }

    // Place labels (if enabled)
    if (input.show_place_labels !== false) {
      // Default to true
      layers.push({
        id: 'place_label',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'place_label',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 16, 20]
        },
        paint: {
          'text-color': input.label_color,
          'text-halo-color': input.land_color,
          'text-halo-width': 1.5
        }
      });
    }

    // Road labels (if enabled)
    if (input.show_road_labels) {
      const roadLabel: Record<string, unknown> = {
        id: 'road_label',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 13,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': 12
        },
        paint: {
          'text-color': input.label_color,
          'text-halo-color': input.land_color,
          'text-halo-width': 1
        }
      };
      layers.push(roadLabel);
    }

    // POI labels (if enabled)
    if (input.show_pois) {
      const poiLabel: Record<string, unknown> = {
        id: 'poi_label',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'poi_label',
        minzoom: 13,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-size': 11
        },
        paint: {
          'text-color': input.label_color,
          'text-halo-color': input.land_color,
          'text-halo-width': 1
        }
      };
      layers.push(poiLabel);
    }

    return {
      version: 8,
      name: input.name,
      metadata: {
        'mapbox:autocomposite': true
      },
      sources: {
        composite: {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-terrain-v2,mapbox.mapbox-streets-v8'
        }
      },
      sprite: 'mapbox://sprites/mapbox/streets-v12',
      glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
      layers: layers
    };
  }

  private getFeatureSummary(input: StyleHelperToolInput): string {
    const features = [];
    if (input.show_pois) features.push('POIs');
    if (input.show_road_labels) features.push('road labels');
    if (input.show_place_labels) features.push('place labels');
    if (input.show_transit) features.push('transit');
    if (input.show_buildings) features.push('buildings');
    if (input.show_parks) features.push('parks');

    return features.length > 0 ? features.join(', ') : 'none selected yet';
  }
}
