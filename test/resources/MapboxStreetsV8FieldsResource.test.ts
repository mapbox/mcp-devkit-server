// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { MapboxStreetsV8FieldsResource } from '../../src/resources/mapbox-streets-v8-fields-resource/MapboxStreetsV8FieldsResource.js';
import { STREETS_V8_FIELDS } from '../../src/constants/mapboxStreetsV8Fields.trimmed.js';

describe('MapboxStreetsV8FieldsResource', () => {
  let resource: MapboxStreetsV8FieldsResource;

  beforeEach(() => {
    resource = new MapboxStreetsV8FieldsResource();
  });

  describe('basic properties', () => {
    it('should have correct name and URI', () => {
      expect(resource.name).toBe('Mapbox Streets v8 Fields Reference');
      expect(resource.uri).toBe('resource://mapbox-streets-v8-fields');
      expect(resource.mimeType).toBe('application/json');
    });

    it('should have a description', () => {
      expect(resource.description).toContain('Streets v8 source layers');
      expect(resource.description).toContain('field definitions');
    });
  });

  describe('readCallback', () => {
    it('should return STREETS_V8_FIELDS as JSON', async () => {
      const uri = new URL('resource://mapbox-streets-v8-fields');
      const result = await resource['readCallback'](uri, {});

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe(uri.href);
      expect(result.contents[0].mimeType).toBe('application/json');

      // Parse the JSON and verify it matches STREETS_V8_FIELDS
      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed).toEqual(STREETS_V8_FIELDS);
    });

    it('should include known source layers', async () => {
      const uri = new URL('resource://mapbox-streets-v8-fields');
      const result = await resource['readCallback'](uri, {});
      const parsed = JSON.parse(result.contents[0].text);

      // Verify some key source layers exist
      expect(parsed.landuse).toBeDefined();
      expect(parsed.road).toBeDefined();
      expect(parsed.water).toBeDefined();
      expect(parsed.building).toBeDefined();
      expect(parsed.poi_label).toBeDefined();
    });

    it('should include field definitions with values', async () => {
      const uri = new URL('resource://mapbox-streets-v8-fields');
      const result = await resource['readCallback'](uri, {});
      const parsed = JSON.parse(result.contents[0].text);

      // Check that landuse has class field with values
      expect(parsed.landuse.class).toBeDefined();
      expect(parsed.landuse.class.values).toBeInstanceOf(Array);
      expect(parsed.landuse.class.values).toContain('park');

      // Check that road has class field with values
      expect(parsed.road.class).toBeDefined();
      expect(parsed.road.class.values).toContain('motorway');
    });
  });
});
