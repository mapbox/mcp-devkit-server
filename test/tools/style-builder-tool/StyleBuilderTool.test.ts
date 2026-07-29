// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { StyleBuilderTool } from '../../../src/tools/style-builder-tool/StyleBuilderTool.js';
import {
  StyleBuilderToolSchema,
  type StyleBuilderToolInput
} from '../../../src/tools/style-builder-tool/StyleBuilderTool.input.schema.js';

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
        // A Classic build needs at least one layer — an empty stack is a redirect now — and this
        // test is about global_settings reaching the output, not about the empty case.
        layers: [{ layer_type: 'water', action: 'color', color: '#0a1a2a' }],
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

    it('should build no style at all when a Classic base is given no layers', async () => {
      // This used to assert the opposite — a lone background layer — which is the outcome the
      // redirect replaced: a style reported as built that draws nothing but a colour. See
      // "should redirect an empty Classic build instead of shipping a bare background" for the
      // guidance itself.
      const result = await tool.run({
        style_name: 'Essential Layers Test',
        base_style: 'streets-v12',
        layers: []
      } as StyleBuilderToolInput);
      const text = result.content[0].text as string;

      expect(text).not.toContain('Style Built Successfully');
      expect(text.match(/```json\n([\s\S]*?)\n```/)).toBeNull();
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

    it('should expose every documented Mapbox Standard config property', () => {
      // Every property documented at docs.mapbox.com/map-styles/reference/standard/ as of
      // 2026-07. The schema strips unknown keys, so a property missing here is one a caller can
      // set and never be told was dropped — the same silence the target check exists to end.
      const documented = [
        'showPedestrianRoads',
        'showPlaceLabels',
        'showPointOfInterestLabels',
        'showRoadLabels',
        'showTransitLabels',
        'show3dObjects',
        'show3dBuildings',
        'show3dTrees',
        'show3dLandmarks',
        'show3dFacades',
        'showLandmarkIcons',
        'showLandmarkIconLabels',
        'showAdminBoundaries',
        'showIndoor',
        'showIndoorLabels',
        'theme',
        'theme-data',
        'lightPreset',
        'font',
        'colorModePointOfInterestLabels',
        'backgroundPointOfInterestLabels',
        'densityPointOfInterestLabels',
        'fuelingStationModePointOfInterestLabels',
        'colorPlaceLabels',
        'colorRoadLabels',
        'colorPointOfInterestLabels',
        'colorCommercial',
        'colorEducation',
        'colorMedical',
        'colorIndustrial',
        'colorGreenspace',
        'colorWater',
        'colorLand',
        'colorAdminBoundaries',
        'colorMotorways',
        'colorTrunks',
        'colorRoads',
        'colorBuildings',
        'colorBuildingHighlight',
        'colorBuildingSelect',
        'colorPlaceLabelHighlight',
        'colorPlaceLabelSelect',
        'colorIndoorLabelSelect',
        'colorIndoorLabelHighlight'
      ];

      const shape = (
        StyleBuilderToolSchema.shape.standard_config as any
      ).unwrap().shape;
      const keys = Object.keys(shape);

      expect(documented.filter((p) => !keys.includes(p))).toEqual([]);
      // showRoadsAndTransit is the one deliberate extra: a Standard *Satellite* property, kept
      // in the schema so passing it is an error rather than a silently dropped key.
      expect(keys.filter((k) => !documented.includes(k))).toEqual([
        'showRoadsAndTransit'
      ]);
    });

    it('should report every config property it set, not a hand-picked subset', async () => {
      const result = await tool.run({
        style_name: 'Full config',
        base_style: 'standard',
        layers: [],
        standard_config: {
          // None of these five appeared in the summary before: the report walked a written-out
          // list covering 8 of the 15 show* toggles and 6 of the 22 color* overrides.
          showIndoorLabels: false,
          show3dTrees: false,
          colorIndustrial: '#b0a08f',
          colorPlaceLabels: '#222222',
          fuelingStationModePointOfInterestLabels: 'default'
        }
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;

      expect(text).toContain('Indoor labels: hidden');
      expect(text).toContain('3D trees: hidden');
      expect(text).toContain('industrial: #b0a08f');
      expect(text).toContain('place labels: #222222');
      expect(text).toContain('Fueling station POI mode: default');
    });

    it('should convert an object filter on your own data into an expression', async () => {
      const result = await tool.run({
        style_name: 'Zones',
        base_style: 'standard',
        custom_sources: {
          zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [
          {
            layer_type: 'Active zones',
            source_id: 'zones',
            render_type: 'fill',
            action: 'color',
            color: '#7b61ff',
            filter: { status: ['active', 'pending'], tier: 2 }
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const fill = style.layers.find((l: any) => l.type === 'fill');

      // The object shape carries over from a basemap layer, where field metadata resolves it.
      // Custom data has none, so this used to be assigned raw — a style the spec rejects with
      // "array expected, object found", surfacing only once create_style_tool uploaded it.
      expect(fill.filter).toEqual([
        'all',
        ['match', ['get', 'status'], ['active', 'pending'], true, false],
        ['==', ['get', 'tier'], 2]
      ]);
      expect(text).toContain('converted to');
    });

    it('should reject a filter with nothing to test against', async () => {
      const result = await tool.run({
        style_name: 'Zones',
        base_style: 'standard',
        custom_sources: {
          zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [
          {
            layer_type: 'Zones',
            source_id: 'zones',
            render_type: 'fill',
            action: 'color',
            color: '#7b61ff',
            filter: 'active'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      expect(text).toContain('must be an expression or a property object');
      expect(text).not.toContain('Style Built Successfully');
    });

    it('should keep an expression filter on your own data untouched', async () => {
      const result = await tool.run({
        style_name: 'Zones',
        base_style: 'standard',
        custom_sources: {
          zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [
          {
            layer_type: 'Big zones',
            source_id: 'zones',
            render_type: 'fill',
            action: 'color',
            color: '#7b61ff',
            filter: ['>', ['get', 'area'], 500]
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const fill = style.layers.find((l: any) => l.type === 'fill');

      expect(fill.filter).toEqual(['>', ['get', 'area'], 500]);
    });

    it('should honour colour and opacity on a heatmap of your own data', async () => {
      const result = await tool.run({
        style_name: 'Incidents',
        base_style: 'standard',
        custom_sources: {
          pts: { type: 'geojson', data: 'https://example.com/p.geojson' }
        },
        layers: [
          {
            layer_type: 'Incident density',
            source_id: 'pts',
            render_type: 'heatmap',
            action: 'color',
            color: '#ff0000',
            opacity: 0.5
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const heatmap = style.layers.find((l: any) => l.type === 'heatmap');

      // heatmap-color takes a ramp over heatmap-density rather than a colour, and heatmap-opacity
      // was missing from the opacity table — so both of these used to be dropped in silence,
      // leaving a layer with no paint at all reported as built successfully.
      expect(heatmap.paint['heatmap-color']).toEqual([
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(0, 0, 0, 0)',
        1,
        '#ff0000'
      ]);
      expect(heatmap.paint['heatmap-opacity']).toBe(0.5);
      expect(text).toContain('ramps from transparent to #ff0000');
    });

    it('should pass a caller ramp straight through to heatmap-color', async () => {
      const ramp = [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(0, 0, 0, 0)',
        1,
        '#08519c'
      ];
      const result = await tool.run({
        style_name: 'Incidents',
        base_style: 'standard',
        custom_sources: {
          pts: { type: 'geojson', data: 'https://example.com/p.geojson' }
        },
        layers: [
          {
            layer_type: 'Incident density',
            source_id: 'pts',
            render_type: 'heatmap',
            action: 'color',
            property_based: 'weight',
            property_values: { high: 1 },
            expression: ramp
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const heatmap = style.layers.find((l: any) => l.type === 'heatmap');

      expect(heatmap.paint['heatmap-color']).toEqual(ramp);
      // Density is computed from the points, so a per-feature match cannot colour a heatmap.
      // Pointed at heatmap-weight instead of being accepted and ignored.
      expect(text).toContain('does not colour a heatmap');
      expect(text).toContain('heatmap-weight');
    });

    it('should report width it cannot apply instead of dropping it', async () => {
      const result = await tool.run({
        style_name: 'Stores',
        base_style: 'standard',
        custom_sources: {
          pts: { type: 'geojson', data: 'https://example.com/p.geojson' }
        },
        layers: [
          {
            layer_type: 'Stores',
            source_id: 'pts',
            render_type: 'circle',
            action: 'color',
            color: '#7b61ff',
            width: 8
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      expect(text).toContain('`width` was ignored');
      expect(text).toContain('circle-radius');
    });

    it('should colour your own data by value rather than dropping the expression', async () => {
      const result = await tool.run({
        style_name: 'Anomaly',
        base_style: 'standard',
        custom_sources: {
          counties: { type: 'geojson', data: 'https://example.com/c.geojson' }
        },
        layers: [
          {
            layer_type: 'Counties by anomaly',
            source_id: 'counties',
            render_type: 'fill',
            action: 'color',
            slot: 'bottom',
            expression: [
              'interpolate',
              ['linear'],
              ['get', 'anomaly'],
              -5,
              '#b2182b',
              0,
              '#f7f7f7',
              5,
              '#2166ac'
            ]
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const fill = style.layers.find((l: any) => l.type === 'fill');

      // Dropped, this left a fill with no fill-color at all — which the spec draws as opaque
      // black over the whole map, for the single most common thing you'd bring your own data for.
      expect(fill.paint['fill-color'][0]).toBe('interpolate');
      expect(fill.paint['fill-color']).toContain('#2166ac');
    });

    it('should build a category match for your own data, always with a fallback arm', async () => {
      const result = await tool.run({
        style_name: 'Tiers',
        base_style: 'standard',
        custom_sources: {
          zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [
          {
            layer_type: 'Zones by tier',
            source_id: 'zones',
            render_type: 'fill',
            action: 'color',
            slot: 'middle',
            property_based: 'tier',
            property_values: { high: '#e41a1c', low: '#377eb8' }
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const fillColor = style.layers.find((l: any) => l.type === 'fill').paint[
        'fill-color'
      ];

      expect(fillColor[0]).toBe('match');
      expect(fillColor[1]).toEqual(['get', 'tier']);
      // A match with no fallback draws nothing for an unlisted value, so there is always one.
      expect(fillColor[fillColor.length - 1]).toBe('#999999');
      // And the caller is told which colour it got, rather than finding out from the JSON.
      expect(text).toContain('fallback');
    });

    it('should not put a colour expression into a numeric paint property', async () => {
      const result = await tool.run({
        style_name: 'Heights',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'building',
            action: 'color',
            color: '#808080',
            opacity: 0.5,
            render_type: 'fill',
            slot: 'bottom',
            expression: [
              'case',
              ['>', ['get', 'height'], 100],
              '#ff0000',
              '#808080'
            ]
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const paint = style.layers.find((l: any) => l.type === 'fill').paint;

      // The expression describes the colour. Returned for every property type, it also landed
      // the same colour ramp in fill-opacity, where the spec expects a number.
      expect(paint['fill-color'][0]).toBe('case');
      expect(paint['fill-opacity']).toBe(0.5);
    });

    it('should give every layer a distinct id, including two off one custom source', async () => {
      const result = await tool.run({
        style_name: 'Split zones',
        base_style: 'standard',
        custom_sources: {
          zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [
          {
            layer_type: 'High tier',
            source_id: 'zones',
            render_type: 'fill',
            action: 'color',
            color: '#e41a1c',
            slot: 'middle',
            filter: ['==', ['get', 'tier'], 'high']
          },
          {
            layer_type: 'Low tier',
            source_id: 'zones',
            render_type: 'fill',
            action: 'color',
            color: '#377eb8',
            slot: 'middle',
            filter: ['==', ['get', 'tier'], 'low']
          },
          // Same basemap feature twice with no filter derives the same name too.
          {
            layer_type: 'water',
            action: 'color',
            color: '#0af',
            slot: 'bottom'
          },
          {
            layer_type: 'water',
            action: 'color',
            color: '#08f',
            slot: 'bottom'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const ids = style.layers.map((l: any) => l.id);

      // Duplicate ids are invalid per the style spec, and the collision was silent.
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain('zones-fill');
      expect(ids).toContain('zones-fill-2');
    });

    it('should give a symbol layer over your own data something to draw', async () => {
      const result = await tool.run({
        style_name: 'Stores',
        base_style: 'standard',
        custom_sources: {
          stores: { type: 'geojson', data: 'https://example.com/s.geojson' }
        },
        layers: [
          {
            layer_type: 'Stores',
            source_id: 'stores',
            render_type: 'symbol',
            action: 'show',
            slot: 'top'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const symbol = style.layers.find((l: any) => l.type === 'symbol');

      // With neither text-field nor icon-image a symbol layer renders nothing at all, so this
      // was a layer that was present, valid and invisible.
      expect(symbol.layout['text-field']).toEqual(['get', 'name']);
      // No icon-image: a literal would resolve against the Streets sprite and put the same
      // generic pin on every feature.
      expect(symbol.layout['icon-image']).toBeUndefined();
      // The assumed property is named, since the tool cannot see the data to check it.
      expect(text).toContain('`name` property');
    });

    it('should not leave a layer over your own data with no colour at all', async () => {
      const result = await tool.run({
        style_name: 'Zones',
        base_style: 'standard',
        custom_sources: {
          zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [
          {
            layer_type: 'Zones',
            source_id: 'zones',
            render_type: 'fill',
            action: 'show'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

      // fill-color defaults to opaque black, so omitting it is not "unstyled" — it is a black
      // slab over the whole map. Same failure as a `match` with no fallback arm.
      expect(style.layers[0].paint['fill-color']).toBe('#999999');
      expect(text).toContain('opaque black');
    });

    it('should normalise a bare hex colour on your own data, as it does on the basemap', async () => {
      const build = async (layer: Record<string, unknown>) => {
        const result = await tool.run({
          style_name: 'Zones',
          base_style: 'standard',
          custom_sources: {
            zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
          },
          layers: [layer]
        } as StyleBuilderToolInput);
        return JSON.parse(
          (result.content[0].text as string).match(
            /```json\n([\s\S]*?)\n```/
          )![1]
        );
      };

      // "7b61ff" is not a colour the spec can parse, so it failed validation at upload rather
      // than here. The basemap path has always prefixed it; this one passed it straight through.
      const bare = await build({
        layer_type: 'Zones',
        source_id: 'zones',
        render_type: 'fill',
        action: 'color',
        color: '7b61ff'
      });
      expect(bare.layers[0].paint['fill-color']).toBe('#7b61ff');

      // A functional or named colour is already valid and must not be prefixed into "#red".
      const named = await build({
        layer_type: 'Zones',
        source_id: 'zones',
        render_type: 'fill',
        action: 'color',
        color: 'rgba(123, 97, 255, 0.5)'
      });
      expect(named.layers[0].paint['fill-color']).toBe(
        'rgba(123, 97, 255, 0.5)'
      );
    });

    it('should give a fill-extrusion over your own data a height and no slot', async () => {
      const result = await tool.run({
        style_name: 'Buildings',
        base_style: 'standard',
        custom_sources: { bld: { type: 'vector', url: 'mapbox://me.bld' } },
        layers: [
          {
            layer_type: 'My buildings',
            source_id: 'bld',
            source_layer: 'bld',
            render_type: 'fill-extrusion',
            action: 'color',
            color: '#cccccc'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      const layer = style.layers[0];

      // fill-extrusion-height defaults to 0, so without one the layer is present, valid and flat.
      expect(layer.paint['fill-extrusion-height']).toEqual(['get', 'height']);
      expect(text).toContain('`height` property');

      // Unslotted for the same reason a basemap fill-extrusion is: it is real 3D geometry that
      // depth-sorts against the buildings around it, and a slot flattens it into the 2D stack.
      // Whose data it is doesn't change that.
      expect(layer.slot).toBeUndefined();
      expect(text).toContain('without a slot deliberately');
    });

    it('should say when zoom_based had nothing to ramp on your own data', async () => {
      const result = await tool.run({
        style_name: 'Zones',
        base_style: 'standard',
        custom_sources: {
          zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [
          {
            layer_type: 'Zones',
            source_id: 'zones',
            render_type: 'fill',
            action: 'color',
            color: '#7b61ff',
            zoom_based: true
          }
        ]
      } as StyleBuilderToolInput);

      // zoom_based ramps opacity and width; with neither set it was accepted and did nothing.
      expect(result.content[0].text as string).toContain(
        '`zoom_based` had no effect'
      );

      // With something to act on it ramps, and says nothing.
      const ramped = await tool.run({
        style_name: 'Zones',
        base_style: 'standard',
        custom_sources: {
          zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [
          {
            layer_type: 'Zones',
            source_id: 'zones',
            render_type: 'fill',
            action: 'color',
            color: '#7b61ff',
            opacity: 0.6,
            zoom_based: true
          }
        ]
      } as StyleBuilderToolInput);
      const rampedText = ramped.content[0].text as string;
      const style = JSON.parse(
        rampedText.match(/```json\n([\s\S]*?)\n```/)![1]
      );
      expect(style.layers[0].paint['fill-opacity'][0]).toBe('interpolate');
      expect(rampedText).not.toContain('`zoom_based` had no effect');
    });

    it('should say a fill-extrusion is unslotted on purpose, not report a slot of undefined', async () => {
      const result = await tool.run({
        style_name: '3D',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'building',
            render_type: 'fill-extrusion',
            action: 'color',
            color: '#cccccc'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);

      // Real 3D geometry is left unslotted deliberately, so the message must not read as a
      // failed inference — nor claim the layer will draw over the street labels.
      expect(style.layers[0].slot).toBeUndefined();
      expect(text).not.toContain('"undefined"');
      expect(text).toContain('left without a slot deliberately');
    });

    it('should describe a custom-source layer by the name you gave it', async () => {
      const result = await tool.run({
        style_name: 'Hydrology',
        base_style: 'standard',
        custom_sources: {
          water: { type: 'geojson', data: 'https://example.com/w.geojson' }
        },
        layers: [
          {
            layer_type: 'water',
            source_id: 'water',
            render_type: 'fill',
            action: 'color',
            color: '#123456',
            slot: 'bottom'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;

      // layer_type is free text on a custom-source layer, so looking it up reported the
      // caller's GeoJSON as Streets v8 metadata it has nothing to do with.
      expect(text).toContain('• water: Set to #123456');
      expect(text).not.toContain('water layer (Polygon geometry)');
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
        show3dBuildings: false
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

    it('should resolve the layer name before deciding whether it can be hidden', async () => {
      // The hide answer has to come from the *resolved* source layer, as every other action
      // does. Keyed off the raw layer_type instead, "pois" was rejected as unhideable by a
      // message that went on to list poi_label as hideable.
      const hidden = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'pois',
            filter_properties: { maki: 'restaurant' },
            action: 'hide'
          }
        ]
      } as StyleBuilderToolInput);

      const text = hidden.content[0].text as string;
      expect(text).toContain('Style Built Successfully');
      expect(text).not.toContain('cannot be hidden');
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      expect(style.imports[0].config).toEqual({
        showPointOfInterestLabels: false
      });
      // And the summary names the toggle it resolved to, not the name that was passed in.
      expect(text).toContain(
        'Hidden via `standard_config.showPointOfInterestLabels`'
      );
    });

    it('should hide your own data layer by omission, on either target', async () => {
      // A custom_sources layer is not the import's to remove, so `hide` is omission on
      // Standard too — the show* toggles are advice about the basemap, not about your data.
      for (const baseStyle of ['standard', 'streets-v12']) {
        const result = await tool.run({
          style_name: 'S',
          base_style: baseStyle,
          custom_sources: {
            zones: { type: 'geojson', data: 'https://example.com/z.geojson' }
          },
          layers: [
            {
              layer_type: 'Delivery zones',
              source_id: 'zones',
              render_type: 'fill',
              action: 'hide'
            }
          ]
        } as StyleBuilderToolInput);

        const text = result.content[0].text as string;
        expect(text).toContain('Style Built Successfully');
        expect(text).not.toContain('cannot be hidden');
        const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
        expect(style.layers.some((l: any) => l.source === 'zones')).toBe(false);
        // No config toggle was invented for it, so it reports as a plain omission.
        expect(text).toContain('Hidden');
        expect(text).not.toContain('Hidden via');
      }
    });

    it('should report an unknown layer type as unknown even when hiding it', async () => {
      // The suggestion list is the useful answer; a verdict about what Standard can hide
      // diagnoses the wrong problem.
      const result = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [{ layer_type: 'labels', action: 'hide' }]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      expect(text).not.toContain('cannot be hidden on a Standard style');
      // Same guidance the identical input gets under any other action.
      const shown = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [{ layer_type: 'labels', action: 'show' }]
      } as StyleBuilderToolInput);
      expect(text).toBe(shown.content[0].text as string);
    });

    it('should hide buildings without taking the 3D trees and landmarks too', async () => {
      // show3dObjects is the whole 3D group. Hiding a building through it also strips the
      // trees and landmarks nobody mentioned, while the report claimed only buildings.
      const result = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [{ layer_type: 'building', action: 'hide' }]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      expect(style.imports[0].config).toEqual({ show3dBuildings: false });
      expect(style.imports[0].config.show3dObjects).toBeUndefined();

      // The blunter toggle is still reachable for a caller who does want all 3D gone.
      const allOff = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        standard_config: { show3dObjects: false },
        layers: []
      } as StyleBuilderToolInput);
      const allOffStyle = JSON.parse(
        (allOff.content[0].text as string).match(/```json\n([\s\S]*?)\n```/)![1]
      );
      expect(allOffStyle.imports[0].config).toEqual({ show3dObjects: false });
    });

    it('should reject a config property belonging to Standard Satellite', async () => {
      // showRoadsAndTransit exists on Standard Satellite, not on the plain Standard this tool
      // imports — so it used to land an inert key in the import config. The wrong-target check
      // only compared Standard against Classic, never against a different Standard.
      const result = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        standard_config: { showRoadsAndTransit: false },
        layers: [{ layer_type: 'water', action: 'show' }]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      expect(text).toContain('showRoadsAndTransit');
      expect(text).toContain('Standard Satellite only');
      expect(text).not.toContain('Style Built Successfully');
      // And it points at what does work on Standard.
      expect(text).toContain('showRoadLabels');
    });

    it('should describe a filter-resolved layer by the name the style uses', async () => {
      // The summary used to re-derive the description from the raw input, so a layer passed as
      // "pois" was reported under a name appearing nowhere in the built style.
      const result = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [
          {
            layer_type: 'pois',
            filter_properties: { maki: 'restaurant' },
            action: 'color',
            color: '#ff0000'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      const summary = text.slice(text.indexOf('**Layer Configurations:**'));
      expect(summary).not.toContain('pois');
      expect(summary).toContain('poi_label');
    });

    it('should report one correction when two layers hide the same feature', async () => {
      const result = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [
          { layer_type: 'poi_label', action: 'hide' },
          {
            layer_type: 'poi_label',
            filter_properties: { class: 'food_and_drink' },
            action: 'hide'
          }
        ]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      // One decision, one line — repeating it reads like two things happened.
      const hits = text.match(
        /set `standard_config\.showPointOfInterestLabels/g
      );
      expect(hits).toHaveLength(1);
    });

    it('should name a hide that is redrawn by an unfiltered custom layer', async () => {
      // Hiding the basemap POIs and drawing a filtered subset is a real technique, so it is
      // named rather than rejected — but an unfiltered redraw just reinstates what was hidden.
      const unfiltered = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [
          { layer_type: 'poi_label', action: 'hide' },
          { layer_type: 'poi_label', action: 'color', color: '#ff0000' }
        ]
      } as StyleBuilderToolInput);
      expect(unfiltered.content[0].text).toContain(
        'redraws what the toggle just hid'
      );

      const filtered = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [
          { layer_type: 'poi_label', action: 'hide' },
          {
            layer_type: 'poi_label',
            filter_properties: { class: 'food_and_drink' },
            action: 'color',
            color: '#ff0000'
          }
        ]
      } as StyleBuilderToolInput);
      const filteredText = filtered.content[0].text as string;
      expect(filteredText).toContain('filtered subset');
      expect(filteredText).not.toContain('redraws what the toggle just hid');
      expect(filteredText).toContain('Style Built Successfully');

      // Keyed by the hidden feature, not by the layer that hid it: two layers hiding one
      // feature is still one contradiction, and reporting it twice is the noise this avoids.
      const twoHides = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [
          { layer_type: 'poi_label', action: 'hide' },
          {
            layer_type: 'pois',
            filter_properties: { maki: 'cafe' },
            action: 'hide'
          },
          { layer_type: 'poi_label', action: 'color', color: '#ff0000' }
        ]
      } as StyleBuilderToolInput);
      const hits = (twoHides.content[0].text as string).match(
        /is hidden through `standard_config/g
      );
      expect(hits).toHaveLength(1);
    });

    it('should flag a hide that contradicts an explicit show toggle', async () => {
      const result = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        standard_config: { showPlaceLabels: true },
        layers: [{ layer_type: 'place_label', action: 'hide' }]
      } as StyleBuilderToolInput);

      const text = result.content[0].text as string;
      // The hide wins, but silently resolving the contradiction is how a caller ends up
      // believing the toggle they set is what shipped.
      expect(text).toContain('The hide won');
      const style = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)![1]);
      expect(style.imports[0].config.showPlaceLabels).toBe(false);
    });

    it("should reject a custom_source keyed like one of the builder's own", async () => {
      // custom_sources is merged last, so a collision replaces the basemap source rather
      // than sitting beside it — and every basemap layer then reads the caller's data.
      const composite = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        custom_sources: {
          composite: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [{ layer_type: 'water', action: 'show' }]
      } as StyleBuilderToolInput);

      const text = composite.content[0].text as string;
      expect(text).toContain('Reserved source id');
      expect(text).toContain('`composite`');
      expect(text).toContain('my-composite');
      expect(text).not.toContain('Style Built Successfully');

      // It is about what lands in `style.sources`, not about layer wiring: a declared source
      // clobbers the basemap whether or not any layer points at it.
      const unreferenced = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        custom_sources: {
          composite: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: []
      } as StyleBuilderToolInput);
      expect(unreferenced.content[0].text).toContain('Reserved source id');

      // "satellite" is reserved only where the base actually declares it.
      const onSatelliteBase = await tool.run({
        style_name: 'C',
        base_style: 'satellite-v9',
        custom_sources: {
          satellite: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [{ layer_type: 'water', action: 'show' }]
      } as StyleBuilderToolInput);
      expect(onSatelliteBase.content[0].text).toContain('Reserved source id');

      const onVectorBase = await tool.run({
        style_name: 'C',
        base_style: 'streets-v12',
        custom_sources: {
          satellite: { type: 'geojson', data: 'https://example.com/z.geojson' }
        },
        layers: [
          {
            layer_type: 'My raster-ish data',
            source_id: 'satellite',
            render_type: 'fill',
            action: 'color',
            color: '#ff0000'
          }
        ]
      } as StyleBuilderToolInput);
      expect(onVectorBase.content[0].text).toContain(
        'Style Built Successfully'
      );
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

      // The other imagery base is imagery too — and it is dark, so its labels have to read
      // against the photograph rather than against the land colour it never draws.
      const satelliteStreets = await build('satellite-streets-v12');
      expect(satelliteStreets.sources.satellite).toEqual(
        satellite.sources.satellite
      );
      expect(satelliteStreets.layers[0]).toEqual(satellite.layers[0]);
      expect(
        satelliteStreets.layers.find((l: any) => l.type === 'symbol').paint[
          'text-color'
        ]
      ).toBe('#ffffff');

      // Still self-contained: a Classic base never becomes a style import.
      for (const style of [light, dark, night, satellite, satelliteStreets]) {
        expect(style.imports).toBeUndefined();
      }
    });

    it('should redirect an empty Classic build instead of shipping a bare background', async () => {
      const result = await tool.run({
        style_name: 'C',
        base_style: 'dark-v11',
        layers: []
      } as StyleBuilderToolInput);
      const text = result.content[0].text as string;

      // A Classic base authors nothing, so this used to be a lone background layer reported as
      // "Style Built Successfully" — and the likeliest reading of the request is "give me
      // dark-v11", which is a reference to an existing style rather than a build.
      expect(text).not.toContain('Style Built Successfully');
      expect(text).toContain('Nothing was generated');
      expect(text).toContain('mapbox://styles/mapbox/dark-v11');
      expect(text).toContain(
        'https://docs.mapbox.com/map-styles/guides/classic-styles/'
      );
      // A dark Classic base is the case where Standard has a direct equivalent.
      expect(text).toContain('lightPreset');
      // And the third reading: they really do want a stack they author themselves.
      expect(text).toContain('place_label');

      // An imagery base gets the extra option, since standard-satellite is what it wants.
      const satellite = await tool.run({
        style_name: 'C',
        base_style: 'satellite-v9',
        layers: []
      } as StyleBuilderToolInput);
      expect(satellite.content[0].text as string).toContain(
        'mapbox://styles/mapbox/standard-satellite'
      );

      // Standard is exempt: a config-only style with no layers of its own is the normal shape
      // there, because the import supplies the map.
      const standard = await tool.run({
        style_name: 'S',
        base_style: 'standard',
        layers: [],
        standard_config: { lightPreset: 'night' }
      } as StyleBuilderToolInput);
      expect(standard.content[0].text as string).toContain(
        'Style Built Successfully'
      );
    });

    it('should name the basemap features a thin Classic stack leaves undrawn', async () => {
      const result = await tool.run({
        style_name: 'C',
        base_style: 'streets-v12',
        layers: [{ layer_type: 'road', action: 'color', color: '#ffffff' }]
      } as StyleBuilderToolInput);
      const text = result.content[0].text as string;

      // Built, not rejected — one layer over a background is a legitimate thing to want — but the
      // shortfall is invisible in the JSON, so it is named.
      expect(text).toContain('Style Built Successfully');
      const shortfall = text
        .split('\n')
        .find((line) => line.includes('draws nothing for'))!;
      expect(shortfall).toContain('"water"');
      expect(shortfall).toContain('"place_label"');
      // The one feature that *was* asked for is not reported as missing.
      expect(shortfall).not.toContain('"road"');

      // A full stack has nothing to report.
      const complete = await tool.run({
        style_name: 'C',
        base_style: 'streets-v12',
        layers: [
          { layer_type: 'water', action: 'color', color: '#a0c8f0' },
          { layer_type: 'landuse', action: 'color', color: '#d0e0d0' },
          { layer_type: 'road', action: 'color', color: '#ffffff' },
          { layer_type: 'building', action: 'color', color: '#e0e0e0' },
          { layer_type: 'place_label', action: 'show', render_type: 'symbol' }
        ]
      } as StyleBuilderToolInput);
      expect(complete.content[0].text as string).not.toContain(
        'draws nothing for'
      );
    });

    it('should let label_color beat a dark mode the base name implied', async () => {
      // The dark default and an explicit label_color arrive from different places now, so
      // their precedence is worth pinning: label_color is the more specific of the two.
      const result = await tool.run({
        style_name: 'C',
        base_style: 'dark-v11',
        global_settings: { label_color: '#ffcc00' },
        layers: [
          { layer_type: 'place_label', action: 'show', render_type: 'symbol' }
        ]
      } as StyleBuilderToolInput);

      const style = JSON.parse(
        (result.content[0].text as string).match(/```json\n([\s\S]*?)\n```/)![1]
      );
      const labels = style.layers.find((l: any) => l.type === 'symbol');
      expect(labels.paint['text-color']).toBe('#ffcc00');
      // The halo still follows the mode, so the chosen colour stays legible on dark land.
      expect(labels.paint['text-halo-color']).toBe('#000000');
      expect(style.layers[0].paint['background-color']).toBe('#1a1a1a');
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
