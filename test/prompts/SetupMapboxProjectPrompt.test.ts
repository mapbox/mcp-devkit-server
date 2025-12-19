// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { SetupMapboxProjectPrompt } from '../../src/prompts/SetupMapboxProjectPrompt.js';

describe('SetupMapboxProjectPrompt', () => {
  const prompt = new SetupMapboxProjectPrompt();

  it('should have correct metadata', () => {
    expect(prompt.name).toBe('setup-mapbox-project');
    expect(prompt.description).toContain('Complete setup workflow');
    expect(prompt.arguments).toHaveLength(4);
  });

  it('should require project_name argument', () => {
    const requiredArg = prompt.arguments.find(
      (arg) => arg.name === 'project_name'
    );
    expect(requiredArg).toBeDefined();
    expect(requiredArg?.required).toBe(true);
  });

  it('should have optional arguments', () => {
    const optionalArgs = ['project_type', 'production_domain', 'style_theme'];
    optionalArgs.forEach((argName) => {
      const arg = prompt.arguments.find((a) => a.name === argName);
      expect(arg).toBeDefined();
      expect(arg?.required).toBe(false);
    });
  });

  it('should generate messages with required arguments', () => {
    const result = prompt.execute({
      project_name: 'MyApp'
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');

    const text = result.messages[0].content.text;
    expect(text).toContain('MyApp');
    expect(text).toContain('create_token_tool');
    expect(text).toContain('style_builder_tool');
  });

  it('should include development token instructions', () => {
    const result = prompt.execute({
      project_name: 'MyApp'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Development');
    expect(text).toContain('localhost');
  });

  it('should include production domain in URL restrictions when provided', () => {
    const result = prompt.execute({
      project_name: 'MyApp',
      project_type: 'web',
      production_domain: 'myapp.com'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('myapp.com');
    expect(text).toContain('Production Token');
  });

  it('should warn about missing URL restrictions when no domain provided', () => {
    const result = prompt.execute({
      project_name: 'MyApp',
      project_type: 'web'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('No URL Restrictions');
    expect(text).toContain('less secure');
  });

  it('should include backend token instructions for fullstack projects', () => {
    const result = prompt.execute({
      project_name: 'MyApp',
      project_type: 'fullstack'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Backend');
    expect(text).toContain('SECRET');
    expect(text).toContain('environment variables');
  });

  it('should include mobile-specific instructions', () => {
    const result = prompt.execute({
      project_name: 'MyApp',
      project_type: 'mobile'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Mobile');
    expect(text).toContain('vision:read');
  });

  it('should use specified style theme', () => {
    const result = prompt.execute({
      project_name: 'MyApp',
      style_theme: 'dark'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('dark');
  });

  it('should throw error if required argument is missing', () => {
    expect(() => {
      prompt.execute({});
    }).toThrow('Missing required arguments: project_name');
  });

  it('should return proper metadata', () => {
    const metadata = prompt.getMetadata();
    expect(metadata.name).toBe(prompt.name);
    expect(metadata.description).toBe(prompt.description);
    expect(metadata.arguments).toEqual(prompt.arguments);
  });
});
