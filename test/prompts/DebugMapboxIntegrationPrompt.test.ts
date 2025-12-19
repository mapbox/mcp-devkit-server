// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { DebugMapboxIntegrationPrompt } from '../../src/prompts/DebugMapboxIntegrationPrompt.js';

describe('DebugMapboxIntegrationPrompt', () => {
  const prompt = new DebugMapboxIntegrationPrompt();

  it('should have correct metadata', () => {
    expect(prompt.name).toBe('debug-mapbox-integration');
    expect(prompt.description).toContain('troubleshooting workflow');
    expect(prompt.arguments).toHaveLength(4);
  });

  it('should require issue_description argument', () => {
    const requiredArg = prompt.arguments.find(
      (arg) => arg.name === 'issue_description'
    );
    expect(requiredArg).toBeDefined();
    expect(requiredArg?.required).toBe(true);
  });

  it('should have optional arguments', () => {
    const optionalArgs = ['error_message', 'style_id', 'environment'];
    optionalArgs.forEach((argName) => {
      const arg = prompt.arguments.find((a) => a.name === argName);
      expect(arg).toBeDefined();
      expect(arg?.required).toBe(false);
    });
  });

  it('should generate messages with required arguments', () => {
    const result = prompt.execute({
      issue_description: 'Map not loading'
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');

    const text = result.messages[0].content.text;
    expect(text).toContain('Map not loading');
    expect(text).toContain('list_tokens_tool');
    expect(text).toContain('Phase 1');
  });

  it('should include error message when provided', () => {
    const result = prompt.execute({
      issue_description: 'Map not loading',
      error_message: '401 Unauthorized'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('401 Unauthorized');
  });

  it('should provide specific 401 debugging steps', () => {
    const result = prompt.execute({
      issue_description: 'Auth error',
      error_message: '401 unauthorized'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('401 Unauthorized');
    expect(text).toContain('Token not set');
    expect(text).toContain('Invalid token');
  });

  it('should provide specific 403 debugging steps', () => {
    const result = prompt.execute({
      issue_description: 'Forbidden error',
      error_message: '403 Forbidden'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('403 Forbidden');
    expect(text).toContain('URL restriction');
    expect(text).toContain('Missing scope');
  });

  it('should include style verification when style_id provided', () => {
    const result = prompt.execute({
      issue_description: 'Style not loading',
      style_id: 'my-style-id'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('my-style-id');
    expect(text).toContain('list_styles_tool');
    expect(text).toContain('Style Verification');
  });

  it('should mention environment in output', () => {
    const result = prompt.execute({
      issue_description: 'Issue',
      environment: 'production'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('production');
  });

  it('should include style/layer error solutions for style-related errors', () => {
    const result = prompt.execute({
      issue_description: 'Layer error',
      error_message: 'Layer source not found'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Layer/Source Error Solutions');
  });

  it('should include general debugging steps when no error message provided', () => {
    const result = prompt.execute({
      issue_description: 'Something is wrong'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('General debugging');
    expect(text).toContain('browser console');
  });

  it('should include all diagnostic phases', () => {
    const result = prompt.execute({
      issue_description: 'Issue'
    });

    const text = result.messages[0].content.text;
    expect(text).toContain('Phase 1');
    expect(text).toContain('Phase 2');
    expect(text).toContain('Phase 3');
    expect(text).toContain('Phase 4');
    expect(text).toContain('Phase 5');
    expect(text).toContain('Phase 6');
  });

  it('should throw error if required argument is missing', () => {
    expect(() => {
      prompt.execute({});
    }).toThrow('Missing required arguments: issue_description');
  });

  it('should return proper metadata', () => {
    const metadata = prompt.getMetadata();
    expect(metadata.name).toBe(prompt.name);
    expect(metadata.description).toBe(prompt.description);
    expect(metadata.arguments).toEqual(prompt.arguments);
  });
});
