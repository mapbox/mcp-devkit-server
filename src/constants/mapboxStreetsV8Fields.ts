/**
 * Complete field definitions for Mapbox Streets v8 source layers
 * This provides all available properties for filtering
 */

export const STREETS_V8_FIELDS = {
  road: {
    class: {
      description: 'Road classification',
      values: [
        'motorway',
        'motorway_link',
        'trunk',
        'trunk_link',
        'primary',
        'primary_link',
        'secondary',
        'secondary_link',
        'tertiary',
        'tertiary_link',
        'street',
        'street_limited',
        'pedestrian',
        'construction',
        'track',
        'service',
        'ferry',
        'path',
        'golf',
        'level_crossing',
        'turning_circle',
        'roundabout',
        'mini_roundabout',
        'turning_loop',
        'traffic_signals',
        'major_rail',
        'minor_rail',
        'service_rail',
        'aerialway'
      ] as const
    },
    structure: {
      description: 'Physical structure',
      values: ['none', 'bridge', 'tunnel', 'ford'] as const
    },
    type: {
      description: 'Specific road type from OSM tags',
      values: [
        'steps',
        'corridor',
        'parking_aisle',
        'platform',
        'piste'
      ] as const
    },
    oneway: {
      description: 'One-way traffic',
      values: ['true', 'false'] as const
    },
    dual_carriageway: {
      description: 'Part of dual carriageway',
      values: ['true', 'false'] as const
    },
    surface: {
      description: 'Road surface',
      values: ['paved', 'unpaved'] as const
    },
    toll: {
      description: 'Toll road',
      values: ['true', 'false'] as const
    },
    layer: {
      description: 'Z-ordering layer (-5 to 5)',
      type: 'number' as const
    },
    lane_count: {
      description: 'Number of lanes',
      type: 'number' as const
    }
  },

  admin: {
    admin_level: {
      description: 'Administrative level',
      values: [0, 1, 2] as const // 0=country, 1=state/province, 2=county
    },
    disputed: {
      description: 'Disputed boundary',
      values: ['true', 'false'] as const
    },
    maritime: {
      description: 'Maritime boundary',
      values: ['true', 'false'] as const
    },
    worldview: {
      description: 'Worldview perspective',
      values: [
        'all',
        'CN',
        'IN',
        'US',
        'JP',
        'AR',
        'MA',
        'RS',
        'RU',
        'TR',
        'VN'
      ] as const
    }
  },

  landuse: {
    class: {
      description: 'Landuse classification',
      values: [
        'aboriginal_lands',
        'agriculture',
        'airport',
        'cemetery',
        'commercial_area',
        'facility',
        'glacier',
        'grass',
        'hospital',
        'industrial',
        'park',
        'parking',
        'piste',
        'pitch',
        'residential',
        'rock',
        'sand',
        'school',
        'scrub',
        'wood'
      ] as const
    }
  },

  landuse_overlay: {
    class: {
      description: 'Overlay classification',
      values: ['national_park', 'wetland', 'wetland_noveg'] as const
    }
  },

  building: {
    extrude: {
      description: 'Should be extruded in 3D',
      values: ['true', 'false'] as const
    },
    underground: {
      description: 'Underground building',
      values: ['true', 'false'] as const
    },
    height: {
      description: 'Building height',
      type: 'number' as const
    },
    min_height: {
      description: 'Building base height',
      type: 'number' as const
    }
  },

  water: {
    // Water has no filterable fields
  },

  waterway: {
    class: {
      description: 'Waterway classification',
      values: [
        'river',
        'canal',
        'stream',
        'stream_intermittent',
        'ditch',
        'drain'
      ] as const
    },
    type: {
      description: 'Waterway type',
      values: ['river', 'canal', 'stream', 'ditch', 'drain'] as const
    }
  },

  aeroway: {
    type: {
      description: 'Aeroway type',
      values: ['runway', 'taxiway', 'apron', 'helipad'] as const
    }
  },

  place_label: {
    class: {
      description: 'Place classification',
      values: [
        'country',
        'state',
        'settlement',
        'settlement_subdivision'
      ] as const
    },
    capital: {
      description: 'Capital admin level',
      values: [2, 3, 4, 5, 6] as const
    },
    filterrank: {
      description: 'Priority for label density',
      type: 'number' as const // 0-5
    },
    symbolrank: {
      description: 'Symbol ranking',
      type: 'number' as const
    }
  },

  poi_label: {
    class: {
      description: 'POI thematic grouping',
      type: 'string' as const
    },
    filterrank: {
      description: 'Priority for label density',
      type: 'number' as const // 0-5
    },
    maki: {
      description: 'Icon to use (e.g., airport, hospital, restaurant, park)',
      type: 'string' as const
    }
  },

  natural_label: {
    class: {
      description: 'Natural feature classification',
      values: [
        'glacier',
        'landform',
        'water_feature',
        'wetland',
        'ocean',
        'sea',
        'river',
        'water',
        'reservoir',
        'dock',
        'canal',
        'drain',
        'ditch',
        'stream',
        'continent'
      ] as const
    },
    elevation_m: {
      description: 'Elevation in meters',
      type: 'number' as const
    }
  },

  transit_stop_label: {
    mode: {
      description: 'Transit mode',
      values: [
        'rail',
        'metro_rail',
        'light_rail',
        'tram',
        'bus',
        'monorail',
        'funicular',
        'bicycle',
        'ferry',
        'narrow_gauge',
        'preserved',
        'miniature'
      ] as const
    },
    maki: {
      description: 'Icon type (visual representation of transit type)',
      values: [
        'rail',
        'rail-metro',
        'rail-light',
        'entrance',
        'bus',
        'bicycle-share',
        'ferry'
      ] as const
    }
  },

  airport_label: {
    class: {
      description: 'Airport classification',
      values: ['military', 'civil'] as const
    },
    maki: {
      description: 'Icon type (visual representation)',
      values: ['airport', 'heliport', 'rocket'] as const
    }
  }
} as const;

export type SourceLayer = keyof typeof STREETS_V8_FIELDS;
export type FieldValues<
  L extends SourceLayer,
  F extends keyof (typeof STREETS_V8_FIELDS)[L]
> = (typeof STREETS_V8_FIELDS)[L][F] extends { values: readonly any[] }
  ? (typeof STREETS_V8_FIELDS)[L][F]['values'][number]
  : any;
