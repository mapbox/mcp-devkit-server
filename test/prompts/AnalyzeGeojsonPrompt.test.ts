// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { AnalyzeGeojsonPrompt } from '../../src/prompts/AnalyzeGeojsonPrompt.js';

describe('AnalyzeGeojsonPrompt', () => {
  const prompt = new AnalyzeGeojsonPrompt();

  const sampleGeojson = JSON.stringify({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749]
    },
    properties: {
      name: 'San Francisco'
    }
  });

  it('should have correct metadata', () => {
    expect(prompt.name).toBe('analyze-geojson');
    expect(prompt.description).toContain('Analyze and visualize GeoJSON');
    expect(prompt.arguments).toHaveLength(3);
  });

  it('should require geojson_data argument', () => {
    const requiredArg = prompt.arguments.find(
      (arg) => arg.name === 'geojson_data'
    );
    expect(requiredArg).toBeDefined();
    expect(requiredArg?.required).toBe(true);
  });

  it('should have optional arguments', () => {
    const optionalArgs = ['show_bounds', 'convert_coordinates'];
    optionalArgs.forEach((argName) => {
      const arg = prompt.arguments.find((a) => a.name === argName);
      expect(arg).toBeDefined();
      expect(arg?.required).toBe(false);
    });
  });

  it('should generate messages with required arguments', () => {
    const result = prompt.execute({
      geojson_data: sampleGeojson
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');

    const text = result.messages[0].content.text;
    expect(text).toContain('Analyze the provided GeoJSON');
    expect(text).toContain('bounding_box_tool');
    expect(text).toContain('geojson_preview_tool');
  });

  it('should include bounding box calculation by default', () => {
    const result = prompt.execute({
      geojson_data: sampleGeojson
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Calculate bounding box');
    expect(text).toContain('bounding_box_tool');
  });

  it('should skip bounding box when show_bounds is false', () => {
    const result = prompt.execute({
      geojson_data: sampleGeojson,
      show_bounds: 'false'
    });

    const text = result.messages[0].content.text;
    // Should still mention visualization but with different step number
    expect(text).toContain('Generate visualization');
  });

  it('should include coordinate conversion when requested', () => {
    const result = prompt.execute({
      geojson_data: sampleGeojson,
      convert_coordinates: 'true'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('coordinate_conversion_tool');
    expect(text).toContain('Web Mercator');
    expect(text).toContain('EPSG:3857');
  });

  it('should include the geojson data in messages', () => {
    const result = prompt.execute({
      geojson_data: sampleGeojson
    });

    const text = result.messages[0].content.text;
    expect(text).toContain(sampleGeojson);
  });

  it('should throw error if geojson_data is missing', () => {
    expect(() => {
      prompt.execute({});
    }).toThrow('Missing required arguments: geojson_data');
  });

  it('should provide analysis guidelines', () => {
    const result = prompt.execute({
      geojson_data: sampleGeojson
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Analysis guidelines');
    expect(text).toContain('longitude, latitude');
    expect(text).toContain('right-hand rule');
  });

  it('should return proper metadata', () => {
    const metadata = prompt.getMetadata();
    expect(metadata.name).toBe(prompt.name);
    expect(metadata.description).toBe(prompt.description);
    expect(metadata.arguments).toEqual(prompt.arguments);
  });
});
