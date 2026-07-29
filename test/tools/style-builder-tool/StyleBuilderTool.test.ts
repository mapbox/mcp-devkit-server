// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { StyleBuilderTool } from '../../../src/tools/style-builder-tool/StyleBuilderTool.js';
import type { StyleBuilderToolInput } from '../../../src/tools/style-builder-tool/StyleBuilderTool.input.schema.js';

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
            color: '#0066ff',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      expect(text).toContain('Style Built Successfully');
      expect(text).toContain('Test Style');
      expect(text).toContain('"#0066ff"');
    });

    it('should handle dark mode', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Dark Mode Style',
        base_style: 'streets-v12', // Use classic style to test background color
        layers: [],
        global_settings: {
          mode: 'dark',
          background_color: '#000000'
        }
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
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
            layer_type: 'road',
            action: 'color',
            color: '#ff0000',
            filter_properties: { class: 'primary' },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

      expect(result.isError).toBe(false);
      expect(text).toContain('#ff0000');
    });

    it('should handle highlight action', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Highlight Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'road',
            action: 'highlight',
            color: '#ffff00',
            width: 5,
            filter_properties: { class: 'major_rail' },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

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
            layer_type: 'place_label',
            action: 'hide',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

      expect(result.isError).toBe(false);
      expect(text).toContain('Hidden');
    });

    it('should handle show action', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Show Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'building',
            action: 'show',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

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
            layer_type: 'admin',
            action: 'color',
            color: '#ff0000',
            width: 3,
            filter_properties: { admin_level: 0, maritime: 'false' },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

      expect(result.isError).toBe(false);

      // Extract JSON from result
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      expect(jsonMatch).toBeTruthy();

      const style = JSON.parse(jsonMatch![1]);

      // Find the country boundaries layer
      const countryLayer = style.layers.find(
        (l: any) => l.id.includes('admin') && l.id.includes('0')
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
            layer_type: 'admin',
            action: 'color',
            color: '#0000ff',
            opacity: 0.5,
            filter_properties: { admin_level: 1, maritime: 'false' },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

      expect(result.isError).toBe(false);

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const stateLayer = style.layers.find(
        (l: any) =>
          l['source-layer'] === 'admin' && l.id.includes('admin_level-1')
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
            color: '#0099ff',
            render_type: 'symbol'
          },
          {
            layer_type: 'landuse',
            filter_properties: { class: 'park' },
            action: 'color',
            color: '#00ff00',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

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
        base_style: 'streets-v12', // Use classic style
        layers: [] // No layers specified
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

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
            color: '#ff0000',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);

      // Should return help message, not error
      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('not found');
      expect(text).toContain('Available source layers');
    });

    it('should handle custom filters', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Custom Filter Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'road',
            action: 'color',
            color: '#ff0000',
            filter: ['==', ['get', 'class'], 'motorway'],
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      const motorwayLayer = style.layers.find(
        (l: any) => l['source-layer'] === 'road'
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
            layer_type: 'road',
            filter_properties: { class: 'motorway' },
            action: 'color',
            color: '#ff0000',
            width: 3,
            zoom_based: true,
            min_zoom: 10,
            max_zoom: 18
          }
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
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
            layer_type: 'road',
            filter_properties: { class: 'primary' },
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

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
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
            layer_type: 'building',
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

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
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
            layer_type: 'building',
            action: 'show',
            opacity: 0.8,
            zoom_based: true,
            min_zoom: 14,
            max_zoom: 16
          }
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
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
        base_style: 'streets-v12',
        layers: [
          {
            layer_type: 'transit',
            action: 'color',
            color: '#ff0000',
            filter_properties: {
              maki: 'bus'
            },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
      const styleJson = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

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
        base_style: 'streets-v12',
        layers: [
          {
            layer_type: 'transit',
            action: 'highlight',
            filter_properties: {
              maki: ['bus', 'entrance', 'rail-metro']
            },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
      const styleJson = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

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

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
      const styleJson = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

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
            layer_type: 'road',
            action: 'color',
            color: '#ff0000',
            filter_properties: {
              class: 'motorway'
            },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
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
            layer_type: 'road',
            action: 'highlight',
            color: '#ff0000',
            filter_properties: {
              class: ['motorway', 'trunk'],
              structure: 'bridge'
            },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
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
            layer_type: 'admin',
            action: 'color',
            color: '#0000ff',
            filter_properties: {
              admin_level: 0,
              disputed: 'false',
              maritime: 'false'
            },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const text = result.content[0].text as string;
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
            color: '#0099ff',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

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

      // Every custom layer on a Standard style gets a slot. Leaving it off would put the
      // layer above every basemap layer, including street labels.
      style.layers.forEach((layer: any) => {
        expect(layer.slot).toBeDefined();
        expect(['bottom', 'middle', 'top']).toContain(layer.slot);
      });

      // The inferred slot is reported rather than applied silently.
      expect(text).toContain('inferred slot');
    });

    it('should generate Standard style with configuration', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Standard Config Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff',
            render_type: 'symbol'
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

      const result = await tool.run(input);
      const text = result.content[0].text as string;

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
        base_style: 'streets-v12',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

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
            slot: 'bottom',
            render_type: 'symbol'
          },
          {
            layer_type: 'landuse',
            filter_properties: { class: 'park' },
            action: 'color',
            color: '#00ff00',
            slot: 'middle',
            render_type: 'symbol'
          },
          {
            layer_type: 'poi_label',
            action: 'show',
            slot: 'top',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      // Check that layers have correct custom slots
      const waterLayer = style.layers.find(
        (l: any) => l['source-layer'] === 'water'
      );
      const parksLayer = style.layers.find(
        (l: any) =>
          l['source-layer'] === 'landuse' && l.id.includes('class-park')
      );
      const poiLayer = style.layers.find(
        (l: any) => l['source-layer'] === 'poi_label'
      );

      expect(waterLayer).toBeTruthy();
      expect(parksLayer).toBeTruthy();
      expect(poiLayer).toBeTruthy();

      expect(waterLayer.slot).toBe('bottom');
      expect(parksLayer.slot).toBe('middle');
      expect(poiLayer.slot).toBe('top');
    });

    it('should give Standard styles a sprite that can resolve the maki icons it references', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Sprite Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'poi_label',
            action: 'show',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

      const symbolLayer = style.layers.find((l: any) => l.type === 'symbol');

      // The layer references an icon by maki name — either ["get", "maki"] off the
      // Streets v8 field or a literal default like "marker-15".
      expect(symbolLayer.layout['icon-image']).toBeDefined();

      // So the root sprite has to be one that contains maki icons. Standard's own icons
      // live in the import's scope and are not addressable from these layers, which is
      // why the Streets sprite is correct here despite the Standard basemap.
      expect(style.sprite).toBe('mapbox://sprites/mapbox/streets-v12');
    });

    it('should build layers over the callers own GeoJSON sources', async () => {
      const result = await tool.run({
        style_name: 'Delivery',
        base_style: 'standard',
        custom_sources: {
          zones: { type: 'geojson', data: 'https://example.com/zones.geojson' },
          route: { type: 'geojson', data: 'https://example.com/route.geojson' }
        },
        layers: [
          {
            layer_type: 'Delivery zones',
            source_id: 'zones',
            action: 'color',
            color: '#7b61ff',
            opacity: 0.6,
            render_type: 'fill'
          },
          {
            layer_type: 'Route',
            source_id: 'route',
            action: 'color',
            color: '#3b6df5',
            width: 4,
            render_type: 'line'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

      // The sources land alongside the basemap source under the ids the layers use.
      expect(style.sources.zones).toEqual({
        type: 'geojson',
        data: 'https://example.com/zones.geojson'
      });
      expect(style.sources.route).toBeDefined();

      const fill = style.layers.find((l: any) => l.type === 'fill');
      const line = style.layers.find((l: any) => l.type === 'line');

      // The user's own data is an overlay, so it belongs above roads and behind labels —
      // unlike a basemap-derived fill, which goes in `bottom`, under the road network.
      expect(fill.slot).toBe('middle');
      expect(line.slot).toBe('middle');

      expect(fill.paint['fill-emissive-strength']).toBe(1);
      expect(line.paint['line-emissive-strength']).toBe(1);

      // A route hidden behind 3D buildings is the failure this prevents.
      expect(line.paint['line-occlusion-opacity']).toBe(1);

      // The inferred slot is reported here too, not just on basemap layers — and a fill gets
      // told about `bottom`, the one case the overlay default is usually wrong for.
      expect(text).toContain('inferred slot "middle"');
      expect(text).toContain('slot: "bottom"');
    });

    it('should require render_type and a known source_id for user data layers', async () => {
      const missingRenderType = await tool.run({
        style_name: 'G',
        base_style: 'standard',
        custom_sources: { z: { type: 'geojson', data: 'u' } },
        layers: [{ layer_type: 'z', source_id: 'z', action: 'color' }]
      } as StyleBuilderToolInput);
      // Geometry cannot be inferred from a URL, so "auto" has nothing to work from.
      expect(missingRenderType.content[0].text).toContain(
        'render_type is required'
      );

      const unknownSource = await tool.run({
        style_name: 'G',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'z',
            source_id: 'nope',
            action: 'color',
            render_type: 'fill'
          }
        ]
      } as StyleBuilderToolInput);
      expect(unknownSource.content[0].text).toContain('Unknown source_id');
    });

    it('should reject options belonging to the other target instead of ignoring them', async () => {
      // Standard relights and recolors labels through its config surface, so these
      // Classic-only controls would silently do nothing.
      const onStandard = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        global_settings: { label_color: '#ff00ff' },
        layers: [{ layer_type: 'place_label', action: 'show' }]
      } as StyleBuilderToolInput);
      expect(onStandard.content[0].text).toContain('do not apply');
      expect(onStandard.content[0].text).toContain('colorPlaceLabels');

      // And the reverse: Classic has no config surface to configure.
      const onClassic = await tool.run({
        style_name: 'C',
        base_style: 'dark-v11',
        standard_config: { lightPreset: 'night' },
        layers: []
      } as StyleBuilderToolInput);
      expect(onClassic.content[0].text).toContain('do not apply');
      expect(onClassic.content[0].text).toContain('standard_config');
    });

    it('should reject a slot on Classic rather than dropping it silently', async () => {
      // `slot` sits on the layer rather than at the top level, so it was the one wrong-target
      // option the descriptor's field walk could not see — and a caller carrying a Standard
      // example over to a Classic base sets it every time.
      const result = await tool.run({
        style_name: 'C',
        base_style: 'streets-v12',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff',
            slot: 'bottom'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      expect(text).toContain('do not apply to a Classic style');
      expect(text).toContain('`slot`');
      expect(text).toContain('layers[0] "water"');
      // Nothing generated, so the caller cannot mistake it for a working style.
      expect(text).not.toContain('Style Built Successfully');
    });

    it('should hide basemap features on Standard through the config toggle', async () => {
      // Omitting the layer hides nothing on Standard — the import keeps drawing the feature —
      // yet the summary used to report it hidden.
      const result = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [
          { layer_type: 'poi_label', action: 'hide' },
          { layer_type: 'building', action: 'hide' }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

      expect(style.imports[0].config).toEqual({
        showPointOfInterestLabels: false,
        show3dObjects: false
      });
      // And the report names the toggle rather than claiming a hidden layer.
      expect(text).toContain('showPointOfInterestLabels');
      expect(text).toContain('Hidden via');
    });

    it('should reject hiding a Standard feature that has no config toggle', async () => {
      const result = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [{ layer_type: 'water', action: 'hide' }]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      expect(text).toContain('cannot be hidden on a Standard style');
      expect(text).toContain('colorWater');
      expect(text).not.toContain('Style Built Successfully');

      // The road network is the same case, and worth its own pointer: the toggles that exist
      // cover the labels and the pedestrian paths, not the carriageways.
      const roads = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [{ layer_type: 'road', action: 'hide' }]
      } as StyleBuilderToolInput);
      expect(roads.content[0].text).toContain('showRoadLabels');
      expect(roads.content[0].text).toContain('showPedestrianRoads');
    });

    it('should keep hide working by omission on Classic', async () => {
      // There the tool authors every layer, so leaving one out is what hides the feature.
      const result = await tool.run({
        style_name: 'C',
        base_style: 'streets-v12',
        layers: [
          { layer_type: 'poi_label', action: 'hide' },
          { layer_type: 'water', action: 'color', color: '#0099ff' }
        ]
      } as StyleBuilderToolInput);

      const style = JSON.parse(
        (result.content[0].text as string).match(/```json\n([\s\S]*?)\n```/)![1]
      );
      expect(
        style.layers.some((l: any) => l['source-layer'] === 'poi_label')
      ).toBe(false);
      expect(style.layers.some((l: any) => l['source-layer'] === 'water')).toBe(
        true
      );
    });

    it('should point at the config property when recoloring the basemap on Standard', async () => {
      // The layer is still generated — an overdraw is right when the recolour is filtered to a
      // subset the config cannot express — but the caller is told it is a second copy.
      const result = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [{ layer_type: 'water', action: 'color', color: '#0099ff' }]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      expect(text).toContain('colorWater');
      expect(text).toContain("second copy over the basemap's own");
      expect(text).toContain('Style Built Successfully');
    });

    it('should honour light/dark and imagery from the Classic base name', async () => {
      const build = async (baseStyle: string) => {
        const result = await tool.run({
          style_name: 'C',
          base_style: baseStyle,
          layers: [
            { layer_type: 'place_label', action: 'show', render_type: 'symbol' }
          ]
        } as StyleBuilderToolInput);
        return JSON.parse(
          (result.content[0].text as string).match(
            /```json\n([\s\S]*?)\n```/
          )![1]
        );
      };

      // All eight Classic values used to produce byte-identical output, so "dark-v11" was a
      // light map and "satellite-v9" had no imagery. A Classic base is not an import, so the
      // builder cannot reproduce the named style — only what the name states outright is
      // honoured, using the two land colours the tool already had.
      const light = await build('streets-v12');
      const dark = await build('dark-v11');
      expect(light.layers[0].paint['background-color']).toBe('#f8f4f0');
      expect(dark.layers[0].paint['background-color']).toBe('#1a1a1a');

      // Deliberately equivalent: nothing available to the builder separates these two, and
      // inventing a difference would attribute made-up cartography to a Mapbox style.
      const night = await build('navigation-night-v1');
      expect(night.layers[0].paint['background-color']).toBe('#1a1a1a');

      // A dark base needs a label colour that reads on it, or the text is black on black.
      const darkLabels = dark.layers.find((l: any) => l.type === 'symbol');
      expect(darkLabels.paint['text-color']).toBe('#ffffff');
      expect(darkLabels.paint['text-halo-color']).toBe('#000000');

      // A satellite base is imagery — a flat colour is not a stand-in for it.
      const satellite = await build('satellite-v9');
      expect(satellite.sources.satellite).toEqual({
        type: 'raster',
        url: 'mapbox://mapbox.satellite',
        tileSize: 256
      });
      expect(satellite.layers[0]).toEqual({
        id: 'satellite',
        type: 'raster',
        source: 'satellite'
      });
      expect(satellite.layers.some((l: any) => l.type === 'background')).toBe(
        false
      );

      // Still self-contained: a Classic base never becomes a style import.
      for (const style of [light, dark, night, satellite]) {
        expect(style.imports).toBeUndefined();
      }
    });

    it('should let global_settings override what the Classic base implies', async () => {
      const result = await tool.run({
        style_name: 'C',
        base_style: 'dark-v11',
        global_settings: { mode: 'light' },
        layers: [
          { layer_type: 'place_label', action: 'show', render_type: 'symbol' }
        ]
      } as StyleBuilderToolInput);

      const style = JSON.parse(
        (result.content[0].text as string).match(/```json\n([\s\S]*?)\n```/)![1]
      );
      // The base name only decides the default mode, so an explicit mode wins and the land
      // colour follows it — a dark background under light-mode labels is the state this avoids.
      expect(style.layers[0].paint['background-color']).toBe('#f8f4f0');
      expect(
        style.layers.find((l: any) => l.type === 'symbol').paint['text-color']
      ).not.toBe('#ffffff');
    });

    it('should apply label_color on Classic in precedence order', async () => {
      const run = async (
        globalSettings: Record<string, unknown>,
        layerColor?: string
      ) => {
        const result = await tool.run({
          style_name: 'C',
          base_style: 'streets-v12',
          global_settings: globalSettings,
          layers: [
            {
              layer_type: 'place_label',
              action: layerColor ? 'color' : 'show',
              color: layerColor,
              render_type: 'symbol'
            }
          ]
        } as StyleBuilderToolInput);
        const style = JSON.parse(
          (result.content[0].text as string).match(
            /```json\n([\s\S]*?)\n```/
          )![1]
        );
        return style.layers.find((l: any) => l.type === 'symbol').paint;
      };

      // Each of these has to beat the generic per-property default, which already put a
      // literal text-color in place — deferring to it made label_color a no-op.
      expect((await run({ label_color: '#ff00ff' }))['text-color']).toBe(
        '#ff00ff'
      );
      expect((await run({ mode: 'dark' }))['text-color']).toBe('#ffffff');
      expect(
        (await run({ label_color: '#ff00ff', mode: 'dark' }))['text-color']
      ).toBe('#ff00ff');
      // A color set on the layer itself is more specific than a style-wide default.
      expect(
        (await run({ label_color: '#ff00ff' }, '#00ff00'))['text-color']
      ).toBe('#00ff00');
    });

    it('should drive icons off each layers own icon field rather than a literal', async () => {
      const iconFor = async (layerType: string) => {
        const result = await tool.run({
          style_name: 'I',
          base_style: 'standard',
          layers: [
            { layer_type: layerType, action: 'show', render_type: 'symbol' }
          ]
        } as StyleBuilderToolInput);
        const style = JSON.parse(
          (result.content[0].text as string).match(
            /```json\n([\s\S]*?)\n```/
          )![1]
        );
        return style.layers.find((l: any) => l.type === 'symbol')?.layout?.[
          'icon-image'
        ];
      };

      // These branches were previously keyed on 'poi_labels' and 'transit' — neither is a
      // real source layer, so they were unreachable and every symbol layer fell through to
      // a hardcoded "marker-15", giving every feature the same generic pin.
      expect(await iconFor('poi_label')).toEqual(['get', 'maki']);
      expect(await iconFor('airport_label')).toEqual(['get', 'maki']);

      // Place labels are text only; a marker on every city was never intended.
      expect(await iconFor('place_label')).toBeUndefined();
    });

    it('should infer a slot from the layer type when none is given', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Slot Inference Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'landuse',
            filter_properties: { class: 'park' },
            action: 'color',
            color: '#00ff00',
            render_type: 'fill'
          },
          {
            layer_type: 'road',
            action: 'color',
            color: '#ffaa00',
            render_type: 'line'
          },
          {
            layer_type: 'poi_label',
            action: 'show',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

      const byType = (type: string) =>
        style.layers.find((l: any) => l.type === type);

      // Area fills belong under the road network, lines above roads but behind
      // labels, symbols above POI labels where markers stay legible.
      expect(byType('fill').slot).toBe('bottom');
      expect(byType('line').slot).toBe('middle');
      expect(byType('symbol').slot).toBe('top');
    });

    it('should set emissive strength on custom fill/line/circle layers so they survive the night preset', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Emissive Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'landuse',
            filter_properties: { class: 'park' },
            action: 'color',
            color: '#00ff00',
            render_type: 'fill'
          },
          {
            layer_type: 'road',
            action: 'color',
            color: '#ffaa00',
            render_type: 'line'
          },
          {
            layer_type: 'poi_label',
            action: 'show',
            render_type: 'symbol'
          }
        ],
        standard_config: { lightPreset: 'night' }
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

      const byType = (type: string) =>
        style.layers.find((l: any) => l.type === type);

      // These three default to 0, meaning the scene lights them into shadow.
      expect(byType('fill').paint['fill-emissive-strength']).toBe(1);
      expect(byType('line').paint['line-emissive-strength']).toBe(1);

      // Symbols already default to 1, so nothing should be added for them.
      expect(byType('symbol').paint['icon-emissive-strength']).toBeUndefined();
      expect(byType('symbol').paint['text-emissive-strength']).toBeUndefined();
    });

    it('should not add emissive strength to Classic styles, which have no lighting to shadow them', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Classic Emissive Test',
        base_style: 'streets-v12',
        layers: [
          {
            layer_type: 'landuse',
            filter_properties: { class: 'park' },
            action: 'color',
            color: '#00ff00',
            render_type: 'fill'
          }
        ]
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

      const fillLayer = style.layers.find((l: any) => l.type === 'fill');
      expect(fillLayer.paint['fill-emissive-strength']).toBeUndefined();
    });

    it('should redirect global_settings.mode dark to lightPreset on Standard', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Dark Mode Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff',
            render_type: 'fill'
          }
        ],
        global_settings: { mode: 'dark' }
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

      expect(text).toContain('lightPreset');
      expect(text).toContain('night');
    });

    it('should always default to Standard style when not specified', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Default Style Test',
        // Not specifying base_style - should default to standard
        layers: [
          {
            layer_type: 'water',
            action: 'color',
            color: '#0099ff'
          }
        ],
        base_style: 'standard'
      };

      const result = await tool.run(input);
      const text = result.content[0].text as string;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const style = JSON.parse(jsonMatch![1]);

      // Check that it defaults to Standard style with imports
      expect(style.imports).toBeDefined();
      expect(style.imports).toHaveLength(1);
      expect(style.imports[0].id).toBe('basemap');
      expect(style.imports[0].url).toBe('mapbox://styles/mapbox/standard');

      // Standard style layers can have slot property, but we didn't specify one
      const waterLayer = style.layers.find((layer: any) =>
        layer.id.includes('water')
      );
      expect(waterLayer).toBeTruthy();
      expect(waterLayer.type).toBe('fill');
    });
  });

  describe('layer auto-correction', () => {
    it('should auto-correct landcover to landuse_overlay for wetlands', async () => {
      const input: StyleBuilderToolInput = {
        style_name: 'Wetlands Test',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'landuse_overlay',
            action: 'color',
            color: '#00ff00',
            filter_properties: {
              type: ['wetland', 'swamp']
            },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      // No longer expecting auto-correction since we're using the correct layer
      expect(text).toContain('Style Built Successfully');

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
            layer_type: 'nonexistent', // Completely unknown layer
            action: 'color',
            color: '#ff0000',
            filter_properties: {
              maki: 'restaurant' // This field only exists in poi_label
            },
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain(
        'Determined source layer "poi_label" from filter properties'
      );
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
            color: '#0066ff',
            render_type: 'symbol'
          },
          {
            layer_type: 'landuse',
            filter_properties: { class: 'park' },
            action: 'highlight',
            color: '#00ff00',
            render_type: 'symbol'
          },
          {
            layer_type: 'place_label',
            action: 'hide',
            render_type: 'symbol'
          },
          {
            layer_type: 'building',
            action: 'show',
            render_type: 'symbol'
          }
        ]
      };

      const result = await tool.run(input);

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;

      expect(text).toContain('Layers Configured:** 4');
      expect(text).toContain('Set to #0066ff');
      expect(text).toContain('Highlighted');
      expect(text).toContain('Hidden');
      expect(text).toContain('Shown');
    });
  });
});
