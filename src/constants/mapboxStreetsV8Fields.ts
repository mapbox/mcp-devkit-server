/**
 * Complete Mapbox Streets v8 source layer field definitions
 * Extracted from actual Streets v8 tileset data
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 */

// Common field that appears identically in 13 layers
const ISO_3166_1_FIELD = {
  values: [
    'EG',
    'ET',
    'CD',
    'ZA',
    'TZ',
    'KE',
    'SD',
    'UG',
    'MA',
    'DZ',
    'GH',
    'CI',
    'CM',
    'MG',
    'MZ',
    'NG',
    'NE',
    'BF',
    'MW',
    'ML',
    'TD',
    'SN',
    'AO',
    'ZW',
    'CN',
    'IN',
    'ID',
    'PK',
    'BD',
    'RU',
    'JP',
    'PH',
    'VN',
    'TR',
    'IR',
    'TH',
    'MM',
    'KR',
    'IQ',
    'AF',
    'MY',
    'NP',
    'DE',
    'FR',
    'GB',
    'IT',
    'ES',
    'UA',
    'PL',
    'RO',
    'NL',
    'GR',
    'HR',
    'BE',
    'PT',
    'CZ',
    'HU',
    'BY',
    'SE',
    'AT',
    'CH',
    'BG',
    'RS',
    'DK',
    'FI',
    'US',
    'MX',
    'CA',
    'GT',
    'CU',
    'HT',
    'DO',
    'HN',
    'NI',
    'SV',
    'CR',
    'PR',
    'PA',
    'JM',
    'TT',
    'GP',
    'MQ',
    'AU',
    'PG',
    'NZ',
    'FJ',
    'MU',
    'RE',
    'MV',
    'SC',
    'BR',
    'CO',
    'AR',
    'PE',
    'VE',
    'CL',
    'EC',
    'BO',
    'PY',
    'UY'
  ] as const
} as const;

const ISO_3166_2_FIELD = {
  values: [] as const // string
} as const;

export const STREETS_V8_FIELDS = {
  // ============ landuse ============
  landuse: {
    class: {
      description: 'class field',
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
    },
    type: {
      description: 'type field',
      values: [
        'wood',
        'farmland',
        'forest',
        'grass',
        'meadow',
        'scrub',
        'parking',
        'surface',
        'park',
        'farmyard',
        'orchard',
        'grassland',
        'garden',
        'school',
        'soccer',
        'vineyard',
        'playground',
        'tennis',
        'bare_rock',
        'allotments',
        'pitch',
        'heath',
        'baseball',
        'bunker',
        'quarry',
        'beach',
        'basketball',
        'scree',
        'village_green',
        'recreation_ground',
        'sports_centre',
        'common',
        'christian',
        'tee',
        'sand',
        'green',
        'multi',
        'hospital',
        'greenhouse_horticulture',
        'glacier',
        'fairway',
        'farm',
        'golf_course',
        'camp_site',
        'university',
        'college',
        'plant_nursery',
        'equestrian',
        'fell',
        'beachvolleyball',
        'volleyball',
        'american_football',
        'athletics',
        'caravan_site',
        'rock',
        'muslim',
        'skateboard',
        'wetland',
        'bowls',
        'picnic_site',
        'boules',
        'cricket',
        'dog_park',
        'running',
        'conservation',
        'track',
        'netball',
        'underground',
        'lane',
        'rugby_union',
        'zoo',
        'hockey',
        'shooting',
        'downhill',
        'jewish',
        'field',
        'football',
        'table_tennis',
        'handball',
        'rough',
        'field_hockey',
        'team_handball',
        'carports',
        'pelota',
        'rugby',
        'paddle_tennis',
        'archery',
        'horse_racing',
        'gaelic_games',
        'softball',
        'golf',
        'ice_hockey',
        'basin',
        'coastline',
        'badminton',
        'driving_range',
        'bog',
        'cricket_nets',
        'swimming',
        'futsal'
      ] as const
    }
  },

  // ============ waterway ============
  waterway: {
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    class: {
      description: 'class field',
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
      description: 'type field',
      values: ['river', 'canal', 'stream', 'ditch', 'drain'] as const
    }
  },

  // ============ water ============
  water: {},

  // ============ aeroway ============
  aeroway: {
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    type: {
      description: 'type field',
      values: ['runway', 'taxiway', 'apron', 'helipad'] as const
    },
    ref: {
      description: 'ref field',
      values: [] as const // string
    }
  },

  // ============ structure ============
  structure: {
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    class: {
      description: 'class field',
      values: [
        'cliff',
        'crosswalk',
        'entrance',
        'fence',
        'gate',
        'hedge',
        'land'
      ] as const
    },
    type: {
      description: 'type field',
      values: [
        'bollard',
        'breakwater',
        'bridge',
        'city_wall',
        'cliff',
        'crosswalk',
        'earth_bank',
        'entrance',
        'fence',
        'gate',
        'hedge',
        'home',
        'kissing_gate',
        'lift_gate',
        'main',
        'pier',
        'retaining_wall',
        'sliding_gate',
        'spikes',
        'staircase',
        'swing_gate',
        'wall',
        'wire_fence',
        'yes'
      ] as const
    }
  },

  // ============ building ============
  building: {
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    extrude: {
      description: 'extrude field',
      values: ['true', 'false'] as const
    },
    building_id: {
      description: 'building_id field',
      values: [] as const // number - Range: 0 to 100000000000
    },
    height: {
      description: 'height field',
      values: [] as const // number - Range: 0 to 1500
    },
    min_height: {
      description: 'min_height field',
      values: [] as const // number - Range: 0 to 1500
    },
    type: {
      description: 'type field',
      values: [
        'building',
        'house',
        'residential',
        'garage',
        'apartments',
        'industrial',
        'hut',
        'detached',
        'shed',
        'roof',
        'commercial',
        'terrace',
        'garages',
        'school',
        'building:part',
        'retail',
        'construction',
        'greenhouse',
        'barn',
        'farm_auxiliary',
        'church',
        'warehouse',
        'service',
        'farm',
        'civic',
        'cabin',
        'manufacture',
        'university',
        'office',
        'static_caravan',
        'hangar',
        'public',
        'collapsed',
        'hospital',
        'semidetached_house',
        'hotel',
        'bungalow',
        'chapel',
        'ger',
        'kindergarten',
        'ruins',
        'parking',
        'storage_tank',
        'dormitory',
        'mosque',
        'commercial;residential',
        'transportation',
        'stable',
        'train_station',
        'damaged',
        'college',
        'semi',
        'transformer_tower',
        'houseboat',
        'trullo',
        'bunker',
        'station',
        'slurry_tank',
        'shop',
        'cowshed',
        'silo',
        'supermarket',
        'pajaru',
        'terminal',
        'carport',
        'residence',
        'dam',
        'temple',
        'duplex',
        'factory',
        'agricultural',
        'constructie',
        'allotment_house',
        'chalet',
        'kiosk',
        'tower',
        'tank',
        'shelter',
        'dwelling_house',
        'pavilion',
        'grandstand',
        'Residence',
        'ruin',
        'boathouse',
        'store',
        'summer_cottage',
        'mobile_home',
        'government_office',
        'outbuilding',
        'beach_hut',
        'pub',
        'glasshouse',
        'apartment',
        'storage',
        'community_group_office',
        'clinic',
        'residences',
        'cathedral',
        'bangunan',
        'semi-detached'
      ] as const
    },
    underground: {
      description: 'underground field',
      values: ['true', 'false'] as const
    }
  },

  // ============ landuse_overlay ============
  landuse_overlay: {
    class: {
      description: 'class field',
      values: ['national_park', 'wetland', 'wetland_noveg'] as const
    },
    type: {
      description: 'type field',
      values: [
        'wetland',
        'bog',
        'basin',
        'marsh',
        'swamp',
        'nature_reserve',
        'protected_area',
        'reedbed',
        'wet_meadow',
        'tidalflat',
        'mangrove',
        'mud',
        'saltmarsh',
        'national_park',
        'string_bog',
        'saltern',
        'fen',
        'palsa_bog',
        'tundra_pond',
        'peat_bog',
        'reed',
        'raised_bog',
        'reef'
      ] as const
    },
    name: {
      description: 'name field',
      values: [] as const // string
    },
    name_de: {
      description: 'name_de field',
      values: [] as const // string
    },
    name_en: {
      description: 'name_en field',
      values: [] as const // string
    },
    name_es: {
      description: 'name_es field',
      values: [] as const // string
    },
    name_fr: {
      description: 'name_fr field',
      values: [] as const // string
    },
    name_ru: {
      description: 'name_ru field',
      values: [] as const // string
    },
    'name_zh-Hant': {
      description: 'name_zh-Hant field',
      values: [] as const // string
    },
    'name_zh-Hans': {
      description: 'name_zh-Hans field',
      values: [] as const // string
    },
    name_pt: {
      description: 'name_pt field',
      values: [] as const // string
    },
    name_ar: {
      description: 'name_ar field',
      values: [] as const // string
    },
    name_vi: {
      description: 'name_vi field',
      values: [] as const // string
    },
    name_it: {
      description: 'name_it field',
      values: [] as const // string
    },
    name_ja: {
      description: 'name_ja field',
      values: [] as const // string
    },
    name_ko: {
      description: 'name_ko field',
      values: [] as const // string
    }
  },

  // ============ road ============
  road: {
    name: {
      description: 'name field',
      values: [] as const // string
    },
    name_de: {
      description: 'name_de field',
      values: [] as const // string
    },
    name_en: {
      description: 'name_en field',
      values: [] as const // string
    },
    name_es: {
      description: 'name_es field',
      values: [] as const // string
    },
    name_fr: {
      description: 'name_fr field',
      values: [] as const // string
    },
    name_ru: {
      description: 'name_ru field',
      values: [] as const // string
    },
    'name_zh-Hant': {
      description: 'name_zh-Hant field',
      values: [] as const // string
    },
    'name_zh-Hans': {
      description: 'name_zh-Hans field',
      values: [] as const // string
    },
    name_pt: {
      description: 'name_pt field',
      values: [] as const // string
    },
    name_ar: {
      description: 'name_ar field',
      values: [] as const // string
    },
    name_vi: {
      description: 'name_vi field',
      values: [] as const // string
    },
    name_it: {
      description: 'name_it field',
      values: [] as const // string
    },
    name_ja: {
      description: 'name_ja field',
      values: [] as const // string
    },
    name_ko: {
      description: 'name_ko field',
      values: [] as const // string
    },
    name_script: {
      description: 'name_script field',
      values: [
        'Arabic',
        'Armenian',
        'Bengali',
        'Bopomofo',
        'Canadian_Aboriginal',
        'Common',
        'Cyrillic',
        'Devanagari',
        'Ethiopic',
        'Georgian',
        'Glagolitic',
        'Greek',
        'Gujarati',
        'Gurmukhi',
        'Han',
        'Hangul',
        'Hebrew',
        'Hiragana',
        'Kannada',
        'Katakana',
        'Khmer',
        'Lao',
        'Latin',
        'Malayalam',
        'Mongolian',
        'Myanmar',
        'Nko',
        'Sinhala',
        'Syriac',
        'Tamil',
        'Telugu',
        'Thaana',
        'Thai',
        'Tibetan',
        'Tifinagh',
        'Unknown'
      ] as const
    },
    oneway: {
      description: 'oneway field',
      values: ['true', 'false'] as const
    },
    bike_lane: {
      description: 'bike_lane field',
      values: ['left', 'right', 'both', 'no', 'yes'] as const
    },
    layer: {
      description: 'layer field',
      values: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] as const
    },
    access: {
      description: 'access field',
      values: ['restricted'] as const
    },
    dual_carriageway: {
      description: 'dual_carriageway field',
      values: ['true', 'false'] as const
    },
    structure: {
      description: 'structure field',
      values: ['none', 'bridge', 'tunnel', 'ford'] as const
    },
    surface: {
      description: 'surface field',
      values: ['paved', 'unpaved'] as const
    },
    len: {
      description: 'len field',
      values: [] as const // number - Range: 0 to 99999
    },
    ref: {
      description: 'ref field',
      values: [] as const // string
    },
    reflen: {
      description: 'reflen field',
      values: [] as const // number - Range: 0 to 250
    },
    shield: {
      description: 'shield field',
      values: [
        'default',
        'rectangle-white',
        'rectangle-red',
        'rectangle-yellow',
        'rectangle-green',
        'rectangle-blue',
        'circle-white',
        'ae-national',
        'ae-d-route',
        'ae-f-route',
        'ae-s-route',
        'au-national-highway',
        'au-national-route',
        'au-state',
        'au-tourist',
        'br-federal',
        'br-state',
        'ch-motorway',
        'cn-nths-expy',
        'cn-provincial-expy',
        'de-motorway',
        'gr-motorway',
        'hk-strategic-route',
        'hr-motorway',
        'hu-motorway',
        'hu-main',
        'in-national',
        'in-state',
        'kr-natl-expy',
        'kr-natl-hwy',
        'kr-metro-expy',
        'kr-metropolitan',
        'kr-local',
        'mx-federal',
        'mx-state',
        'nz-state',
        'pe-national',
        'pe-regional',
        'ro-national',
        'ro-county',
        'ro-communal',
        'si-motorway',
        'tw-national',
        'tw-provincial-expy',
        'tw-provincial',
        'tw-county-township',
        'us-interstate',
        'us-interstate-duplex',
        'us-interstate-business',
        'us-interstate-truck',
        'us-highway',
        'us-highway-duplex',
        'us-highway-alternate',
        'us-highway-business',
        'us-highway-bypass',
        'us-highway-truck',
        'us-bia',
        'za-national',
        'za-provincial'
      ] as const
    },
    shield_beta: {
      description: 'shield_beta field',
      values: [
        'default',
        'rectangle-white',
        'rectangle-red',
        'rectangle-yellow',
        'rectangle-green',
        'rectangle-blue',
        'circle-white',
        'ae-national',
        'ae-d-route',
        'ae-f-route',
        'ae-s-route',
        'au-national-highway',
        'au-national-route',
        'au-state',
        'au-tourist',
        'br-federal',
        'br-state',
        'ch-motorway',
        'cn-nths-expy',
        'cn-provincial-expy',
        'de-motorway',
        'gr-motorway',
        'hk-strategic-route',
        'hr-motorway',
        'hu-motorway',
        'hu-main',
        'in-national',
        'in-state',
        'kr-natl-expy',
        'kr-natl-hwy',
        'kr-metro-expy',
        'kr-metropolitan',
        'kr-local',
        'mx-federal',
        'mx-state',
        'nz-state',
        'pe-national',
        'pe-regional',
        'ro-national',
        'ro-county',
        'ro-communal',
        'si-motorway',
        'tw-national',
        'tw-provincial-expy',
        'tw-provincial',
        'tw-county-township',
        'us-interstate',
        'us-interstate-duplex',
        'us-interstate-business',
        'us-interstate-truck',
        'us-highway',
        'us-highway-duplex',
        'us-highway-alternate',
        'us-highway-business',
        'us-highway-bypass',
        'us-highway-truck',
        'us-bia',
        'za-national',
        'za-provincial',
        'al-motorway',
        'ar-national',
        'cl-highway',
        'co-national',
        'cy-motorway',
        'il-highway-black',
        'il-highway-blue',
        'il-highway-green',
        'il-highway-red',
        'it-motorway',
        'md-local',
        'md-main',
        'my-expressway',
        'my-federal',
        'nz-urban',
        'ph-expressway',
        'ph-primary',
        'qa-main',
        'sa-highway',
        'th-highway',
        'th-motorway-toll',
        'tr-motorway'
      ] as const
    },
    shield_text_color: {
      description: 'shield_text_color field',
      values: ['black', 'blue', 'white', 'yellow', 'orange'] as const
    },
    shield_text_color_beta: {
      description: 'shield_text_color_beta field',
      values: ['black', 'blue', 'white', 'yellow', 'red', 'green'] as const
    },
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    class: {
      description: 'class field',
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
        'level_crossing',
        'street',
        'street_limited',
        'pedestrian',
        'construction',
        'track',
        'service',
        'ferry',
        'path',
        'major_rail',
        'minor_rail',
        'service_rail',
        'aerialway',
        'golf',
        'turning_circle',
        'roundabout',
        'mini_roundabout',
        'turning_loop',
        'traffic_signals',
        'intersection'
      ] as const
    },
    type: {
      description: 'type field',
      values: [
        'motorway',
        'motorway_link',
        'trunk',
        'primary',
        'secondary',
        'tertiary',
        'trunk_link',
        'primary_link',
        'secondary_link',
        'tertiary_link',
        'residential',
        'unclassified',
        'road',
        'living_street',
        'level_crossing',
        'raceway',
        'pedestrian',
        'platform',
        'construction:motorway',
        'construction:motorway_link',
        'construction:trunk',
        'construction:trunk_link',
        'construction:primary',
        'construction:primary_link',
        'construction:secondary',
        'construction:secondary_link',
        'construction:tertiary',
        'construction:tertiary_link',
        'construction:unclassified',
        'construction:residential',
        'construction:road',
        'construction:living_street',
        'construction:pedestrian',
        'construction',
        'track:grade1',
        'track:grade2',
        'track:grade3',
        'track:grade4',
        'track:grade5',
        'track',
        'service:alley',
        'service:emergency_access',
        'service:drive_through',
        'service:driveway',
        'service:parking_aisle',
        'service',
        'ferry',
        'ferry_auto',
        'steps',
        'corridor',
        'sidewalk',
        'crossing',
        'piste',
        'mountain_bike',
        'hiking',
        'trail',
        'cycleway',
        'footway',
        'path',
        'bridleway',
        'rail',
        'subway',
        'narrow_gauge',
        'funicular',
        'light_rail',
        'miniature',
        'monorail',
        'preserved',
        'tram',
        'aerialway:cable_car',
        'aerialway:gondola',
        'aerialway:mixed_lift',
        'aerialway:chair_lift',
        'aerialway:drag_lift',
        'aerialway:magic_carpet',
        'aerialway',
        'hole',
        'turning_circle',
        'mini_roundabout',
        'traffic_signals'
      ] as const
    },
    toll: {
      description: 'toll field',
      values: ['true'] as const
    },
    lane_count: {
      description: 'lane_count field',
      values: [] as const // number - Range: 0 to 20
    }
  },

  // ============ admin ============
  admin: {
    admin_level: {
      description: 'admin_level field',
      values: [0, 1, 2] as const
    },
    disputed: {
      description: 'disputed field',
      values: ['true', 'false'] as const
    },
    iso_3166_1: ISO_3166_1_FIELD,
    maritime: {
      description: 'maritime field',
      values: ['true', 'false'] as const
    },
    worldview: {
      description: 'worldview field',
      values: ['JP', 'CN', 'IN', 'US', 'all'] as const
    }
  },

  // ============ place_label ============
  place_label: {
    class: {
      description: 'class field',
      values: [
        'country',
        'disputed_country',
        'state',
        'disputed_state',
        'settlement',
        'settlement_subdivision'
      ] as const
    },
    abbr: {
      description: 'abbr field',
      values: [] as const // string
    },
    name: {
      description: 'name field',
      values: [] as const // string
    },
    name_de: {
      description: 'name_de field',
      values: [] as const // string
    },
    name_en: {
      description: 'name_en field',
      values: [] as const // string
    },
    name_es: {
      description: 'name_es field',
      values: [] as const // string
    },
    name_fr: {
      description: 'name_fr field',
      values: [] as const // string
    },
    name_ru: {
      description: 'name_ru field',
      values: [] as const // string
    },
    'name_zh-Hant': {
      description: 'name_zh-Hant field',
      values: [] as const // string
    },
    'name_zh-Hans': {
      description: 'name_zh-Hans field',
      values: [] as const // string
    },
    name_pt: {
      description: 'name_pt field',
      values: [] as const // string
    },
    name_ar: {
      description: 'name_ar field',
      values: [] as const // string
    },
    name_vi: {
      description: 'name_vi field',
      values: [] as const // string
    },
    name_it: {
      description: 'name_it field',
      values: [] as const // string
    },
    name_ja: {
      description: 'name_ja field',
      values: [] as const // string
    },
    name_ko: {
      description: 'name_ko field',
      values: [] as const // string
    },
    name_script: {
      description: 'name_script field',
      values: [
        'Arabic',
        'Armenian',
        'Bengali',
        'Bopomofo',
        'Canadian_Aboriginal',
        'Common',
        'Cyrillic',
        'Devanagari',
        'Ethiopic',
        'Georgian',
        'Glagolitic',
        'Greek',
        'Gujarati',
        'Gurmukhi',
        'Han',
        'Hangul',
        'Hebrew',
        'Hiragana',
        'Kannada',
        'Katakana',
        'Khmer',
        'Lao',
        'Latin',
        'Malayalam',
        'Mongolian',
        'Myanmar',
        'Nko',
        'Sinhala',
        'Syriac',
        'Tamil',
        'Telugu',
        'Thaana',
        'Thai',
        'Tibetan',
        'Tifinagh',
        'Unknown'
      ] as const
    },
    filterrank: {
      description: 'filterrank field',
      values: [0, 1, 2, 3, 4, 5] as const
    },
    capital: {
      description: 'capital field',
      values: [2, 3, 4, 5, 6] as const
    },
    text_anchor: {
      description: 'text_anchor field',
      values: [
        'left',
        'right',
        'top',
        'top-left',
        'top-right',
        'bottom',
        'bottom-left',
        'bottom-right'
      ] as const
    },
    symbolrank: {
      description: 'symbolrank field',
      values: [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
      ] as const
    },
    type: {
      description: 'type field',
      values: [
        'country',
        'territory',
        'sar',
        'disputed_territory',
        'state',
        'city',
        'town',
        'village',
        'hamlet',
        'suburb',
        'neighbourhood',
        'quarter'
      ] as const
    },
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    worldview: {
      description: 'worldview field',
      values: ['JP', 'CN', 'IN', 'US', 'all'] as const
    }
  },

  // ============ airport_label ============
  airport_label: {
    class: {
      description: 'class field',
      values: ['military', 'civil'] as const
    },
    name: {
      description: 'name field',
      values: [] as const // string
    },
    name_de: {
      description: 'name_de field',
      values: [] as const // string
    },
    name_en: {
      description: 'name_en field',
      values: [] as const // string
    },
    name_es: {
      description: 'name_es field',
      values: [] as const // string
    },
    name_fr: {
      description: 'name_fr field',
      values: [] as const // string
    },
    name_ru: {
      description: 'name_ru field',
      values: [] as const // string
    },
    'name_zh-Hant': {
      description: 'name_zh-Hant field',
      values: [] as const // string
    },
    'name_zh-Hans': {
      description: 'name_zh-Hans field',
      values: [] as const // string
    },
    name_pt: {
      description: 'name_pt field',
      values: [] as const // string
    },
    name_ar: {
      description: 'name_ar field',
      values: [] as const // string
    },
    name_vi: {
      description: 'name_vi field',
      values: [] as const // string
    },
    name_it: {
      description: 'name_it field',
      values: [] as const // string
    },
    name_ja: {
      description: 'name_ja field',
      values: [] as const // string
    },
    name_ko: {
      description: 'name_ko field',
      values: [] as const // string
    },
    name_script: {
      description: 'name_script field',
      values: [
        'Arabic',
        'Armenian',
        'Bengali',
        'Bopomofo',
        'Canadian_Aboriginal',
        'Common',
        'Cyrillic',
        'Devanagari',
        'Ethiopic',
        'Georgian',
        'Glagolitic',
        'Greek',
        'Gujarati',
        'Gurmukhi',
        'Han',
        'Hangul',
        'Hebrew',
        'Hiragana',
        'Kannada',
        'Katakana',
        'Khmer',
        'Lao',
        'Latin',
        'Malayalam',
        'Mongolian',
        'Myanmar',
        'Nko',
        'Sinhala',
        'Syriac',
        'Tamil',
        'Telugu',
        'Thaana',
        'Thai',
        'Tibetan',
        'Tifinagh',
        'Unknown'
      ] as const
    },
    maki: {
      description: 'maki field',
      values: ['airport', 'heliport', 'rocket', 'airfield'] as const
    },
    ref: {
      description: 'ref field',
      values: [] as const // string
    },
    sizerank: {
      description: 'sizerank field',
      values: [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
      ] as const
    },
    worldview: {
      description: 'worldview field',
      values: ['JP', 'CN', 'IN', 'US', 'all'] as const
    },
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD
  },

  // ============ transit_stop_label ============
  transit_stop_label: {
    name: {
      description: 'name field',
      values: [] as const // string
    },
    name_de: {
      description: 'name_de field',
      values: [] as const // string
    },
    name_en: {
      description: 'name_en field',
      values: [] as const // string
    },
    name_es: {
      description: 'name_es field',
      values: [] as const // string
    },
    name_fr: {
      description: 'name_fr field',
      values: [] as const // string
    },
    name_ru: {
      description: 'name_ru field',
      values: [] as const // string
    },
    'name_zh-Hant': {
      description: 'name_zh-Hant field',
      values: [] as const // string
    },
    'name_zh-Hans': {
      description: 'name_zh-Hans field',
      values: [] as const // string
    },
    name_pt: {
      description: 'name_pt field',
      values: [] as const // string
    },
    name_ar: {
      description: 'name_ar field',
      values: [] as const // string
    },
    name_vi: {
      description: 'name_vi field',
      values: [] as const // string
    },
    name_it: {
      description: 'name_it field',
      values: [] as const // string
    },
    name_ja: {
      description: 'name_ja field',
      values: [] as const // string
    },
    name_ko: {
      description: 'name_ko field',
      values: [] as const // string
    },
    name_script: {
      description: 'name_script field',
      values: [
        'Arabic',
        'Armenian',
        'Bengali',
        'Bopomofo',
        'Canadian_Aboriginal',
        'Common',
        'Cyrillic',
        'Devanagari',
        'Ethiopic',
        'Georgian',
        'Glagolitic',
        'Greek',
        'Gujarati',
        'Gurmukhi',
        'Han',
        'Hangul',
        'Hebrew',
        'Hiragana',
        'Kannada',
        'Katakana',
        'Khmer',
        'Lao',
        'Latin',
        'Malayalam',
        'Mongolian',
        'Myanmar',
        'Nko',
        'Sinhala',
        'Syriac',
        'Tamil',
        'Telugu',
        'Thaana',
        'Thai',
        'Tibetan',
        'Tifinagh',
        'Unknown'
      ] as const
    },
    mode: {
      description: 'mode field',
      values: [
        'metro_rail',
        'rail',
        'light_rail',
        'tram',
        'monorail',
        'funicular',
        'bicycle',
        'bus',
        'ferry',
        'narrow_gauge',
        'preserved',
        'miniature'
      ] as const
    },
    stop_type: {
      description: 'stop_type field',
      values: ['stop', 'station', 'entrance'] as const
    },
    maki: {
      description: 'maki field',
      values: [
        'bus',
        'rail',
        'rail-light',
        'entrance',
        'ferry',
        'bicycle-share',
        'rail-metro'
      ] as const
    },
    network: {
      description: 'network field',
      values: [
        'barcelona-metro',
        'boston-t',
        'chongqing-rail-transit',
        'de-s-bahn',
        'de-s-bahn.de-u-bahn',
        'de-u-bahn',
        'delhi-metro',
        'gb-national-rail',
        'gb-national-rail.london-dlr',
        'gb-national-rail.london-dlr.london-overground.london-tfl-rail.london-underground',
        'gb-national-rail.london-dlr.london-overground.london-underground',
        'gb-national-rail.london-dlr.london-underground',
        'gb-national-rail.london-overground',
        'gb-national-rail.london-overground.london-underground',
        'gb-national-rail.london-overground.london-tfl-rail.london-underground',
        'gb-national-rail.london-tfl-rail',
        'gb-national-rail.london-tfl-rail.london-overground',
        'gb-national-rail.london-tfl-rail.london-underground',
        'gb-national-rail.london-underground',
        'hong-kong-mtr',
        'kiev-metro',
        'london-dlr',
        'london-dlr.london-tfl-rail',
        'london-dlr.london-tfl-rail.london-underground',
        'london-dlr.london-underground',
        'london-overground',
        'london-overground.london-tfl-rail',
        'london-overground.london-tfl-rail.london-underground',
        'london-overground.london-underground',
        'london-tfl-rail',
        'london-tfl-rail.london-underground',
        'london-underground',
        'madrid-metro',
        'mexico-city-metro',
        'milan-metro',
        'moscow-metro',
        'new-york-subway',
        'osaka-subway',
        'oslo-metro',
        'paris-metro',
        'paris-metro.paris-rer',
        'paris-rer',
        'paris-rer.paris-transilien',
        'paris-transilien',
        'philadelphia-septa',
        'san-francisco-bart',
        'singapore-mrt',
        'stockholm-metro',
        'taipei-metro',
        'tokyo-metro',
        'vienna-u-bahn',
        'washington-metro',
        'rail',
        'rail-metro',
        'rail-light',
        'entrance',
        'bus',
        'ferry',
        'bicycle-share'
      ] as const
    },
    network_beta: {
      description: 'network_beta field',
      values: [
        'jp-shinkansen',
        'jp-shinkansen.jp-jr',
        'jp-shinkansen.tokyo-metro',
        'jp-shinkansen.osaka-subway',
        'jp-shinkansen.jp-jr.tokyo-metro',
        'jp-shinkansen.jp-jr.osaka-subway',
        'jp-jr',
        'jp-jr.tokyo-metro',
        'jp-jr.osaka-subway'
      ] as const
    },
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    filterrank: {
      description: 'filterrank field',
      values: [0, 1, 2, 3, 4, 5] as const
    }
  },

  // ============ natural_label ============
  natural_label: {
    name: {
      description: 'name field',
      values: [] as const // string
    },
    name_de: {
      description: 'name_de field',
      values: [] as const // string
    },
    name_en: {
      description: 'name_en field',
      values: [] as const // string
    },
    name_es: {
      description: 'name_es field',
      values: [] as const // string
    },
    name_fr: {
      description: 'name_fr field',
      values: [] as const // string
    },
    name_ru: {
      description: 'name_ru field',
      values: [] as const // string
    },
    'name_zh-Hant': {
      description: 'name_zh-Hant field',
      values: [] as const // string
    },
    'name_zh-Hans': {
      description: 'name_zh-Hans field',
      values: [] as const // string
    },
    name_pt: {
      description: 'name_pt field',
      values: [] as const // string
    },
    name_ar: {
      description: 'name_ar field',
      values: [] as const // string
    },
    name_vi: {
      description: 'name_vi field',
      values: [] as const // string
    },
    name_it: {
      description: 'name_it field',
      values: [] as const // string
    },
    name_ja: {
      description: 'name_ja field',
      values: [] as const // string
    },
    name_ko: {
      description: 'name_ko field',
      values: [] as const // string
    },
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    name_script: {
      description: 'name_script field',
      values: [
        'Arabic',
        'Armenian',
        'Bengali',
        'Bopomofo',
        'Canadian_Aboriginal',
        'Common',
        'Cyrillic',
        'Devanagari',
        'Ethiopic',
        'Georgian',
        'Glagolitic',
        'Greek',
        'Gujarati',
        'Gurmukhi',
        'Han',
        'Hangul',
        'Hebrew',
        'Hiragana',
        'Kannada',
        'Katakana',
        'Khmer',
        'Lao',
        'Latin',
        'Malayalam',
        'Mongolian',
        'Myanmar',
        'Nko',
        'Sinhala',
        'Syriac',
        'Tamil',
        'Telugu',
        'Thaana',
        'Thai',
        'Tibetan',
        'Tifinagh',
        'Unknown'
      ] as const
    },
    sizerank: {
      description: 'sizerank field',
      values: [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
      ] as const
    },
    filterrank: {
      description: 'filterrank field',
      values: [] as const // number - Range: 0 to 5
    },
    class: {
      description: 'class field',
      values: [
        'ocean',
        'sea',
        'disputed_sea',
        'water',
        'reservoir',
        'river',
        'bay',
        'dock',
        'river',
        'canal',
        'stream',
        'landform',
        'wetland',
        'water_feature',
        'glacier',
        'continent'
      ] as const
    },
    maki: {
      description: 'maki field',
      values: ['marker', 'waterfall', 'volcano', 'mountain'] as const
    },
    elevation_m: {
      description: 'elevation_m field',
      values: [] as const // number - Range: -15000 to 21114
    },
    elevation_ft: {
      description: 'elevation_ft field',
      values: [] as const // number - Range: -49215 to 69276
    },
    worldview: {
      description: 'worldview field',
      values: ['JP', 'CN', 'IN', 'US', 'all'] as const
    }
  },

  // ============ poi_label ============
  poi_label: {
    name: {
      description: 'name field',
      values: [] as const // string
    },
    name_de: {
      description: 'name_de field',
      values: [] as const // string
    },
    name_en: {
      description: 'name_en field',
      values: [] as const // string
    },
    name_es: {
      description: 'name_es field',
      values: [] as const // string
    },
    name_fr: {
      description: 'name_fr field',
      values: [] as const // string
    },
    name_ru: {
      description: 'name_ru field',
      values: [] as const // string
    },
    'name_zh-Hant': {
      description: 'name_zh-Hant field',
      values: [] as const // string
    },
    'name_zh-Hans': {
      description: 'name_zh-Hans field',
      values: [] as const // string
    },
    name_pt: {
      description: 'name_pt field',
      values: [] as const // string
    },
    name_ar: {
      description: 'name_ar field',
      values: [] as const // string
    },
    name_vi: {
      description: 'name_vi field',
      values: [] as const // string
    },
    name_it: {
      description: 'name_it field',
      values: [] as const // string
    },
    name_ja: {
      description: 'name_ja field',
      values: [] as const // string
    },
    name_ko: {
      description: 'name_ko field',
      values: [] as const // string
    },
    name_script: {
      description: 'name_script field',
      values: [
        'Arabic',
        'Armenian',
        'Bengali',
        'Bopomofo',
        'Canadian_Aboriginal',
        'Common',
        'Cyrillic',
        'Devanagari',
        'Ethiopic',
        'Georgian',
        'Glagolitic',
        'Greek',
        'Gujarati',
        'Gurmukhi',
        'Han',
        'Hangul',
        'Hebrew',
        'Hiragana',
        'Kannada',
        'Katakana',
        'Khmer',
        'Lao',
        'Latin',
        'Malayalam',
        'Mongolian',
        'Myanmar',
        'Nko',
        'Sinhala',
        'Syriac',
        'Tamil',
        'Telugu',
        'Thaana',
        'Thai',
        'Tibetan',
        'Tifinagh',
        'Unknown'
      ] as const
    },
    filterrank: {
      description: 'filterrank field',
      values: [] as const // number - Range: 1 to 5
    },
    maki: {
      description: 'maki field',
      values: [
        'amusement-park',
        'aquarium',
        'art-gallery',
        'attraction',
        'cinema',
        'casino',
        'museum',
        'stadium',
        'theatre',
        'zoo',
        'marker',
        'bank',
        'bicycle',
        'car-rental',
        'laundry',
        'suitcase',
        'veterinary',
        'college',
        'school',
        'bar',
        'beer',
        'cafe',
        'fast-food',
        'ice-cream',
        'restaurant',
        'restaurant-noodle',
        'restaurant-pizza',
        'restaurant-seafood',
        'alcohol-shop',
        'bakery',
        'grocery',
        'convenience',
        'confectionery',
        'castle',
        'monument',
        'harbor',
        'farm',
        'bridge',
        'communications-tower',
        'watermill',
        'windmill',
        'lodging',
        'dentist',
        'doctor',
        'hospital',
        'pharmacy',
        'fuel',
        'car-repair',
        'charging-station',
        'parking',
        'parking-garage',
        'campsite',
        'cemetery',
        'dog-park',
        'garden',
        'golf',
        'park',
        'picnic-site',
        'playground',
        'embassy',
        'fire-station',
        'library',
        'police',
        'post',
        'prison',
        'town-hall',
        'place-of-worship',
        'religious-buddhist',
        'religious-christian',
        'religious-jewish',
        'religious-muslim',
        'viewpoint',
        'horse-riding',
        'swimming',
        'beach',
        'american-football',
        'basketball',
        'tennis',
        'table-tennis',
        'volleyball',
        'bowling-alley',
        'slipway',
        'pitch',
        'fitness-centre',
        'skateboard',
        'car',
        'clothing-store',
        'furniture',
        'hardware',
        'globe',
        'jewelry-store',
        'mobile-phone',
        'optician',
        'shoe',
        'watch',
        'shop',
        'music',
        'drinking-water',
        'information',
        'toilet',
        'ranger-station'
      ] as const
    },
    maki_beta: {
      description: 'maki_beta field',
      values: [
        'baseball',
        'lighthouse',
        'landmark',
        'industry',
        'highway-services',
        'highway-rest-area',
        'racetrack-cycling',
        'racetrack-horse',
        'racetrack-boat',
        'racetrack',
        'religious-shinto',
        'observation-tower',
        'restaurant-bbq',
        'tunnel'
      ] as const
    },
    maki_modifier: {
      description: 'maki_modifier field',
      values: ['JP'] as const
    },
    class: {
      description: 'class field',
      values: [
        'arts_and_entertainment',
        'building',
        'commercial_services',
        'education',
        'food_and_drink',
        'food_and_drink_stores',
        'historic',
        'industrial',
        'landmark',
        'lodging',
        'medical',
        'motorist',
        'park_like',
        'place_like',
        'public_facilities',
        'religion',
        'sport_and_leisure',
        'store_like',
        'visitor_amenities',
        'general'
      ] as const
    },
    type: {
      description: 'type field',
      values: [
        'Parking',
        'Locality',
        'Yes',
        'School',
        'Restaurant',
        'Place Of Worship',
        'Pitch',
        'Swimming Pool',
        'Retail',
        'Playground',
        'Convenience',
        'Residential',
        'Park',
        'Fuel',
        'Fast Food',
        'Isolated Dwelling',
        'Cafe',
        'Supermarket',
        'Cemetery',
        'Hotel',
        'Bank',
        'Industrial',
        'Pharmacy',
        'Clothes',
        'Guidepost',
        'Allotments',
        'Hospital',
        'Apartments',
        'Kindergarten',
        'Toilets',
        'Memorial',
        'Hairdresser',
        'Car Repair',
        'Bar',
        'Commercial',
        'Bakery',
        'Government',
        'Board',
        'Bridge',
        'House',
        'Company',
        'Grave Yard',
        'Drinking Water',
        'Post Office',
        'Pub',
        'Clinic',
        'Beach',
        'Guest House',
        'Sports Centre',
        'Attraction',
        'Viewpoint',
        'Doctors',
        'Car',
        'Townhall',
        'Police',
        'Fire Station',
        'University',
        'Camp Site',
        'Picnic Site',
        'Beauty',
        'Community Centre',
        'Dentist',
        'Works',
        'Library',
        'Shinto',
        'Museum',
        'Social Facility',
        'Wood',
        'Nature Reserve',
        'Mobile Phone',
        'Information',
        'Hardware',
        'Furniture',
        'Buddhist',
        'Chalet',
        'Electronics',
        'Marketplace',
        'Butcher',
        'College',
        'Forest',
        'Mall',
        'Estate Agent',
        'Shoes',
        'Alcohol',
        'Florist',
        'Archaeological Site',
        'Picnic Table',
        'Ruins',
        'Doityourself',
        'Fitness Centre',
        'Car Parts',
        'Monument',
        'Map',
        'Optician',
        'Office',
        'Jewelry',
        'Variety Store',
        'Hostel',
        'Construction',
        'Insurance'
      ] as const
    },
    brand: {
      description: 'brand field',
      values: [
        '21rentacar',
        '2nd-street',
        '31-ice-cream',
        '7-eleven',
        'aen',
        'aeon',
        'aiya',
        'alpen',
        'aoki',
        'aoyama',
        'asakuma',
        'atom',
        'audi',
        'autobacs',
        'b-kids',
        'bamiyan',
        'barneys-newyork',
        'benz',
        'best-denki',
        'big-boy',
        'bikkuri-donkey',
        'bmw',
        'bon-belta',
        'book-off',
        'budget',
        'carenex',
        'casa',
        'citroen',
        'cockpit',
        'coco-ichibanya',
        'cocos',
        'community-store',
        'cosmo-oil',
        'costco',
        'daiei',
        'daihatsu',
        'daily-store',
        'daimaru',
        'daiwa',
        'dennys',
        'dio',
        'doutor-coffee',
        'eki-rent-a-car',
        'eneos',
        'f-rent-a-car',
        'familymart',
        'ferrari',
        'fiat',
        'forus',
        'fukudaya-department-store',
        'fukuya',
        'futata',
        'garage-off',
        'general-motors',
        'gmdat',
        'grache-gardens',
        'gulliver',
        'gusto',
        'hamacho',
        'hamazushi',
        'hamburg-restaurant-bell',
        'hankyu-department-store',
        'hanshin',
        'hard-off',
        'haruyama',
        'heisei-car',
        'heiwado',
        'hihirose',
        'hino',
        'hobby-off',
        'hokuren',
        'honda',
        'honda-cars',
        'ichibata-department-store',
        'idemitsu-oil',
        'inageya',
        'isetan',
        'isuzu',
        'ito-yokado',
        'iwataya',
        'izumi',
        'izumiya',
        'izutsuya',
        'j-net-rentcar',
        'ja-ss',
        'jaguar',
        'japan-post-bank',
        'japan-post-insurance',
        'japan-rent-a-car',
        'jolly-ox',
        'jolly-pasta',
        'jonathans',
        'joyfull',
        'jumble-store',
        'kaisen-misakiko',
        'kasumi',
        'kawatoku',
        'keihan-department-store',
        'keio-department-store',
        'kfc',
        'kintetsu-department-store',
        'kygnus-oil',
        'kyubeiya',
        'laforet-harajuku',
        'lamborghini',
        'lamu',
        'landrover',
        'lawson',
        'lexus',
        'life',
        'lotteria',
        'lumine',
        'maruetsu',
        'maruetsupetit',
        'maruhiro-department-store',
        'maruhoncowboy',
        'marui',
        'marunen-me',
        'matsubishi',
        'matsuya',
        'matsuya-department-store',
        'matsuyadenki',
        'matsuzakaya',
        'mazda-autozam',
        'mazda-enfini',
        'mcdonalds',
        'meitetsu-pare-department-store',
        'melsa',
        'michi-no-eki',
        'milky-way',
        'mini',
        'mini-piago',
        'ministop',
        'mitsubishi-corporation-energy',
        'mitsubishi-fuso',
        'mitsubishi-motors',
        'mitsukoshi',
        'mizuho-bank',
        'mode-off',
        'mos-burger',
        'mufg-bank',
        'my-basket',
        'nagasakiya',
        'nakago',
        'nakasan',
        'nakau',
        'natural-lawson',
        'navi',
        'netz-toyota',
        'niconicorentacar',
        'nippo-rent-a-car-system',
        'nippon-rent-a-car',
        'nissan',
        'nissan-cherry',
        'nissan-motor',
        'nissan-parts',
        'nissan-prince',
        'nissan-rent-a-car',
        'nissan-satio',
        'odakyu-department-store',
        'off-house',
        'ohsho',
        'oita-rental',
        'ok',
        'okajima',
        'okuno',
        'okuwa',
        'onuma',
        'orix-rent-a-car',
        'osaka-ohsho',
        'ots-rentacar',
        'palty-fuji',
        'parco',
        'petras',
        'peugeot',
        'plaka',
        'poplar',
        'popolo',
        'pork-cutlet-hamakatsu',
        'porsche',
        'ralse',
        'recycle-mart',
        'red-cabbage',
        'red-lobster',
        'renault',
        'resona-bank',
        'ringer-hut',
        'rolls-royce',
        'royal-host',
        'saga-rent-lease',
        'saijo-department-store',
        'saikaya',
        'saint-marc',
        'saitama-resona-bank',
        'saizeriya',
        'sanbangai',
        'sanei',
        'santa-no-souko',
        'sato',
        'seibu',
        'seicomart',
        'seiyu',
        'shabushabu-dontei',
        'shinkin-bank',
        'showa-shell-oil',
        'sizzler',
        'sky-rentallease',
        'smile-santa',
        'sogo',
        'sokoseikatsukan',
        'solato',
        'starbucks-coffee',
        'steak-hamburg-ken',
        'steak-miya',
        'steak-no-don',
        'store100',
        'subaru',
        'suehiro',
        'sukiya',
        'sumitomo-mitsui-banking-corporation',
        'sunpiazza',
        'sushihan',
        'suzuki',
        'suzuran-department-store',
        'tachiya',
        'taiyakan',
        'takarajima',
        'takashimaya',
        'tamaya',
        'tenmaya',
        'times-car-rental',
        'tobu-department-store',
        'tokiwa',
        'tokyu-department-store',
        'tokyu-store',
        'tomato-onion',
        'tonden',
        'toyopet',
        'toyota',
        'toyota-corolla',
        'toyota-parts',
        'toyota-rent-a-car',
        'tsuruya-department-store',
        'tullys-coffee',
        'ud-trucks',
        'victoria',
        'victoria-station',
        'vivre',
        'volks',
        'volkswagen',
        'volvo',
        'yamakataya',
        'yamazaki-shop',
        'yanase',
        'yao-department-store',
        'yayoiken',
        'yellow-hat',
        'york-benimaru',
        'yoshinoya',
        'you-me-mart',
        'yumean',
        'zenrin'
      ] as const
    },
    category_en: {
      description: 'category_en field',
      values: [
        'Locality',
        'School Grounds',
        'Swimming Pool',
        'Restaurant',
        'Park',
        'Church',
        'Shop',
        'Playground',
        'Sport Pitch',
        'Convenience Store',
        'Gas Station',
        'Supermarket',
        'Cafe',
        'Cemetery',
        'Bank',
        'Fast Food',
        'Hotel',
        'Isolated Dwelling',
        'Retail Building',
        'Guidepost',
        'Pharmacy',
        'Residential Area',
        'Community Garden',
        'Clothing Store',
        'Kindergarten',
        'Information Board',
        'Graveyard',
        'Memorial',
        'Apartments',
        'Hospital Grounds',
        'Pub',
        'Post Office',
        'Bar',
        'House',
        'Bakery',
        'Industrial Area',
        'Car Repair Shop',
        'Mosque',
        'Place of Worship',
        'Viewpoint',
        'Sports Complex',
        'Police',
        'Beach',
        'Picnic Site',
        'Tourist Attraction',
        'Guest House',
        'Town Hall',
        'Car Parking',
        'Fire Station',
        'Campground',
        'Car Dealership',
        'Doctor\u2019s Office',
        'Residential Building',
        'Community Center',
        'Library',
        'Museum',
        'Clinic',
        'Information',
        'Dentist',
        'Social Facility',
        'Monument',
        'Hardware Store',
        'Butcher',
        'Wood',
        'Furniture Store',
        'Florist',
        'Marketplace',
        'University Grounds',
        'Electronics Store',
        'DIY Store',
        'Mall',
        'College Grounds',
        'Shoe Store',
        'Mobile Phone Store',
        'University Building',
        'Archaeological Site',
        'Liquor Store',
        'Quarry',
        'Stadium',
        'Commercial Area',
        'Tower',
        'Buddhist Temple',
        'Hostel',
        'Castle',
        'Factory',
        'Bridge',
        'Ruins',
        'Department Store',
        'Motel',
        'Book Store',
        'Jeweler',
        'Optician',
        'Golf Course',
        'Holiday Cottage',
        'Gift Shop',
        'Farmland',
        'Bicycle Shop',
        'Greengrocer',
        'Theater',
        'Retail Area'
      ] as const
    },
    'category_zh-Hans': {
      description: 'category_zh-Hans field',
      values: [
        '\u5730\u65b9',
        '\u5b66\u6821',
        '\u6e38\u6cf3\u6c60',
        '\u9910\u9986',
        '\u516c\u56ed',
        '\u57fa\u7763\u6559\u5802',
        '\u5546\u5e97',
        '\u5893\u5730',
        '\u513f\u7ae5\u6e38\u4e50\u573a',
        '\u8fd0\u52a8\u573a\u5730',
        '\u4fbf\u5229\u5e97',
        '\u52a0\u6cb9\u7ad9',
        '\u8d85\u5e02',
        '\u5496\u5561\u9986',
        '\u94f6\u884c',
        '\u5feb\u9910\u5e97',
        '\u5bbe\u9986',
        '\u5b64\u7acb\u5c45\u6240',
        '\u96f6\u552e\u4e1a\u5efa\u7b51',
        '\u8def\u6807',
        '\u836f\u623f',
        '\u5c45\u6c11\u533a',
        '\u516c\u5171\u82b1\u56ed',
        '\u670d\u88c5\u5e97',
        '\u5e7c\u513f\u56ed',
        '\u4fe1\u606f\u677f',
        '\u7eaa\u5ff5\u7891',
        '\u4f4f\u5b85\u697c',
        '\u8bca\u6240',
        '\u533b\u9662',
        '\u9152\u9986',
        '\u90ae\u5c40',
        '\u9152\u5427',
        '\u623f\u5c4b',
        '\u9762\u5305\u5e97',
        '\u5de5\u4e1a\u533a',
        '\u6c7d\u8f66\u4fee\u7406\u5e97',
        '\u6e05\u771f\u5bfa',
        '\u793c\u62dc\u573a\u6240',
        '\u89c2\u666f\u70b9',
        '\u4f53\u80b2\u4e2d\u5fc3/\u7efc\u5408\u4f53\u80b2\u573a',
        '\u8b66\u5bdf\u5c40',
        '\u6d77\u6ee9',
        '\u91ce\u9910\u5730',
        '\u65c5\u6e38\u540d\u80dc',
        '\u5c0f\u65c5\u9986',
        '\u653f\u5e9c\u529e\u516c\u5927\u697c',
        '\u505c\u8f66\u573a',
        '\u6d88\u9632\u7ad9',
        '\u5bbf\u8425\u573a\u5730',
        '\u6c7d\u8f66\u5e97',
        '\u4f4f\u5b85\u5efa\u7b51\u7269',
        '\u793e\u533a\u4e2d\u5fc3',
        '\u56fe\u4e66\u9986',
        '\u535a\u7269\u9986',
        '\u6e38\u5ba2\u4e2d\u5fc3',
        '\u7259\u79d1\u533b\u9662',
        '\u793e\u4f1a\u670d\u52a1\u8bbe\u65bd',
        '\u7eaa\u5ff5\u5802',
        '\u4e94\u91d1\u5e97',
        '\u8089\u5e97',
        '\u6811\u6797',
        '\u5bb6\u5177\u5e97',
        '\u82b1\u5e97',
        '\u978b\u5e97',
        '\u5e02\u573a',
        '\u5927\u5b66',
        '\u7535\u5b50\u4ea7\u54c1\u5e97',
        'DIY\u5e97',
        '\u8d2d\u7269\u4e2d\u5fc3',
        '\u5b66\u9662',
        '\u624b\u673a\u5e97',
        '\u5927\u5b66\u5efa\u7b51',
        '\u8003\u53e4\u9057\u5740',
        '\u5916\u5356\u9152\u5e97',
        '\u9732\u5929\u77ff\u573a',
        '\u4f53\u80b2\u573a',
        '\u5546\u4e1a\u533a',
        '\u5854',
        '\u4f5b\u6559\u5bfa\u5e99',
        '\u65c5\u820d',
        '\u57ce\u5821',
        '\u5de5\u5382',
        '\u6865\u6881',
        '\u9057\u8ff9',
        '\u767e\u8d27\u5546\u573a',
        '\u6c7d\u8f66\u65c5\u9986',
        '\u4e66\u5e97',
        '\u73e0\u5b9d\u5e97',
        '\u773c\u955c\u5e97',
        '\u9ad8\u5c14\u592b\u7403\u573a',
        '\u5ea6\u5047\u5c4b',
        '\u793c\u54c1\u5e97',
        '\u81ea\u884c\u8f66\u5e97',
        '\u852c\u679c\u5e97',
        '\u5267\u9662',
        '\u96f6\u552e\u5546\u5e97',
        '\u517d\u533b\u9662',
        '\u65c5\u884c\u793e',
        '\u7eff\u5730'
      ] as const
    },
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    sizerank: {
      description: 'sizerank field',
      values: [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
      ] as const
    }
  },

  // ============ motorway_junction ============
  motorway_junction: {
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    ref: {
      description: 'ref field',
      values: [] as const // string
    },
    reflen: {
      description: 'reflen field',
      values: [] as const // number - Range: 0 to 50
    },
    name: {
      description: 'name field',
      values: [] as const // string
    },
    class: {
      description: 'class field',
      values: [
        'motorway',
        'motorway_link',
        'trunk',
        'trunk_link',
        'primary',
        'secondary',
        'tertiary',
        'primary_link',
        'secondary_link',
        'tertiary_link',
        'street',
        'street_limited',
        'construction',
        'track',
        'service',
        'path',
        'major_rail',
        'minor_rail',
        'service_rail'
      ] as const
    },
    type: {
      description: 'type field',
      values: [
        'motorway',
        'trunk',
        'motorway_link',
        'primary',
        'trunk_link',
        'secondary',
        'tertiary',
        'primary_link',
        'secondary_link',
        'tertiary_link'
      ] as const
    },
    maki_beta: {
      description: 'maki_beta field',
      values: ['interchange', 'junction'] as const
    },
    filterrank: {
      description: 'filterrank field',
      values: [0, 1, 2, 3, 4, 5] as const
    }
  },

  // ============ housenum_label ============
  housenum_label: {
    iso_3166_1: ISO_3166_1_FIELD,
    iso_3166_2: ISO_3166_2_FIELD,
    house_num: {
      description: 'house_num field',
      values: [] as const // string
    }
  }
} as const;

export type SourceLayer = keyof typeof STREETS_V8_FIELDS;
