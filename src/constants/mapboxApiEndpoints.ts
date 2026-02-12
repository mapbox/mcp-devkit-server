/**
 * Mapbox API endpoint definitions for the explore_mapbox_api_tool.
 * Provides structured, queryable information about Mapbox APIs.
 */

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: any;
  enum?: string[];
}

export interface ApiOperation {
  name: string;
  operationId: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  pathParameters?: Parameter[];
  queryParameters?: Parameter[];
  bodyParameters?: Parameter[];
  requiredScopes: string[];
  rateLimit?: {
    requests: number;
    period: string;
    notes?: string;
  };
  exampleRequest?: string;
  exampleResponse?: string;
}

export interface MapboxApiEndpoint {
  api: string;
  category: string;
  description: string;
  docsUrl: string;
  operations: ApiOperation[];
}

export const MAPBOX_API_ENDPOINTS: MapboxApiEndpoint[] = [
  {
    api: 'geocoding',
    category: 'Search',
    description:
      'Convert location names to coordinates (forward) and coordinates to location names (reverse)',
    docsUrl: 'https://docs.mapbox.com/api/search/geocoding/',
    operations: [
      {
        name: 'Forward Geocoding',
        operationId: 'forward-geocode',
        description: 'Search for places by name and get geographic coordinates',
        endpoint: '/geocoding/v5/{mode}/{query}.json',
        method: 'GET',
        pathParameters: [
          {
            name: 'mode',
            type: 'string',
            required: true,
            description: 'Geocoding mode',
            enum: ['mapbox.places', 'mapbox.places-permanent']
          },
          {
            name: 'query',
            type: 'string',
            required: true,
            description:
              'The location text to search for (e.g., "San Francisco" or "1600 Pennsylvania Ave")'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          },
          {
            name: 'autocomplete',
            type: 'boolean',
            required: false,
            description: 'Whether to return autocomplete results',
            default: true
          },
          {
            name: 'bbox',
            type: 'string',
            required: false,
            description:
              'Bounding box to limit results (minLon,minLat,maxLon,maxLat)'
          },
          {
            name: 'country',
            type: 'string',
            required: false,
            description:
              'Comma-separated ISO 3166-1 alpha-2 country codes to limit results'
          },
          {
            name: 'fuzzyMatch',
            type: 'boolean',
            required: false,
            description: 'Whether to use fuzzy matching',
            default: true
          },
          {
            name: 'language',
            type: 'string',
            required: false,
            description: 'Comma-separated ISO 639-1 language codes for results'
          },
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Maximum number of results (1-10)',
            default: 5
          },
          {
            name: 'proximity',
            type: 'string',
            required: false,
            description: 'Bias results toward a location (longitude,latitude)'
          },
          {
            name: 'types',
            type: 'string',
            required: false,
            description: 'Comma-separated feature types to filter results',
            enum: [
              'country',
              'region',
              'postcode',
              'district',
              'place',
              'locality',
              'neighborhood',
              'address',
              'poi'
            ]
          }
        ],
        requiredScopes: ['styles:read', 'geocoding:read'],
        rateLimit: {
          requests: 600,
          period: 'minute',
          notes: 'Free tier: 100,000 requests/month'
        },
        exampleRequest:
          'https://api.mapbox.com/geocoding/v5/mapbox.places/San%20Francisco.json?access_token=YOUR_TOKEN',
        exampleResponse: JSON.stringify(
          {
            type: 'FeatureCollection',
            query: ['san', 'francisco'],
            features: [
              {
                id: 'place.123',
                type: 'Feature',
                place_type: ['place'],
                relevance: 1,
                properties: {},
                text: 'San Francisco',
                place_name: 'San Francisco, California, United States',
                center: [-122.4194, 37.7749],
                geometry: {
                  type: 'Point',
                  coordinates: [-122.4194, 37.7749]
                }
              }
            ]
          },
          null,
          2
        )
      },
      {
        name: 'Reverse Geocoding',
        operationId: 'reverse-geocode',
        description: 'Get place names from geographic coordinates',
        endpoint: '/geocoding/v5/{mode}/{longitude},{latitude}.json',
        method: 'GET',
        pathParameters: [
          {
            name: 'mode',
            type: 'string',
            required: true,
            description: 'Geocoding mode',
            enum: ['mapbox.places', 'mapbox.places-permanent']
          },
          {
            name: 'longitude',
            type: 'number',
            required: true,
            description: 'Longitude coordinate (-180 to 180)'
          },
          {
            name: 'latitude',
            type: 'number',
            required: true,
            description: 'Latitude coordinate (-90 to 90)'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          },
          {
            name: 'country',
            type: 'string',
            required: false,
            description:
              'Comma-separated ISO 3166-1 alpha-2 country codes to limit results'
          },
          {
            name: 'language',
            type: 'string',
            required: false,
            description: 'Comma-separated ISO 639-1 language codes for results'
          },
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Maximum number of results (1-5)',
            default: 1
          },
          {
            name: 'types',
            type: 'string',
            required: false,
            description: 'Comma-separated feature types to filter results'
          }
        ],
        requiredScopes: ['styles:read', 'geocoding:read'],
        rateLimit: {
          requests: 600,
          period: 'minute',
          notes: 'Free tier: 100,000 requests/month'
        },
        exampleRequest:
          'https://api.mapbox.com/geocoding/v5/mapbox.places/-122.4194,37.7749.json?access_token=YOUR_TOKEN',
        exampleResponse: JSON.stringify(
          {
            type: 'FeatureCollection',
            query: [-122.4194, 37.7749],
            features: [
              {
                id: 'place.123',
                type: 'Feature',
                place_type: ['place'],
                relevance: 1,
                properties: {},
                text: 'San Francisco',
                place_name: 'San Francisco, California, United States',
                center: [-122.4194, 37.7749],
                geometry: {
                  type: 'Point',
                  coordinates: [-122.4194, 37.7749]
                }
              }
            ]
          },
          null,
          2
        )
      }
    ]
  },
  {
    api: 'styles',
    category: 'Maps',
    description:
      'Create, read, update, and delete map styles. See also: create_style_tool, update_style_tool, retrieve_style_tool, list_styles_tool',
    docsUrl: 'https://docs.mapbox.com/api/maps/styles/',
    operations: [
      {
        name: 'Create Style',
        operationId: 'create-style',
        description:
          'Create a new map style (use create_style_tool for implementation)',
        endpoint: '/styles/v1/{username}',
        method: 'POST',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          }
        ],
        bodyParameters: [
          {
            name: 'name',
            type: 'string',
            required: true,
            description: 'Style name'
          },
          {
            name: 'version',
            type: 'number',
            required: true,
            description: 'Style specification version',
            default: 8
          },
          {
            name: 'sources',
            type: 'object',
            required: true,
            description: 'Data sources for the style'
          },
          {
            name: 'layers',
            type: 'array',
            required: true,
            description: 'Style layers'
          },
          {
            name: 'glyphs',
            type: 'string',
            required: false,
            description: 'Font glyphs URL template'
          },
          {
            name: 'sprite',
            type: 'string',
            required: false,
            description: 'Sprite image URL'
          }
        ],
        requiredScopes: ['styles:write'],
        rateLimit: {
          requests: 100,
          period: 'minute'
        },
        exampleRequest:
          'POST https://api.mapbox.com/styles/v1/your-username?access_token=YOUR_TOKEN',
        exampleResponse: JSON.stringify(
          {
            version: 8,
            name: 'My Style',
            id: 'cjhtjdksl00009op8t7eee8k2',
            owner: 'your-username',
            created: '2023-01-01T00:00:00.000Z',
            modified: '2023-01-01T00:00:00.000Z'
          },
          null,
          2
        )
      },
      {
        name: 'Retrieve Style',
        operationId: 'retrieve-style',
        description:
          'Get a map style by ID (use retrieve_style_tool for implementation)',
        endpoint: '/styles/v1/{username}/{style_id}',
        method: 'GET',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          },
          {
            name: 'style_id',
            type: 'string',
            required: true,
            description: 'Style ID'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          }
        ],
        requiredScopes: ['styles:read'],
        rateLimit: {
          requests: 300,
          period: 'minute'
        }
      },
      {
        name: 'Update Style',
        operationId: 'update-style',
        description:
          'Update an existing map style (use update_style_tool for implementation)',
        endpoint: '/styles/v1/{username}/{style_id}',
        method: 'PATCH',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          },
          {
            name: 'style_id',
            type: 'string',
            required: true,
            description: 'Style ID'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          }
        ],
        bodyParameters: [
          {
            name: 'name',
            type: 'string',
            required: false,
            description: 'Updated style name'
          },
          {
            name: 'sources',
            type: 'object',
            required: false,
            description: 'Updated data sources'
          },
          {
            name: 'layers',
            type: 'array',
            required: false,
            description: 'Updated style layers'
          }
        ],
        requiredScopes: ['styles:write'],
        rateLimit: {
          requests: 100,
          period: 'minute'
        }
      },
      {
        name: 'Delete Style',
        operationId: 'delete-style',
        description: 'Delete a map style',
        endpoint: '/styles/v1/{username}/{style_id}',
        method: 'DELETE',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          },
          {
            name: 'style_id',
            type: 'string',
            required: true,
            description: 'Style ID'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          }
        ],
        requiredScopes: ['styles:write'],
        rateLimit: {
          requests: 100,
          period: 'minute'
        }
      },
      {
        name: 'List Styles',
        operationId: 'list-styles',
        description:
          'List all styles for a user (use list_styles_tool for implementation)',
        endpoint: '/styles/v1/{username}',
        method: 'GET',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          }
        ],
        requiredScopes: ['styles:list'],
        rateLimit: {
          requests: 300,
          period: 'minute'
        }
      }
    ]
  },
  {
    api: 'tokens',
    category: 'Account',
    description:
      'Manage access tokens and their scopes. See also: list_tokens_tool, create_token_tool, update_token_tool, delete_token_tool, retrieve_token_tool',
    docsUrl: 'https://docs.mapbox.com/api/accounts/tokens/',
    operations: [
      {
        name: 'List Tokens',
        operationId: 'list-tokens',
        description:
          'List all access tokens for your account (use list_tokens_tool for implementation)',
        endpoint: '/tokens/v2/{username}',
        method: 'GET',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token with tokens:read scope'
          }
        ],
        requiredScopes: ['tokens:read'],
        rateLimit: {
          requests: 600,
          period: 'minute'
        }
      },
      {
        name: 'Create Token',
        operationId: 'create-token',
        description:
          'Create a new access token (use create_token_tool for implementation)',
        endpoint: '/tokens/v2/{username}',
        method: 'POST',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token with tokens:write scope'
          }
        ],
        bodyParameters: [
          {
            name: 'note',
            type: 'string',
            required: false,
            description: 'Human-readable description'
          },
          {
            name: 'scopes',
            type: 'array',
            required: true,
            description:
              'Array of token scopes (e.g., ["styles:read", "fonts:read"])'
          },
          {
            name: 'resources',
            type: 'array',
            required: false,
            description: 'URL restrictions for token usage'
          },
          {
            name: 'allowedUrls',
            type: 'array',
            required: false,
            description: 'Allowed referrer URLs'
          }
        ],
        requiredScopes: ['tokens:write'],
        rateLimit: {
          requests: 100,
          period: 'minute'
        }
      },
      {
        name: 'Update Token',
        operationId: 'update-token',
        description:
          'Update an existing token (use update_token_tool for implementation)',
        endpoint: '/tokens/v2/{username}/{token_id}',
        method: 'PATCH',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          },
          {
            name: 'token_id',
            type: 'string',
            required: true,
            description: 'Token ID to update'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token with tokens:write scope'
          }
        ],
        bodyParameters: [
          {
            name: 'note',
            type: 'string',
            required: false,
            description: 'Updated description'
          },
          {
            name: 'scopes',
            type: 'array',
            required: false,
            description: 'Updated scopes array'
          }
        ],
        requiredScopes: ['tokens:write'],
        rateLimit: {
          requests: 100,
          period: 'minute'
        }
      },
      {
        name: 'Delete Token',
        operationId: 'delete-token',
        description:
          'Delete an access token (use delete_token_tool for implementation)',
        endpoint: '/tokens/v2/{username}/{token_id}',
        method: 'DELETE',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          },
          {
            name: 'token_id',
            type: 'string',
            required: true,
            description: 'Token ID to delete'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token with tokens:write scope'
          }
        ],
        requiredScopes: ['tokens:write'],
        rateLimit: {
          requests: 100,
          period: 'minute'
        }
      },
      {
        name: 'Retrieve Token',
        operationId: 'retrieve-token',
        description:
          'Get details about a specific token (use retrieve_token_tool for implementation)',
        endpoint: '/tokens/v2/{username}/{token_id}',
        method: 'GET',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          },
          {
            name: 'token_id',
            type: 'string',
            required: true,
            description: 'Token ID'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token with tokens:read scope'
          }
        ],
        requiredScopes: ['tokens:read'],
        rateLimit: {
          requests: 600,
          period: 'minute'
        }
      }
    ]
  },
  {
    api: 'static-images',
    category: 'Maps',
    description: 'Generate static map images from styles',
    docsUrl: 'https://docs.mapbox.com/api/maps/static-images/',
    operations: [
      {
        name: 'Static Map Image',
        operationId: 'static-image',
        description: 'Request a static map image',
        endpoint:
          '/styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom},{bearing},{pitch}/{width}x{height}{@2x}',
        method: 'GET',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          },
          {
            name: 'style_id',
            type: 'string',
            required: true,
            description: 'Style ID or Mapbox style (e.g., "streets-v12")'
          },
          {
            name: 'overlay',
            type: 'string',
            required: false,
            description: 'GeoJSON overlay, marker, or path to add to the map'
          },
          {
            name: 'lon',
            type: 'number',
            required: true,
            description: 'Longitude for map center'
          },
          {
            name: 'lat',
            type: 'number',
            required: true,
            description: 'Latitude for map center'
          },
          {
            name: 'zoom',
            type: 'number',
            required: true,
            description: 'Zoom level (0-22)'
          },
          {
            name: 'bearing',
            type: 'number',
            required: false,
            description: 'Map bearing in degrees (0-359)',
            default: 0
          },
          {
            name: 'pitch',
            type: 'number',
            required: false,
            description: 'Map pitch in degrees (0-60)',
            default: 0
          },
          {
            name: 'width',
            type: 'number',
            required: true,
            description: 'Image width in pixels (1-1280)'
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            description: 'Image height in pixels (1-1280)'
          },
          {
            name: '@2x',
            type: 'string',
            required: false,
            description: 'Add "@2x" for retina/high-DPI display'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          },
          {
            name: 'attribution',
            type: 'boolean',
            required: false,
            description: 'Whether to include attribution',
            default: true
          },
          {
            name: 'logo',
            type: 'boolean',
            required: false,
            description: 'Whether to include Mapbox logo',
            default: true
          }
        ],
        requiredScopes: ['styles:tiles'],
        rateLimit: {
          requests: 1200,
          period: 'minute',
          notes: 'Free tier: 50,000 requests/month'
        },
        exampleRequest:
          'https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/-122.4194,37.7749,12,0,0/600x400@2x?access_token=YOUR_TOKEN',
        exampleResponse: '(Binary PNG image data)'
      },
      {
        name: 'Static Map with Overlay',
        operationId: 'static-image-overlay',
        description: 'Request a static map with GeoJSON overlay',
        endpoint:
          '/styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom}/{width}x{height}{@2x}',
        method: 'GET',
        pathParameters: [
          {
            name: 'username',
            type: 'string',
            required: true,
            description: 'Mapbox username'
          },
          {
            name: 'style_id',
            type: 'string',
            required: true,
            description: 'Style ID'
          },
          {
            name: 'overlay',
            type: 'string',
            required: true,
            description:
              'URL-encoded GeoJSON or marker syntax (e.g., "geojson({...})" or "pin-s+f00(-122.4,37.8)")'
          },
          {
            name: 'lon',
            type: 'number',
            required: true,
            description: 'Longitude for map center'
          },
          {
            name: 'lat',
            type: 'number',
            required: true,
            description: 'Latitude for map center'
          },
          {
            name: 'zoom',
            type: 'number',
            required: true,
            description: 'Zoom level (0-22)'
          },
          {
            name: 'width',
            type: 'number',
            required: true,
            description: 'Image width in pixels (1-1280)'
          },
          {
            name: 'height',
            type: 'number',
            required: true,
            description: 'Image height in pixels (1-1280)'
          },
          {
            name: '@2x',
            type: 'string',
            required: false,
            description: 'Add "@2x" for retina display'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          }
        ],
        requiredScopes: ['styles:tiles'],
        rateLimit: {
          requests: 1200,
          period: 'minute'
        }
      }
    ]
  },
  {
    api: 'directions',
    category: 'Navigation',
    description:
      'Calculate routes between coordinates with turn-by-turn directions',
    docsUrl: 'https://docs.mapbox.com/api/navigation/directions/',
    operations: [
      {
        name: 'Directions',
        operationId: 'directions',
        description: 'Calculate a route between waypoints',
        endpoint: '/directions/v5/mapbox/{profile}/{coordinates}',
        method: 'GET',
        pathParameters: [
          {
            name: 'profile',
            type: 'string',
            required: true,
            description: 'Routing profile',
            enum: ['driving-traffic', 'driving', 'walking', 'cycling']
          },
          {
            name: 'coordinates',
            type: 'string',
            required: true,
            description:
              'Semicolon-separated list of {longitude},{latitude} coordinates (2-25 waypoints)'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          },
          {
            name: 'alternatives',
            type: 'boolean',
            required: false,
            description: 'Whether to return alternative routes',
            default: false
          },
          {
            name: 'geometries',
            type: 'string',
            required: false,
            description: 'Route geometry format',
            enum: ['geojson', 'polyline', 'polyline6'],
            default: 'polyline'
          },
          {
            name: 'overview',
            type: 'string',
            required: false,
            description: 'Level of detail for route geometry',
            enum: ['full', 'simplified', 'false'],
            default: 'simplified'
          },
          {
            name: 'steps',
            type: 'boolean',
            required: false,
            description: 'Whether to include turn-by-turn instructions',
            default: false
          },
          {
            name: 'continue_straight',
            type: 'boolean',
            required: false,
            description: 'Force route to go straight at waypoints',
            default: false
          },
          {
            name: 'waypoint_names',
            type: 'string',
            required: false,
            description: 'Semicolon-separated list of custom waypoint names'
          },
          {
            name: 'banner_instructions',
            type: 'boolean',
            required: false,
            description: 'Whether to include banner instructions',
            default: false
          },
          {
            name: 'language',
            type: 'string',
            required: false,
            description: 'Language for instructions (ISO 639-1 code)',
            default: 'en'
          },
          {
            name: 'voice_instructions',
            type: 'boolean',
            required: false,
            description: 'Whether to include voice instructions',
            default: false
          }
        ],
        requiredScopes: ['directions:read'],
        rateLimit: {
          requests: 300,
          period: 'minute',
          notes: 'Free tier: 100,000 requests/month'
        },
        exampleRequest:
          'https://api.mapbox.com/directions/v5/mapbox/driving/-122.42,37.78;-122.45,37.76?steps=true&access_token=YOUR_TOKEN',
        exampleResponse: JSON.stringify(
          {
            routes: [
              {
                distance: 3492.9,
                duration: 645.2,
                geometry: 'encoded-polyline-string',
                legs: [
                  {
                    distance: 3492.9,
                    duration: 645.2,
                    steps: [
                      {
                        distance: 150.5,
                        duration: 23.4,
                        geometry: 'encoded-polyline',
                        name: 'Market Street',
                        maneuver: {
                          type: 'depart',
                          instruction: 'Head east on Market Street'
                        }
                      }
                    ]
                  }
                ]
              }
            ],
            waypoints: [
              { name: 'Market Street', location: [-122.42, 37.78] },
              { name: 'Valencia Street', location: [-122.45, 37.76] }
            ]
          },
          null,
          2
        )
      }
    ]
  },
  {
    api: 'tilequery',
    category: 'Maps',
    description:
      'Query vector tile data at specific coordinates. See also: query_mapbox_tilesets_tool',
    docsUrl: 'https://docs.mapbox.com/api/maps/tilequery/',
    operations: [
      {
        name: 'Tilequery',
        operationId: 'tilequery',
        description:
          'Retrieve features from vector tiles at a point (use query_mapbox_tilesets_tool for implementation)',
        endpoint: '/v4/{tileset_id}/tilequery/{lon},{lat}.json',
        method: 'GET',
        pathParameters: [
          {
            name: 'tileset_id',
            type: 'string',
            required: true,
            description: 'Tileset identifier (e.g., "mapbox.mapbox-streets-v8")'
          },
          {
            name: 'lon',
            type: 'number',
            required: true,
            description: 'Longitude coordinate'
          },
          {
            name: 'lat',
            type: 'number',
            required: true,
            description: 'Latitude coordinate'
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          },
          {
            name: 'radius',
            type: 'number',
            required: false,
            description: 'Search radius in meters (0-1000)',
            default: 0
          },
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Maximum number of results (1-50)',
            default: 5
          },
          {
            name: 'dedupe',
            type: 'boolean',
            required: false,
            description: 'Whether to remove duplicate results',
            default: true
          },
          {
            name: 'geometry',
            type: 'string',
            required: false,
            description: 'Filter by geometry type',
            enum: ['point', 'linestring', 'polygon']
          },
          {
            name: 'layers',
            type: 'string',
            required: false,
            description: 'Comma-separated list of layer IDs to query'
          }
        ],
        requiredScopes: ['styles:tiles'],
        rateLimit: {
          requests: 600,
          period: 'minute',
          notes: 'Free tier: 100,000 requests/month'
        },
        exampleRequest:
          'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/-122.42,37.78.json?radius=10&limit=5&access_token=YOUR_TOKEN',
        exampleResponse: JSON.stringify(
          {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                id: 123,
                geometry: {
                  type: 'Point',
                  coordinates: [-122.42, 37.78]
                },
                properties: {
                  class: 'street',
                  name: 'Market Street',
                  type: 'primary'
                }
              }
            ]
          },
          null,
          2
        )
      }
    ]
  },
  {
    api: 'feedback',
    category: 'Maps',
    description:
      'Submit user feedback events for map data quality. See also: create_feedback_event_tool, get_feedback_events_tool',
    docsUrl: 'https://docs.mapbox.com/api/navigation/feedback/',
    operations: [
      {
        name: 'Create Feedback Event',
        operationId: 'create-feedback',
        description:
          'Submit a map feedback event (use create_feedback_event_tool for implementation)',
        endpoint: '/feedback/v1/{eventType}',
        method: 'POST',
        pathParameters: [
          {
            name: 'eventType',
            type: 'string',
            required: true,
            description: 'Type of feedback event',
            enum: [
              'incorrect-navigation',
              'not-allowed',
              'road-closure',
              'other'
            ]
          }
        ],
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          }
        ],
        bodyParameters: [
          {
            name: 'coordinates',
            type: 'array',
            required: true,
            description: 'Location of feedback [longitude, latitude]'
          },
          {
            name: 'description',
            type: 'string',
            required: false,
            description: 'Detailed description of the issue'
          },
          {
            name: 'userId',
            type: 'string',
            required: false,
            description: 'Anonymous user identifier'
          }
        ],
        requiredScopes: ['feedback:write'],
        rateLimit: {
          requests: 100,
          period: 'minute'
        }
      },
      {
        name: 'Get Feedback Events',
        operationId: 'list-feedback',
        description:
          'Retrieve submitted feedback events (use get_feedback_events_tool for implementation)',
        endpoint: '/feedback/v1/events',
        method: 'GET',
        queryParameters: [
          {
            name: 'access_token',
            type: 'string',
            required: true,
            description: 'Mapbox access token'
          },
          {
            name: 'start',
            type: 'string',
            required: false,
            description: 'Start date (ISO 8601)'
          },
          {
            name: 'end',
            type: 'string',
            required: false,
            description: 'End date (ISO 8601)'
          }
        ],
        requiredScopes: ['feedback:read'],
        rateLimit: {
          requests: 300,
          period: 'minute'
        }
      }
    ]
  }
];
