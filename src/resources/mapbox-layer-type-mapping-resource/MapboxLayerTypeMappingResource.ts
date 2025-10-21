// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { BaseResource } from '../BaseResource.js';

/**
 * Resource providing mapping between Streets v8 source layers and GL JS layer types
 * Helps determine which layer types are compatible with which source layers
 */
export class MapboxLayerTypeMappingResource extends BaseResource {
  readonly name = 'Mapbox Layer Type Mapping';
  readonly uri = 'resource://mapbox-layer-type-mapping';
  readonly description =
    'Mapping of Mapbox Streets v8 source layers to compatible Mapbox GL JS layer types. Use this to understand which layer types (fill, line, symbol, etc.) work with which source layers.';
  readonly mimeType = 'application/json';

  public async readCallback(uri: URL, _extra: unknown) {
    const mapping = {
      description:
        'Mapping of Mapbox Streets v8 source layers to compatible Mapbox GL JS layer types',
      geometry_types: {
        polygon: {
          description: 'Source layers containing polygon geometry',
          source_layers: ['landuse', 'water', 'building', 'landuse_overlay'],
          compatible_layer_types: ['fill', 'fill-extrusion']
        },
        line: {
          description: 'Source layers containing line geometry',
          source_layers: [
            'road',
            'admin',
            'waterway',
            'aeroway',
            'structure',
            'natural_label'
          ],
          compatible_layer_types: ['line']
        },
        point: {
          description: 'Source layers containing point geometry',
          source_layers: [
            'place_label',
            'poi_label',
            'airport_label',
            'transit_stop_label',
            'motorway_junction',
            'housenum_label'
          ],
          compatible_layer_types: ['symbol', 'circle']
        }
      },
      layer_type_compatibility: {
        fill: {
          description: 'Filled polygons with optional outlines',
          compatible_source_layers: [
            'landuse',
            'water',
            'building',
            'landuse_overlay'
          ],
          common_uses: [
            'Coloring parks, water bodies, and land areas',
            'Creating custom area visualizations',
            'Styling building footprints'
          ]
        },
        line: {
          description: 'Stroked lines for linear features',
          compatible_source_layers: [
            'road',
            'admin',
            'waterway',
            'aeroway',
            'structure'
          ],
          common_uses: [
            'Styling roads and highways',
            'Drawing administrative boundaries',
            'Showing rivers and canals',
            'Displaying airport runways'
          ]
        },
        symbol: {
          description: 'Text labels and/or icons',
          compatible_source_layers: [
            'place_label',
            'poi_label',
            'airport_label',
            'transit_stop_label',
            'natural_label',
            'motorway_junction',
            'housenum_label'
          ],
          common_uses: [
            'Displaying place names and city labels',
            'Showing POI icons and labels',
            'Adding custom icons to points',
            'Labeling features with text'
          ]
        },
        circle: {
          description: 'Circular points with configurable radius',
          compatible_source_layers: [
            'place_label',
            'poi_label',
            'airport_label',
            'transit_stop_label',
            'motorway_junction'
          ],
          common_uses: [
            'Creating simple point markers',
            'Heatmap-style visualizations',
            'Highlighting specific locations'
          ]
        },
        'fill-extrusion': {
          description: '3D extruded polygons (typically buildings)',
          compatible_source_layers: ['building'],
          common_uses: [
            'Creating 3D building visualizations',
            'Extruding buildings by height',
            'Making 3D city views'
          ],
          required_fields: ['height', 'extrude']
        }
      },
      common_patterns: {
        styling_parks: {
          source_layer: 'landuse',
          filter_by: { class: 'park' },
          layer_type: 'fill',
          example:
            'Use fill layer on landuse source layer with filter ["==", ["get", "class"], "park"]'
        },
        styling_roads: {
          source_layer: 'road',
          filter_by: { class: ['motorway', 'trunk', 'primary'] },
          layer_type: 'line',
          example:
            'Use line layer on road source layer with filter ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]]'
        },
        labeling_cities: {
          source_layer: 'place_label',
          filter_by: { type: ['city', 'town'] },
          layer_type: 'symbol',
          example:
            'Use symbol layer on place_label source layer with text-field: ["get", "name"]'
        },
        building_extrusions: {
          source_layer: 'building',
          filter_by: { extrude: 'true' },
          layer_type: 'fill-extrusion',
          example:
            'Use fill-extrusion layer on building source layer with fill-extrusion-height: ["get", "height"]'
        }
      },
      notes: [
        'Source layers are defined by the Mapbox Streets v8 tileset',
        'Layer types are defined by the Mapbox GL JS specification',
        'Not all source layers work with all layer types - match geometry types',
        'Use the Mapbox Streets v8 Fields Reference resource to see available filter fields'
      ]
    };

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: this.mimeType,
          text: JSON.stringify(mapping, null, 2)
        }
      ]
    };
  }
}
