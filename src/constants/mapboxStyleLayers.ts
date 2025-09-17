/**
 * Mapbox Style Layer Definitions
 *
 * Comprehensive descriptions of all Mapbox style layers to guide LLMs in creating styles.
 * Based on Mapbox Streets v12 specification.
 */

export interface LayerDefinition {
  id: string;
  description: string;
  sourceLayer?: string;
  type:
    | 'background'
    | 'fill'
    | 'line'
    | 'symbol'
    | 'circle'
    | 'raster'
    | 'hillshade'
    | 'heatmap'
    | 'fill-extrusion'
    | 'sky';
  commonFilters?: string[];
  availableProperties?: Record<
    string,
    {
      description: string;
      values?: string[];
      type?: 'string' | 'number' | 'boolean';
    }
  >;
  paintProperties: {
    property: string;
    description: string;
    example: unknown;
  }[];
  layoutProperties?: {
    property: string;
    description: string;
    example: unknown;
  }[];
  examples: string[];
}

export const MAPBOX_STYLE_LAYERS: Record<string, LayerDefinition> = {
  // Background layers
  land: {
    id: 'land',
    description:
      'Background layer for land/terrain. Sets the base color of the map.',
    type: 'background',
    paintProperties: [
      {
        property: 'background-color',
        description: 'Color of the land/background',
        example: '#f8f4f0'
      }
    ],
    examples: [
      'Create a dark mode map with black land',
      'Make the background beige'
    ]
  },

  // Water features
  water: {
    id: 'water',
    description: 'Fill layer for water bodies like oceans, lakes, and rivers',
    sourceLayer: 'water',
    type: 'fill',
    paintProperties: [
      {
        property: 'fill-color',
        description: 'Color of water bodies',
        example: '#73b6e6'
      },
      {
        property: 'fill-opacity',
        description: 'Opacity of water (0-1)',
        example: 1
      }
    ],
    examples: [
      'Change water to yellow',
      'Make oceans dark blue',
      'Set lakes to turquoise'
    ]
  },

  waterway: {
    id: 'waterway',
    description: 'Line layer for rivers, streams, and canals',
    sourceLayer: 'waterway',
    type: 'line',
    commonFilters: ['class: river|stream|canal'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of waterways',
        example: '#73b6e6'
      },
      {
        property: 'line-width',
        description: 'Width of waterway lines',
        example: ['interpolate', ['exponential', 1.3], ['zoom'], 8, 0.5, 20, 6]
      }
    ],
    examples: [
      'Highlight rivers in bright blue',
      'Make streams wider',
      'Show canals in green'
    ]
  },

  // Landuse and land cover
  parks: {
    id: 'landuse_park',
    description: 'Fill layer for parks, gardens, and green spaces',
    sourceLayer: 'landuse',
    type: 'fill',
    commonFilters: ['class: park|cemetery|golf_course'],
    paintProperties: [
      {
        property: 'fill-color',
        description: 'Color of parks and green spaces',
        example: '#d8e8c8'
      },
      {
        property: 'fill-opacity',
        description: 'Opacity of parks',
        example: 0.9
      }
    ],
    examples: [
      'Highlight parks in bright green',
      'Make parks darker',
      'Show golf courses in different shade'
    ]
  },

  buildings: {
    id: 'building',
    description: 'Fill or fill-extrusion layer for buildings',
    sourceLayer: 'building',
    type: 'fill',
    paintProperties: [
      {
        property: 'fill-color',
        description: 'Color of buildings',
        example: '#e0d8ce'
      },
      {
        property: 'fill-opacity',
        description: 'Opacity of buildings',
        example: ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 1]
      }
    ],
    examples: [
      'Show buildings in red',
      'Make buildings semi-transparent',
      'Hide buildings at low zoom'
    ]
  },

  building_3d: {
    id: 'building-3d',
    description: '3D extrusion layer for buildings',
    sourceLayer: 'building',
    type: 'fill-extrusion',
    paintProperties: [
      {
        property: 'fill-extrusion-color',
        description: 'Color of 3D buildings',
        example: '#e0d8ce'
      },
      {
        property: 'fill-extrusion-height',
        description: 'Height of buildings',
        example: ['get', 'height']
      },
      {
        property: 'fill-extrusion-base',
        description: 'Base height of buildings',
        example: ['get', 'min_height']
      }
    ],
    examples: [
      'Create 3D buildings',
      'Make buildings taller',
      'Color buildings by height'
    ]
  },

  // Transportation
  railways: {
    id: 'road-rail',
    description: 'Line layer for railway tracks and rail lines',
    sourceLayer: 'road',
    type: 'line',
    commonFilters: ['class: major_rail|minor_rail|service_rail'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of railway lines',
        example: '#bbb'
      },
      {
        property: 'line-width',
        description: 'Width of railway lines',
        example: ['interpolate', ['exponential', 1.5], ['zoom'], 14, 0.5, 20, 2]
      }
    ],
    layoutProperties: [
      {
        property: 'line-join',
        description: 'Line join style',
        example: 'round'
      }
    ],
    examples: [
      'Highlight railways in red',
      'Make train tracks thicker',
      'Show metro lines differently'
    ]
  },

  road: {
    id: 'road',
    description:
      'Generic road layer for custom filtering (toll roads, bridges, tunnels, bike lanes, etc.)',
    sourceLayer: 'road',
    type: 'line',
    commonFilters: [],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of roads',
        example: '#ccc'
      },
      {
        property: 'line-width',
        description: 'Width of road lines',
        example: 4
      },
      {
        property: 'line-opacity',
        description: 'Opacity of road lines',
        example: 1
      }
    ],
    layoutProperties: [],
    examples: [
      'Show toll roads with filter_properties: { toll: true }',
      'Show bridges with filter_properties: { structure: "bridge" }',
      'Show tunnels with filter_properties: { structure: "tunnel" }',
      'Show paved roads with filter_properties: { surface: "paved" }',
      'Show roads with bike lanes with filter_properties: { bike_lane: ["left", "right", "both"] }',
      'Show one-way roads with filter_properties: { oneway: "true" }',
      'Show restricted roads with filter_properties: { access: "restricted" }'
    ]
  },

  motorways: {
    id: 'road-motorway',
    description: 'Line layer for highways and motorways',
    sourceLayer: 'road',
    type: 'line',
    commonFilters: ['class: motorway|trunk'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of highways',
        example: '#fc8'
      },
      {
        property: 'line-width',
        description: 'Width of highway lines',
        example: ['interpolate', ['exponential', 1.5], ['zoom'], 5, 0.5, 18, 30]
      }
    ],
    examples: [
      'Make highways orange',
      'Widen motorways',
      'Highlight major roads'
    ]
  },

  primary_roads: {
    id: 'road-primary',
    description: 'Line layer for primary/main roads',
    sourceLayer: 'road',
    type: 'line',
    commonFilters: ['class: primary'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of primary roads',
        example: '#fea'
      },
      {
        property: 'line-width',
        description: 'Width of primary roads',
        example: ['interpolate', ['exponential', 1.5], ['zoom'], 5, 0.5, 18, 26]
      }
    ],
    examples: ['Color main roads yellow', 'Make primary roads prominent']
  },

  secondary_roads: {
    id: 'road-secondary',
    description: 'Line layer for secondary roads',
    sourceLayer: 'road',
    type: 'line',
    commonFilters: ['class: secondary|tertiary'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of secondary roads',
        example: '#fff'
      },
      {
        property: 'line-width',
        description: 'Width of secondary roads',
        example: [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          11,
          0.5,
          18,
          20
        ]
      }
    ],
    examples: ['Show secondary roads in gray', 'Make minor roads thinner']
  },

  streets: {
    id: 'road-street',
    description: 'Line layer for local streets',
    sourceLayer: 'road',
    type: 'line',
    commonFilters: ['class: street|street_limited|residential|service'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of streets',
        example: '#fff'
      },
      {
        property: 'line-width',
        description: 'Width of streets',
        example: [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          12,
          0.5,
          18,
          12
        ]
      }
    ],
    examples: [
      'Color residential streets',
      'Hide small streets',
      'Make local roads visible'
    ]
  },

  paths: {
    id: 'road-path',
    description: 'Line layer for pedestrian paths, footways, and trails',
    sourceLayer: 'road',
    type: 'line',
    commonFilters: ['class: path|pedestrian'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of paths',
        example: '#cba'
      },
      {
        property: 'line-width',
        description: 'Width of paths',
        example: ['interpolate', ['exponential', 1.5], ['zoom'], 15, 1, 18, 4]
      },
      {
        property: 'line-dasharray',
        description: 'Dash pattern for paths',
        example: [1, 1]
      }
    ],
    examples: [
      'Show walking paths as dotted lines',
      'Highlight hiking trails',
      'Color bike paths green'
    ]
  },

  tunnels: {
    id: 'tunnel',
    description: 'Line layers for roads in tunnels (with special styling)',
    sourceLayer: 'road',
    type: 'line',
    commonFilters: ['structure: tunnel'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of tunnel roads',
        example: '#fff'
      },
      {
        property: 'line-opacity',
        description: 'Opacity of tunnel roads (usually reduced)',
        example: 0.5
      },
      {
        property: 'line-dasharray',
        description: 'Dash pattern for tunnels',
        example: [0.4, 0.4]
      }
    ],
    examples: ['Make tunnels semi-transparent', 'Show tunnels as dashed lines']
  },

  bridges: {
    id: 'bridge',
    description: 'Line layers for roads on bridges (with special casing)',
    sourceLayer: 'road',
    type: 'line',
    commonFilters: ['structure: bridge'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of bridge roads',
        example: '#fff'
      },
      {
        property: 'line-width',
        description: 'Width of bridges (usually wider than regular roads)',
        example: ['interpolate', ['exponential', 1.5], ['zoom'], 12, 1, 18, 30]
      }
    ],
    examples: [
      'Highlight bridges',
      'Make bridge outlines thicker',
      'Color bridges differently'
    ]
  },

  airports: {
    id: 'aeroway',
    description: 'Fill and line layers for airport runways and taxiways',
    sourceLayer: 'aeroway',
    type: 'fill',
    paintProperties: [
      {
        property: 'fill-color',
        description: 'Color of airport areas',
        example: '#ddd'
      },
      {
        property: 'fill-opacity',
        description: 'Opacity of airport areas',
        example: 1
      }
    ],
    examples: [
      'Show airports in gray',
      'Highlight runways',
      'Make airport areas visible'
    ]
  },

  // Administrative boundaries
  country_boundaries: {
    id: 'admin-0-boundary',
    description:
      'Line layer for country/nation boundaries (from admin source-layer)',
    sourceLayer: 'admin',
    type: 'line',
    commonFilters: ['admin_level: 0', 'maritime: false', 'disputed: false'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of country borders',
        example: '#8b8aba'
      },
      {
        property: 'line-width',
        description: 'Width of country borders',
        example: ['interpolate', ['linear'], ['zoom'], 3, 0.5, 10, 2]
      },
      {
        property: 'line-dasharray',
        description: 'Dash pattern for disputed borders',
        example: [2, 2]
      }
    ],
    examples: [
      'Make country borders red',
      'Show disputed boundaries as dashed',
      'Thicken international borders'
    ]
  },

  state_boundaries: {
    id: 'admin-1-boundary',
    description:
      'Line layer for state/province boundaries (from admin source-layer)',
    sourceLayer: 'admin',
    type: 'line',
    commonFilters: ['admin_level: 1', 'maritime: false'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of state borders',
        example: '#9e9cab'
      },
      {
        property: 'line-width',
        description: 'Width of state borders',
        example: ['interpolate', ['linear'], ['zoom'], 3, 0.3, 10, 1.5]
      }
    ],
    examples: [
      'Show state boundaries',
      'Make province borders visible',
      'Color regional boundaries'
    ]
  },

  disputed_boundaries: {
    id: 'admin-disputed',
    description: 'Line layer for disputed boundaries',
    sourceLayer: 'admin',
    type: 'line',
    commonFilters: ['disputed: 1'],
    paintProperties: [
      {
        property: 'line-color',
        description: 'Color of disputed borders',
        example: '#ff0000'
      },
      {
        property: 'line-width',
        description: 'Width of disputed borders',
        example: 2
      },
      {
        property: 'line-dasharray',
        description: 'Dash pattern for disputed borders',
        example: [2, 4]
      }
    ],
    examples: ['Show disputed territories', 'Highlight contested borders']
  },

  // Labels
  place_labels: {
    id: 'place-label',
    description: 'Symbol layer for city, town, and place name labels',
    sourceLayer: 'place_label',
    type: 'symbol',
    commonFilters: ['class: settlement|city|town|village'],
    layoutProperties: [
      {
        property: 'text-field',
        description: 'Text to display',
        example: ['get', 'name']
      },
      {
        property: 'text-font',
        description: 'Font family',
        example: ['DIN Pro Medium', 'Arial Unicode MS Regular']
      },
      {
        property: 'text-size',
        description: 'Text size',
        example: ['interpolate', ['linear'], ['zoom'], 10, 12, 18, 24]
      }
    ],
    paintProperties: [
      {
        property: 'text-color',
        description: 'Color of place labels',
        example: '#333'
      },
      {
        property: 'text-halo-color',
        description: 'Color of text halo/outline',
        example: '#fff'
      },
      {
        property: 'text-halo-width',
        description: 'Width of text halo',
        example: 1.5
      }
    ],
    examples: [
      'Hide city names',
      'Make town labels larger',
      'Color place names blue'
    ]
  },

  road_labels: {
    id: 'road-label',
    description: 'Symbol layer for road name labels',
    sourceLayer: 'road',
    type: 'symbol',
    layoutProperties: [
      {
        property: 'symbol-placement',
        description: 'Label placement strategy',
        example: 'line'
      },
      {
        property: 'text-field',
        description: 'Road name text',
        example: ['get', 'name']
      },
      {
        property: 'text-font',
        description: 'Font for road names',
        example: ['DIN Pro Regular', 'Arial Unicode MS Regular']
      },
      {
        property: 'text-size',
        description: 'Size of road labels',
        example: 12
      },
      {
        property: 'text-rotation-alignment',
        description: 'Text rotation alignment',
        example: 'map'
      }
    ],
    paintProperties: [
      {
        property: 'text-color',
        description: 'Color of road labels',
        example: '#666'
      },
      {
        property: 'text-halo-color',
        description: 'Halo color for road labels',
        example: '#fff'
      }
    ],
    examples: [
      'Show street names',
      'Hide road labels',
      'Make road names bigger'
    ]
  },

  poi_labels: {
    id: 'poi-label',
    description: 'Symbol layer for points of interest (POI) labels',
    sourceLayer: 'poi_label',
    type: 'symbol',
    commonFilters: [],
    layoutProperties: [
      {
        property: 'text-field',
        description: 'POI name',
        example: ['get', 'name']
      },
      {
        property: 'icon-image',
        description: 'Icon for POI',
        example: ['get', 'maki']
      },
      {
        property: 'text-anchor',
        description: 'Text anchor position',
        example: 'top'
      }
    ],
    paintProperties: [
      {
        property: 'text-color',
        description: 'Color of POI labels',
        example: '#666'
      },
      {
        property: 'icon-opacity',
        description: 'Opacity of POI icons',
        example: 1
      }
    ],
    examples: [
      'Show restaurant names',
      'Hide POI labels',
      'Display park names in green'
    ]
  },

  transit: {
    id: 'transit',
    description: 'Symbol layer for transit stations and stops',
    sourceLayer: 'transit_stop_label',
    type: 'symbol',
    layoutProperties: [
      {
        property: 'text-field',
        description: 'Station name',
        example: ['get', 'name']
      },
      {
        property: 'icon-image',
        description: 'Transit icon',
        example: ['get', 'network']
      }
    ],
    paintProperties: [
      {
        property: 'text-color',
        description: 'Color of transit labels',
        example: '#4898ff'
      }
    ],
    examples: [
      'Show subway stations',
      'Highlight bus stops',
      'Display train stations prominently'
    ]
  }
};

// Helper function to get layer suggestions based on user input
export function getLayerSuggestions(userPrompt: string): string[] {
  const prompt = userPrompt.toLowerCase();
  const suggestions: string[] = [];

  Object.entries(MAPBOX_STYLE_LAYERS).forEach(([key, layer]) => {
    // Check if the prompt mentions this layer type
    const keywords = [
      key,
      layer.id,
      layer.sourceLayer,
      ...layer.examples.join(' ').toLowerCase().split(' ')
    ].filter(Boolean);

    if (keywords.some((keyword) => prompt.includes(keyword as string))) {
      suggestions.push(key);
    }
  });

  // Add specific keyword mappings
  if (
    prompt.includes('water') ||
    prompt.includes('ocean') ||
    prompt.includes('sea') ||
    prompt.includes('lake')
  ) {
    suggestions.push('water', 'waterway');
  }
  if (
    prompt.includes('park') ||
    prompt.includes('green') ||
    prompt.includes('garden')
  ) {
    suggestions.push('parks');
  }
  if (
    prompt.includes('railway') ||
    prompt.includes('train') ||
    prompt.includes('rail') ||
    prompt.includes('metro')
  ) {
    suggestions.push('railways');
  }
  if (
    prompt.includes('road') ||
    prompt.includes('street') ||
    prompt.includes('highway') ||
    prompt.includes('motorway')
  ) {
    suggestions.push(
      'motorways',
      'primary_roads',
      'secondary_roads',
      'streets'
    );
  }
  if (
    prompt.includes('building') ||
    prompt.includes('house') ||
    prompt.includes('3d')
  ) {
    suggestions.push('buildings', 'building_3d');
  }
  if (
    prompt.includes('label') ||
    prompt.includes('name') ||
    prompt.includes('text')
  ) {
    suggestions.push('place_labels', 'road_labels', 'poi_labels');
  }
  if (
    prompt.includes('country') ||
    prompt.includes('border') ||
    prompt.includes('boundary')
  ) {
    suggestions.push('country_boundaries', 'state_boundaries');
  }
  if (
    prompt.includes('transit') ||
    prompt.includes('subway') ||
    prompt.includes('bus') ||
    prompt.includes('station')
  ) {
    suggestions.push('transit');
  }

  return [...new Set(suggestions)];
}
