// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { MapboxLayerTypeMappingResource } from '../../src/resources/mapbox-layer-type-mapping-resource/MapboxLayerTypeMappingResource.js';

describe('MapboxLayerTypeMappingResource', () => {
  let resource: MapboxLayerTypeMappingResource;

  beforeEach(() => {
    resource = new MapboxLayerTypeMappingResource();
  });

  describe('basic properties', () => {
    it('should have correct name and URI', () => {
      expect(resource.name).toBe('Mapbox Layer Type Mapping');
      expect(resource.uri).toBe('resource://mapbox-layer-type-mapping');
      expect(resource.mimeType).toBe('application/json');
    });

    it('should have a description', () => {
      expect(resource.description).toContain('source layers');
      expect(resource.description).toContain('layer types');
    });
  });

  describe('readCallback', () => {
    it('should return JSON content', async () => {
      const uri = new URL('resource://mapbox-layer-type-mapping');
      const result = await resource['readCallback'](uri, {});

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe(uri.href);
      expect(result.contents[0].mimeType).toBe('application/json');

      // Verify it's valid JSON
      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed).toBeDefined();
    });

    it('should include geometry type mappings', async () => {
      const uri = new URL('resource://mapbox-layer-type-mapping');
      const result = await resource['readCallback'](uri, {});
      const mapping = JSON.parse(result.contents[0].text);

      expect(mapping.geometry_types).toBeDefined();
      expect(mapping.geometry_types.polygon).toBeDefined();
      expect(mapping.geometry_types.line).toBeDefined();
      expect(mapping.geometry_types.point).toBeDefined();
    });

    it('should map polygon source layers correctly', async () => {
      const uri = new URL('resource://mapbox-layer-type-mapping');
      const result = await resource['readCallback'](uri, {});
      const mapping = JSON.parse(result.contents[0].text);

      const polygonLayers = mapping.geometry_types.polygon.source_layers;
      expect(polygonLayers).toContain('landuse');
      expect(polygonLayers).toContain('water');
      expect(polygonLayers).toContain('building');
      expect(polygonLayers).toContain('landuse_overlay');

      const compatibleTypes =
        mapping.geometry_types.polygon.compatible_layer_types;
      expect(compatibleTypes).toContain('fill');
      expect(compatibleTypes).toContain('fill-extrusion');
    });

    it('should map line source layers correctly', async () => {
      const uri = new URL('resource://mapbox-layer-type-mapping');
      const result = await resource['readCallback'](uri, {});
      const mapping = JSON.parse(result.contents[0].text);

      const lineLayers = mapping.geometry_types.line.source_layers;
      expect(lineLayers).toContain('road');
      expect(lineLayers).toContain('admin');
      expect(lineLayers).toContain('waterway');

      const compatibleTypes =
        mapping.geometry_types.line.compatible_layer_types;
      expect(compatibleTypes).toContain('line');
    });

    it('should map point source layers correctly', async () => {
      const uri = new URL('resource://mapbox-layer-type-mapping');
      const result = await resource['readCallback'](uri, {});
      const mapping = JSON.parse(result.contents[0].text);

      const pointLayers = mapping.geometry_types.point.source_layers;
      expect(pointLayers).toContain('place_label');
      expect(pointLayers).toContain('poi_label');
      expect(pointLayers).toContain('airport_label');

      const compatibleTypes =
        mapping.geometry_types.point.compatible_layer_types;
      expect(compatibleTypes).toContain('symbol');
      expect(compatibleTypes).toContain('circle');
    });

    it('should include layer type compatibility details', async () => {
      const uri = new URL('resource://mapbox-layer-type-mapping');
      const result = await resource['readCallback'](uri, {});
      const mapping = JSON.parse(result.contents[0].text);

      expect(mapping.layer_type_compatibility).toBeDefined();
      expect(mapping.layer_type_compatibility.fill).toBeDefined();
      expect(mapping.layer_type_compatibility.line).toBeDefined();
      expect(mapping.layer_type_compatibility.symbol).toBeDefined();
      expect(mapping.layer_type_compatibility.circle).toBeDefined();
      expect(mapping.layer_type_compatibility['fill-extrusion']).toBeDefined();
    });

    it('should include common usage patterns', async () => {
      const uri = new URL('resource://mapbox-layer-type-mapping');
      const result = await resource['readCallback'](uri, {});
      const mapping = JSON.parse(result.contents[0].text);

      expect(mapping.layer_type_compatibility.fill.common_uses).toBeDefined();
      expect(
        mapping.layer_type_compatibility.fill.common_uses.length
      ).toBeGreaterThan(0);
    });

    it('should include common patterns examples', async () => {
      const uri = new URL('resource://mapbox-layer-type-mapping');
      const result = await resource['readCallback'](uri, {});
      const mapping = JSON.parse(result.contents[0].text);

      expect(mapping.common_patterns).toBeDefined();
      expect(mapping.common_patterns.styling_parks).toBeDefined();
      expect(mapping.common_patterns.styling_roads).toBeDefined();
      expect(mapping.common_patterns.labeling_cities).toBeDefined();
      expect(mapping.common_patterns.building_extrusions).toBeDefined();
    });

    it('should include helpful notes', async () => {
      const uri = new URL('resource://mapbox-layer-type-mapping');
      const result = await resource['readCallback'](uri, {});
      const mapping = JSON.parse(result.contents[0].text);

      expect(mapping.notes).toBeDefined();
      expect(Array.isArray(mapping.notes)).toBe(true);
      expect(mapping.notes.length).toBeGreaterThan(0);
    });
  });
});
