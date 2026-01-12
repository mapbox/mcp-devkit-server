// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { PrepareStyleForProductionPrompt } from '../../src/prompts/PrepareStyleForProductionPrompt.js';

describe('PrepareStyleForProductionPrompt', () => {
  const prompt = new PrepareStyleForProductionPrompt();

  it('should have correct metadata', () => {
    expect(prompt.name).toBe('prepare-style-for-production');
    expect(prompt.description).toContain('quality validation');
    expect(prompt.arguments).toHaveLength(3);
  });

  it('should require style_id_or_json argument', () => {
    const requiredArg = prompt.arguments.find(
      (arg) => arg.name === 'style_id_or_json'
    );
    expect(requiredArg).toBeDefined();
    expect(requiredArg?.required).toBe(true);
  });

  it('should have optional arguments', () => {
    const optionalArgs = ['skip_optimization', 'wcag_level'];
    optionalArgs.forEach((argName) => {
      const arg = prompt.arguments.find((a) => a.name === argName);
      expect(arg).toBeDefined();
      expect(arg?.required).toBe(false);
    });
  });

  it('should generate messages with style ID', () => {
    const result = prompt.execute({
      style_id_or_json: 'username/style-id'
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');

    const text = result.messages[0].content.text;
    expect(text).toContain('username/style-id');
    expect(text).toContain('retrieve_style_tool');
    expect(text).toContain('validate_expression_tool');
    expect(text).toContain('check_color_contrast_tool');
    expect(text).toContain('optimize_style_tool');
  });

  it('should generate messages with style JSON', () => {
    const styleJson = '{"version": 8, "name": "Test"}';
    const result = prompt.execute({
      style_id_or_json: styleJson
    });

    const text = result.messages[0].content.text;
    expect(text).toContain(styleJson);
    expect(text).toContain('parse it directly');
    expect(text).not.toContain('retrieve_style_tool');
  });

  it('should include validation tools in workflow', () => {
    const result = prompt.execute({
      style_id_or_json: 'test/style'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('validate_expression_tool');
    expect(text).toContain('validate_geojson_tool');
    expect(text).toContain('check_color_contrast_tool');
    expect(text).toContain('filter');
    expect(text).toContain('paint');
    expect(text).toContain('layout');
  });

  it('should include optimization by default', () => {
    const result = prompt.execute({
      style_id_or_json: 'test/style'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('optimize_style_tool');
    expect(text).toContain('Step 5: Optimize the Style');
    expect(text).not.toContain('Skipped per user request');
  });

  it('should skip optimization when requested', () => {
    const result = prompt.execute({
      style_id_or_json: 'test/style',
      skip_optimization: 'true'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Step 5: Style Optimization');
    expect(text).toContain('Skipped per user request');
    expect(text).not.toContain('optimize_style_tool');
  });

  it('should use default WCAG level AA', () => {
    const result = prompt.execute({
      style_id_or_json: 'test/style'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('WCAG AA');
    expect(text).toContain('level: "AA"');
  });

  it('should use custom WCAG level when specified', () => {
    const result = prompt.execute({
      style_id_or_json: 'test/style',
      wcag_level: 'AAA'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('WCAG AAA');
    expect(text).toContain('level: "AAA"');
  });

  it('should include quality report template', () => {
    const result = prompt.execute({
      style_id_or_json: 'test/style'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Production Quality Report');
    expect(text).toContain('Expression Validation');
    expect(text).toContain('GeoJSON Validation');
    expect(text).toContain('Accessibility');
    expect(text).toContain('Deployment Readiness');
    expect(text).toContain('Action Items');
  });

  it('should include troubleshooting guidance', () => {
    const result = prompt.execute({
      style_id_or_json: 'test/style'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('If Issues Are Found');
    expect(text).toContain('Expression errors:');
    expect(text).toContain('GeoJSON errors:');
    expect(text).toContain('Contrast failures:');
  });

  it('should throw error if required argument is missing', () => {
    expect(() => {
      prompt.execute({});
    }).toThrow('Missing required arguments: style_id_or_json');
  });

  it('should return proper metadata', () => {
    const metadata = prompt.getMetadata();
    expect(metadata.name).toBe(prompt.name);
    expect(metadata.description).toBe(prompt.description);
    expect(metadata.arguments).toEqual(prompt.arguments);
  });

  it('should include all validation steps in order', () => {
    const result = prompt.execute({
      style_id_or_json: 'test/style'
    });

    const text = result.messages[0].content.text;
    const step1Index = text.indexOf('Step 1: Load the Style');
    const step2Index = text.indexOf('Step 2: Validate All Expressions');
    const step3Index = text.indexOf('Step 3: Validate GeoJSON Sources');
    const step4Index = text.indexOf('Step 4: Check Color Contrast');
    const step5Index = text.indexOf('Step 5:');

    expect(step1Index).toBeGreaterThan(-1);
    expect(step2Index).toBeGreaterThan(step1Index);
    expect(step3Index).toBeGreaterThan(step2Index);
    expect(step4Index).toBeGreaterThan(step3Index);
    expect(step5Index).toBeGreaterThan(step4Index);
  });
});
