import { describe, it, expect, beforeEach } from 'vitest';
import { StyleBuilderTool } from '../../../src/tools/style-builder-tool/StyleBuilderTool.js';
import type { StyleBuilderToolInput } from '../../../src/tools/style-builder-tool/StyleBuilderTool.schema.js';

describe('StyleBuilderTool', () => {
  let tool: StyleBuilderTool;

  beforeEach(() => {
    tool = new StyleBuilderTool();
  });

  describe('basic functionality', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('style_builder_tool');
      expect(tool.description).toContain('Generate Mapbox style JSON');
    });

    it('should build a basic style with water layer', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Test Style',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0066ff'
          }
        ]
      };

      const result = await tool.execute(input);

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('Style Built Successfully');
      expect(text).toContain('Test Style');
      expect(text).toContain('"#0066ff"');
    });

    it('should handle dark mode', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Dark Mode Style',
        base_style: 'streets', // Use classic style to test background color
        layers: [],
        global_settings: {
          mode: 'dark',
          background_color: '#000000'
        }
      };

      const result = await tool.execute(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('Mode:** dark');
      expect(text).toContain('#000000');
    });
  });

  describe('layer actions', () => {
    it('should handle color action', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Color Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'primary_roads',
            action: 'color',
            color: '#ff0000'
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      expect(result.isError).toBe(false);
      expect(text).toContain('#ff0000');
    });

    it('should handle highlight action', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Highlight Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'railways',
            action: 'highlight',
            color: '#ffff00',
            width: 5
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      expect(result.isError).toBe(false);
      expect(text).toContain('Highlighted');
      expect(text).toContain('#ffff00');
    });

    it('should handle hide action', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Hide Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'place_labels',
            action: 'hide'
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      expect(result.isError).toBe(false);
      expect(text).toContain('Hidden');
    });

    it('should handle show action', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Show Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'buildings',
            action: 'show'
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      expect(result.isError).toBe(false);
      expect(text).toContain('Shown');
    });
  });

  describe('administrative boundaries', () => {
    it('should handle country boundaries with correct filters', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Country Boundaries Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'country_boundaries',
            action: 'color',
            color: '#ff0000',
            width: 3
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      expect(result.isError).toBe(false);

      // Extract JSON from result
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      expect(jsonMatch).toBeTruthy();

      const style = JSON.parse(jsonMatch![1]);

      // Find the country boundaries layer
      const countryLayer = style.layers.find(
        (l: any) => l.id === 'admin-0-boundary-custom'
      );
      expect(countryLayer).toBeTruthy();
      expect(countryLayer['source-layer']).toBe('admin');

      // Check filter includes admin_level
      const filterStr = JSON.stringify(countryLayer.filter);
      expect(filterStr).toContain('admin_level');
      expect(filterStr).toContain('0');
      expect(filterStr).toContain('maritime');
      expect(filterStr).toContain('false');
    });

    it('should handle state boundaries', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'State Boundaries Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'state_boundaries',
            action: 'color',
            color: '#0000ff',
            opacity: 0.5
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      expect(result.isError).toBe(false);

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const stateLayer = style.layers.find(
        (l: any) => l.id === 'admin-1-boundary-custom'
      );
      expect(stateLayer).toBeTruthy();
      expect(stateLayer['source-layer']).toBe('admin');

      const filterStr = JSON.stringify(stateLayer.filter);
      expect(filterStr).toContain('admin_level');
      expect(filterStr).toContain('1');
    });
  });

  describe('style generation', () => {
    it('should generate valid Mapbox style JSON', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Valid Style Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff'
          },
          {
            layer_type: 'parks',
            action: 'color',
            color: '#00ff00'
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      expect(jsonMatch).toBeTruthy();

      const style = JSON.parse(jsonMatch![1]);

      // Check basic style structure
      expect(style.version).toBe(8);
      expect(style.name).toBe('Valid Style Test');
      // For standard style, check imports instead of sources
      expect(style.imports).toBeTruthy();
      expect(Array.isArray(style.imports)).toBe(true);
      expect(style.imports[0]).toEqual({
        id: 'basemap',
        url: 'mapbox://styles/mapbox/standard'
      });
      expect(Array.isArray(style.layers)).toBe(true);

      // Standard styles don't have background layers (provided by import)
      // Only check for background in non-standard styles
      if (input.base_style !== 'standard') {
        const bgLayer = style.layers.find((l: any) => l.id === 'background');
        expect(bgLayer).toBeTruthy();
      }
    });

    it('should include only background layer when no layers specified', async () => {
      // Test with classic style
      const input: StyleBuilderToolInput = {
        style_name: 'Essential Layers Test',
        base_style: 'streets', // Use classic style
        layers: [] // No layers specified
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      // Classic styles should only have background when no layers specified
      expect(style.layers.length).toBe(1);

      const bgLayer = style.layers.find((l: any) => l.id === 'background');
      expect(bgLayer).toBeTruthy();
    });
  });

  describe('error handling', () => {
    it('should handle unknown layer types gracefully', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Unknown Layer Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'unknown_layer' as any,
            action: 'color',
            color: '#ff0000'
          }
        ]
      };

      const result = await tool.execute(input);

      // Should not error, just skip unknown layer
      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('Style Built Successfully');
    });

    it('should handle custom filters', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Custom Filter Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'motorways',
            action: 'color',
            color: '#ff0000',
            filter: ['==', ['get', 'class'], 'motorway']
          }
        ]
      };

      const result = await tool.execute(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const motorwayLayer = style.layers.find(
        (l: any) => l.id && l.id.includes('motorway')
      );
      expect(motorwayLayer).toBeTruthy();
      expect(JSON.stringify(motorwayLayer.filter)).toContain('motorway');
    });
  });

  describe('expression generation', () => {
    it('should generate zoom-based expressions', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Zoom Expression Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'motorways',
            action: 'color',
            color: '#ff0000',
            width: 3,
            zoom_based: true,
            min_zoom: 10,
            max_zoom: 18
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const motorwayLayer = style.layers.find((l: any) =>
        l.id.includes('motorway')
      );
      expect(motorwayLayer).toBeTruthy();

      // Check for zoom interpolation in line-width
      const lineWidth = motorwayLayer.paint['line-width'];
      expect(Array.isArray(lineWidth)).toBe(true);
      expect(lineWidth[0]).toBe('interpolate');
      expect(lineWidth[2]).toEqual(['zoom']);
    });

    it('should generate data-driven expressions', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Data Driven Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'primary_roads',
            action: 'color',
            color: '#000000',
            property_based: 'class',
            property_values: {
              motorway: '#ff0000',
              primary: '#ff8800',
              secondary: '#ffff00'
            }
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const roadLayer = style.layers.find((l: any) => l.id.includes('primary'));
      expect(roadLayer).toBeTruthy();

      // Check for match expression in line-color
      const lineColor = roadLayer.paint['line-color'];
      expect(Array.isArray(lineColor)).toBe(true);
      expect(lineColor[0]).toBe('match');
      expect(lineColor[1]).toEqual(['get', 'class']);
      expect(lineColor).toContain('motorway');
      expect(lineColor).toContain('#ff0000');
    });

    it('should handle custom expressions', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Custom Expression Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'buildings',
            action: 'color',
            color: '#808080',
            expression: [
              'case',
              ['>', ['get', 'height'], 100],
              '#ff0000',
              ['>', ['get', 'height'], 50],
              '#ff8800',
              '#808080'
            ]
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const buildingLayer = style.layers.find((l: any) =>
        l.id.includes('building')
      );
      expect(buildingLayer).toBeTruthy();

      // Check for case expression
      const fillColor = buildingLayer.paint['fill-color'];
      expect(Array.isArray(fillColor)).toBe(true);
      expect(fillColor[0]).toBe('case');
    });

    it('should generate opacity interpolation with zoom', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Opacity Zoom Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'buildings',
            action: 'show',
            opacity: 0.8,
            zoom_based: true,
            min_zoom: 14,
            max_zoom: 16
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const buildingLayer = style.layers.find((l: any) =>
        l.id.includes('building')
      );
      expect(buildingLayer).toBeTruthy();

      // Check for opacity interpolation
      const fillOpacity = buildingLayer.paint['fill-opacity'];
      expect(Array.isArray(fillOpacity)).toBe(true);
      expect(fillOpacity[0]).toBe('interpolate');
      expect(fillOpacity[2]).toEqual(['zoom']);
      expect(fillOpacity).toContain(14);
      expect(fillOpacity).toContain(16);
    });
  });

  describe('transit filtering', () => {
    it('should filter transit stops by maki type', async () => {
      const tool = new StyleBuilderTool();
      const input: StyleBuilderToolInput = {
        style_name: 'Transit Test',
        base_style: 'streets',
        layers: [
          {
            layer_type: 'transit',
            action: 'color',
            color: '#ff0000',
            filter_properties: {
              maki: 'bus'
            }
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const styleJson = JSON.parse(
        result.content[0].text.match(/```json\n([\s\S]*?)\n```/)![1]
      );

      const transitLayer = styleJson.layers.find((l: any) =>
        l.id.includes('transit')
      );
      expect(transitLayer).toBeDefined();
      expect(transitLayer.filter).toEqual([
        'match',
        ['get', 'maki'],
        ['bus'],
        true,
        false
      ]);
    });

    it('should filter multiple transit types', async () => {
      const tool = new StyleBuilderTool();
      const input: StyleBuilderToolInput = {
        style_name: 'Multi Transit Test',
        base_style: 'streets',
        layers: [
          {
            layer_type: 'transit',
            action: 'highlight',
            filter_properties: {
              maki: ['bus', 'entrance', 'rail-metro']
            }
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const styleJson = JSON.parse(
        result.content[0].text.match(/```json\n([\s\S]*?)\n```/)![1]
      );

      const transitLayer = styleJson.layers.find((l: any) =>
        l.id.includes('transit')
      );
      expect(transitLayer).toBeDefined();
      expect(transitLayer.filter).toEqual([
        'match',
        ['get', 'maki'],
        ['bus', 'entrance', 'rail-metro'],
        true,
        false
      ]);
    });
  });

  describe('comprehensive filtering', () => {
    it('should filter toll roads correctly', async () => {
      const tool = new StyleBuilderTool();
      const input: StyleBuilderToolInput = {
        style_name: 'Toll Roads Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'road',
            action: 'highlight',
            color: '#9370DB',
            filter_properties: {
              toll: true
            }
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const styleJson = JSON.parse(
        result.content[0].text.match(/```json\n([\s\S]*?)\n```/)![1]
      );

      const roadsLayer = styleJson.layers.find((l: any) =>
        l.id.includes('road-toll-true')
      );
      expect(roadsLayer).toBeDefined();
      // Should have 'has' filter for toll
      expect(roadsLayer.filter).toEqual(['has', 'toll']);
      expect(roadsLayer.paint['line-color']).toBe('#9370DB');
    });

    it('should filter roads by class', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Motorway Filter Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'motorways',
            action: 'color',
            color: '#ff0000',
            filter_properties: {
              class: 'motorway'
            }
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const motorwayLayer = style.layers.find((l: any) =>
        l.id.includes('motorway')
      );
      expect(motorwayLayer).toBeTruthy();
      expect(motorwayLayer.filter).toBeTruthy();
      expect(JSON.stringify(motorwayLayer.filter)).toContain('motorway');
    });

    it('should filter by multiple properties', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Bridge Motorways Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'motorways',
            action: 'highlight',
            color: '#ff0000',
            filter_properties: {
              class: ['motorway', 'trunk'],
              structure: 'bridge'
            }
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const layer = style.layers.find((l: any) => l.id.includes('motorway'));
      expect(layer).toBeTruthy();

      // Check filter includes both class and structure
      const filterStr = JSON.stringify(layer.filter);
      expect(filterStr).toContain('structure');
      expect(filterStr).toContain('bridge');
      expect(filterStr).toContain('class');
    });

    it('should filter admin boundaries correctly', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Undisputed Countries Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'country_boundaries',
            action: 'color',
            color: '#0000ff',
            filter_properties: {
              admin_level: 0,
              disputed: 'false',
              maritime: 'false'
            }
          }
        ]
      };

      const result = await tool.execute(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text;
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const layer = style.layers.find((l: any) => l.id.includes('admin'));
      expect(layer).toBeTruthy();

      const filterStr = JSON.stringify(layer.filter);
      expect(filterStr).toContain('admin_level');
      expect(filterStr).toContain('0');
      expect(filterStr).toContain('disputed');
      expect(filterStr).toContain('false');
    });
  });

  describe('style types', () => {
    it('should generate Standard style with imports', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Standard Style Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff'
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      // Check that Standard style uses imports
      expect(style.imports).toBeTruthy();
      expect(Array.isArray(style.imports)).toBe(true);
      expect(style.imports[0]).toEqual({
        id: 'basemap',
        url: 'mapbox://styles/mapbox/standard'
      });
      // Should have sources defined (required by spec)
      // With custom layers, it needs composite source
      expect(style.sources).toBeDefined();
      expect(style.sources.composite).toBeDefined();

      // Check that layers have slot property for Standard style
      style.layers.forEach((layer: any) => {
        expect(layer.slot).toBeDefined();
        // Water is not a road or label, so it should default to 'middle'
        expect(layer.slot).toBe('middle');
      });
    });

    it('should generate Standard style with configuration', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Standard Config Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff'
          }
        ],
        standard_config: {
          // Visibility settings
          showPlaceLabels: false,
          showRoadLabels: false,
          showTransitLabels: true,
          showPedestrianRoads: false,
          show3dObjects: true,
          showAdminBoundaries: true,

          // Theme settings
          theme: 'faded',
          lightPreset: 'dusk',

          // Color overrides
          colorMotorways: '#ff0000',
          colorTrunks: '#ff6600',
          colorRoads: '#ffaa00',
          colorWater: '#0066cc',
          colorGreenspace: '#00cc00',
          colorAdminBoundaries: '#9966cc',

          // Density settings
          densityPointOfInterestLabels: 5
        }
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      expect(text).toContain('Standard Config:** 15 properties set');
      expect(text).toContain('Theme: faded');
      expect(text).toContain('Light preset: dusk');

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      // Check that Standard style uses imports with config
      expect(style.imports).toBeTruthy();
      expect(Array.isArray(style.imports)).toBe(true);
      expect(style.imports[0].id).toBe('basemap');
      expect(style.imports[0].url).toBe('mapbox://styles/mapbox/standard');

      // Check that config properties are included
      const config = style.imports[0].config;
      expect(config).toBeTruthy();
      expect(config.showPlaceLabels).toBe(false);
      expect(config.showRoadLabels).toBe(false);
      expect(config.showTransitLabels).toBe(true);
      expect(config.theme).toBe('faded');
      expect(config.lightPreset).toBe('dusk');
      expect(config.colorMotorways).toBe('#ff0000');
      expect(config.colorWater).toBe('#0066cc');
      expect(config.densityPointOfInterestLabels).toBe(5);
    });

    it('should generate Classic style with sources', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Classic Style Test',
        base_style: 'streets',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff'
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      // Check that Classic style uses traditional sources
      expect(style.sources).toBeTruthy();
      expect(style.sources.composite).toBeTruthy();
      expect(style.sources.composite.url).toBe(
        'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2'
      );
      expect(style.sprite).toContain('streets-v12');
      expect(style.glyphs).toContain('mapbox://fonts');
      // Should not have imports for classic styles
      expect(style.imports).toBeUndefined();

      // Classic styles should not have slot property
      style.layers.forEach((layer: any) => {
        expect(layer.slot).toBeUndefined();
      });
    });

    it('should use custom slot for Standard style layers', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Custom Slot Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff',
            slot: 'bottom'
          },
          {
            layer_type: 'parks',
            action: 'color',
            color: '#00ff00',
            slot: 'middle'
          },
          {
            layer_type: 'poi_labels',
            action: 'show',
            slot: 'top'
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      // Check that layers have correct custom slots
      // Note: layer IDs include the original layer ID plus '-custom' suffix
      const waterLayer = style.layers.find((l: any) => l.id === 'water-custom');
      const parksLayer = style.layers.find(
        (l: any) => l.id === 'landuse_park-custom'
      );
      const poiLayer = style.layers.find(
        (l: any) => l.id === 'poi-label-custom'
      );

      expect(waterLayer).toBeTruthy();
      expect(parksLayer).toBeTruthy();
      expect(poiLayer).toBeTruthy();

      expect(waterLayer.slot).toBe('bottom');
      expect(parksLayer.slot).toBe('middle');
      expect(poiLayer.slot).toBe('top');
    });

    it('should generate Blank style with sources but no imports', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Blank Style Test',
        base_style: 'blank',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff'
          }
        ]
      };

      const result = await tool.execute(input);
      const text = result.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      // Check that Blank style has sources but no imports
      expect(style.sources).toBeTruthy();
      expect(style.sources.composite).toBeTruthy();
      expect(style.sprite).toContain('streets-v12');
      expect(style.glyphs).toContain('mapbox://fonts');
      expect(style.imports).toBeUndefined();

      // Blank styles should not have slot property
      style.layers.forEach((layer: any) => {
        expect(layer.slot).toBeUndefined();
      });
    });
  });

  describe('layer auto-correction', () => {
    it('should auto-correct landcover to landuse_overlay for wetlands', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Wetlands Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'landcover', // Wrong layer type
            action: 'color',
            color: '#00ff00',
            filter_properties: {
              type: ['wetland', 'swamp']
            }
          }
        ]
      };

      const result = await tool.execute(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('Auto-corrections Applied');
      expect(text).toContain('Using "landuse_overlay" instead');

      // Check the generated style JSON
      const jsonMatch = text.match(/```json\n([\s\S]+?)\n```/);
      expect(jsonMatch).toBeTruthy();
      const style = JSON.parse(jsonMatch![1]);

      // Find the generated layer
      const wetlandLayer = style.layers.find(
        (l: any) => l['source-layer'] === 'landuse_overlay'
      );
      expect(wetlandLayer).toBeTruthy();

      // The filter should be a Mapbox expression like ['match', ['get', 'type'], ['wetland', 'swamp'], true, false]
      expect(wetlandLayer.filter).toBeTruthy();
      expect(wetlandLayer.filter[0]).toBe('match'); // Expression type
      expect(wetlandLayer.filter[1]).toEqual(['get', 'type']); // Field accessor
      expect(wetlandLayer.filter[2]).toContain('wetland'); // Values to match
      expect(wetlandLayer.filter[2]).toContain('swamp');
    });

    it('should find correct layer based on filter field and value', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Field Resolution Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'unknown', // Completely unknown layer
            action: 'color',
            color: '#ff0000',
            filter_properties: {
              maki: 'restaurant' // This field only exists in poi_label
            }
          }
        ]
      };

      const result = await tool.execute(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('Auto-corrections Applied');
      expect(text).toContain('Using "poi_label" instead');
    });
  });

  describe('multiple layers', () => {
    it('should handle multiple layers with different actions', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Multi Layer Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0066ff'
          },
          {
            layer_type: 'parks',
            action: 'highlight',
            color: '#00ff00'
          },
          {
            layer_type: 'place_labels',
            action: 'hide'
          },
          {
            layer_type: 'buildings',
            action: 'show'
          }
        ]
      };

      const result = await tool.execute(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text;

      expect(text).toContain('Layers Configured:** 4');
      expect(text).toContain('Set to #0066ff');
      expect(text).toContain('Highlighted');
      expect(text).toContain('Hidden');
      expect(text).toContain('Shown');
    });
  });
});
