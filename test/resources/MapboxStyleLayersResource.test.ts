import { describe, it, expect, beforeEach } from 'vitest';
import { MapboxStyleLayersResource } from '../../src/resources/mapbox-style-layers-resource/MapboxStyleLayersResource.js';

describe('MapboxStyleLayersResource', () => {
  let resource: MapboxStyleLayersResource;

  beforeEach(() => {
    resource = new MapboxStyleLayersResource();
  });

  describe('basic properties', () => {
    it('should have correct name and URI', () => {
      expect(resource.name).toBe('Mapbox Style Specification Guide');
      expect(resource.uri).toBe('resource://mapbox-style-layers');
      expect(resource.mimeType).toBe('text/markdown');
    });

    it('should have a description', () => {
      expect(resource.description).toContain(
        'Mapbox GL JS style specification reference'
      );
    });
  });
});
