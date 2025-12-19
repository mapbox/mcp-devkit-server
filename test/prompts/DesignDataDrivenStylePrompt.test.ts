// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { DesignDataDrivenStylePrompt } from '../../src/prompts/DesignDataDrivenStylePrompt.js';

describe('DesignDataDrivenStylePrompt', () => {
  const prompt = new DesignDataDrivenStylePrompt();

  it('should have correct metadata', () => {
    expect(prompt.name).toBe('design-data-driven-style');
    expect(prompt.description).toContain('data-driven properties');
    expect(prompt.arguments).toHaveLength(5);
  });

  it('should require essential arguments', () => {
    const requiredArgs = ['style_name', 'data_description', 'property_name'];
    requiredArgs.forEach((argName) => {
      const arg = prompt.arguments.find((a) => a.name === argName);
      expect(arg).toBeDefined();
      expect(arg?.required).toBe(true);
    });
  });

  it('should have optional arguments', () => {
    const optionalArgs = ['visualization_type', 'color_scheme'];
    optionalArgs.forEach((argName) => {
      const arg = prompt.arguments.find((a) => a.name === argName);
      expect(arg).toBeDefined();
      expect(arg?.required).toBe(false);
    });
  });

  it('should generate messages with required arguments', () => {
    const result = prompt.execute({
      style_name: 'Population Map',
      data_description: 'City populations',
      property_name: 'population'
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');

    const text = result.messages[0].content.text;
    expect(text).toContain('Population Map');
    expect(text).toContain('City populations');
    expect(text).toContain('population');
  });

  it('should include expression examples', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('interpolate');
    expect(text).toContain('["get", "value"]');
    expect(text).toContain('Expression types');
  });

  it('should include color visualization for color type', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value',
      visualization_type: 'color'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('fill-color');
    expect(text).toContain('Color by Value');
  });

  it('should include size visualization for size type', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value',
      visualization_type: 'size'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('circle-radius');
    expect(text).toContain('Size by Value');
  });

  it('should include both color and size for both type', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value',
      visualization_type: 'both'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('fill-color');
    expect(text).toContain('circle-radius');
  });

  it('should include heatmap configuration for heatmap type', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value',
      visualization_type: 'heatmap'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('heatmap');
    expect(text).toContain('heatmap-weight');
    expect(text).toContain('heatmap-color');
  });

  it('should use sequential color scheme by default', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('sequential');
  });

  it('should include diverging colors when specified', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value',
      color_scheme: 'diverging'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Diverging');
    expect(text).toContain('midpoint');
  });

  it('should include categorical colors when specified', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value',
      color_scheme: 'categorical'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('match');
    expect(text).toContain('Category');
  });

  it('should include all workflow steps', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Step 1');
    expect(text).toContain('Step 2');
    expect(text).toContain('Step 3');
    expect(text).toContain('Step 4');
    expect(text).toContain('Step 5');
    expect(text).toContain('Step 6');
    expect(text).toContain('Step 7');
    expect(text).toContain('Step 8');
  });

  it('should include advanced expression examples', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Advanced Expressions');
    expect(text).toContain('Zoom-Based');
    expect(text).toContain('Conditional');
  });

  it('should include best practices', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Best Practices');
    expect(text).toContain('DO:');
    expect(text).toContain("DON'T:");
  });

  it('should reference style builder tool', () => {
    const result = prompt.execute({
      style_name: 'Test',
      data_description: 'Data',
      property_name: 'value'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('style_builder_tool');
    expect(text).toContain('create_style_tool');
  });

  it('should throw error if required arguments are missing', () => {
    expect(() => {
      prompt.execute({ style_name: 'Test' });
    }).toThrow('Missing required arguments');

    expect(() => {
      prompt.execute({});
    }).toThrow('Missing required arguments');
  });

  it('should return proper metadata', () => {
    const metadata = prompt.getMetadata();
    expect(metadata.name).toBe(prompt.name);
    expect(metadata.description).toBe(prompt.description);
    expect(metadata.arguments).toEqual(prompt.arguments);
  });
});
