// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { BuildCustomMapPrompt } from '../../src/prompts/BuildCustomMapPrompt.js';

describe('BuildCustomMapPrompt', () => {
  const prompt = new BuildCustomMapPrompt();

  it('should have correct metadata', () => {
    expect(prompt.name).toBe('build-custom-map');
    expect(prompt.description).toContain('conversational AI');
    expect(prompt.arguments).toHaveLength(4);
  });

  it('should require theme argument', () => {
    const requiredArg = prompt.arguments.find((arg) => arg.name === 'theme');
    expect(requiredArg).toBeDefined();
    expect(requiredArg?.required).toBe(true);
  });

  it('should have optional arguments', () => {
    const optionalArgs = ['emphasis', 'preview_location', 'preview_zoom'];
    optionalArgs.forEach((argName) => {
      const arg = prompt.arguments.find((a) => a.name === argName);
      expect(arg).toBeDefined();
      expect(arg?.required).toBe(false);
    });
  });

  it('should generate messages with required arguments', () => {
    const result = prompt.execute({
      theme: 'dark cyberpunk'
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');

    const text = result.messages[0].content.text;
    expect(text).toContain('dark cyberpunk');
    expect(text).toContain('style_builder_tool');
    expect(text).toContain('create_style_tool');
    expect(text).toContain('preview_style_tool');
  });

  it('should include emphasis in prompt', () => {
    const result = prompt.execute({
      theme: 'nature-focused',
      emphasis: 'parks and green spaces'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('parks and green spaces');
    expect(text).toContain('emphasizing');
  });

  it('should include preview location when provided', () => {
    const result = prompt.execute({
      theme: 'minimal monochrome',
      preview_location: 'Tokyo',
      preview_zoom: '15'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Tokyo');
    expect(text).toContain('15');
  });

  it('should throw error if theme is missing', () => {
    expect(() => {
      prompt.execute({});
    }).toThrow('Missing required arguments: theme');
  });

  it('should provide theme interpretation tips', () => {
    const result = prompt.execute({
      theme: 'retro 80s neon'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Theme interpretation tips');
    expect(text).toContain('Dark cyberpunk');
    expect(text).toContain('Nature-focused');
  });

  it('should return proper metadata', () => {
    const metadata = prompt.getMetadata();
    expect(metadata.name).toBe(prompt.name);
    expect(metadata.description).toBe(prompt.description);
    expect(metadata.arguments).toEqual(prompt.arguments);
  });
});
