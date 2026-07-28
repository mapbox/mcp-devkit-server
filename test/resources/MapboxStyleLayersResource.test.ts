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

  describe('Mapbox Standard guidance', () => {
    const readMarkdown = async () => {
      const result = await resource.readCallback(
        new URL('resource://mapbox-style-layers'),
        undefined
      );
      return result.contents[0].text as string;
    };

    it('should document all three slots and what belongs in each', async () => {
      const markdown = await readMarkdown();

      expect(markdown).toContain('`bottom`');
      expect(markdown).toContain('`middle`');
      expect(markdown).toContain('`top`');

      // Omitting slot is a defect, not a neutral default — the guide has to say so.
      expect(markdown).toContain('street labels');
    });

    it('should document emissive strength for fill, line and circle', async () => {
      const markdown = await readMarkdown();

      expect(markdown).toContain('fill-emissive-strength');
      expect(markdown).toContain('line-emissive-strength');
      expect(markdown).toContain('circle-emissive-strength');

      // The reason it matters is the default, so the guide must state it.
      expect(markdown).toContain('night');
    });

    it('should document line-occlusion-opacity for routes', async () => {
      const markdown = await readMarkdown();
      expect(markdown).toContain('line-occlusion-opacity');
    });

    it('should not send callers chasing emissive strength on symbol layers', async () => {
      const markdown = await readMarkdown();

      // icon- and text-emissive-strength already default to 1, so symbol layers are
      // safe as-is. This was the factual error worth being explicit about.
      expect(markdown).toContain('Symbol layers need nothing');
    });
  });
});
