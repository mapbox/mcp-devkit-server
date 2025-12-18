// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { CreateAndPreviewStylePrompt } from '../../src/prompts/CreateAndPreviewStylePrompt.js';

describe('CreateAndPreviewStylePrompt', () => {
  const prompt = new CreateAndPreviewStylePrompt();

  it('should have correct metadata', () => {
    expect(prompt.name).toBe('create-and-preview-style');
    expect(prompt.description).toContain('Create a new Mapbox map style');
    expect(prompt.arguments).toHaveLength(5);
  });

  it('should require style_name argument', () => {
    const requiredArg = prompt.arguments.find(
      (arg) => arg.name === 'style_name'
    );
    expect(requiredArg).toBeDefined();
    expect(requiredArg?.required).toBe(true);
  });

  it('should have optional arguments', () => {
    const optionalArgs = [
      'style_description',
      'base_style',
      'preview_location',
      'preview_zoom'
    ];
    optionalArgs.forEach((argName) => {
      const arg = prompt.arguments.find((a) => a.name === argName);
      expect(arg).toBeDefined();
      expect(arg?.required).toBe(false);
    });
  });

  it('should generate messages with required arguments', () => {
    const result = prompt.execute({
      style_name: 'Test Style'
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');

    const text = result.messages[0].content.text;
    expect(text).toContain('Test Style');
    expect(text).toContain('list_tokens_tool');
    expect(text).toContain('create_style_tool');
    expect(text).toContain('preview_style_tool');
  });

  it('should include optional arguments in messages', () => {
    const result = prompt.execute({
      style_name: 'Test Style',
      style_description: 'A beautiful test style',
      base_style: 'dark-v11',
      preview_location: 'San Francisco',
      preview_zoom: '14'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('A beautiful test style');
    expect(text).toContain('dark-v11');
    expect(text).toContain('San Francisco');
    expect(text).toContain('14');
  });

  it('should throw error if required argument is missing', () => {
    expect(() => {
      prompt.execute({});
    }).toThrow('Missing required arguments: style_name');
  });

  it('should return proper metadata', () => {
    const metadata = prompt.getMetadata();
    expect(metadata.name).toBe(prompt.name);
    expect(metadata.description).toBe(prompt.description);
    expect(metadata.arguments).toEqual(prompt.arguments);
  });
});
