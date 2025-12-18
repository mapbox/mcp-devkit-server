// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import {
  getAllPrompts,
  getPromptByName
} from '../../src/prompts/promptRegistry.js';

describe('promptRegistry', () => {
  describe('getAllPrompts', () => {
    it('should return all registered prompts', () => {
      const prompts = getAllPrompts();
      expect(prompts).toHaveLength(3);
    });

    it('should include create-and-preview-style prompt', () => {
      const prompts = getAllPrompts();
      const prompt = prompts.find((p) => p.name === 'create-and-preview-style');
      expect(prompt).toBeDefined();
      expect(prompt?.description).toContain('Create a new Mapbox map style');
    });

    it('should include build-custom-map prompt', () => {
      const prompts = getAllPrompts();
      const prompt = prompts.find((p) => p.name === 'build-custom-map');
      expect(prompt).toBeDefined();
      expect(prompt?.description).toContain('conversational AI');
    });

    it('should include analyze-geojson prompt', () => {
      const prompts = getAllPrompts();
      const prompt = prompts.find((p) => p.name === 'analyze-geojson');
      expect(prompt).toBeDefined();
      expect(prompt?.description).toContain('Analyze and visualize GeoJSON');
    });

    it('should return readonly array', () => {
      const prompts = getAllPrompts();
      expect(Object.isFrozen(prompts)).toBe(false); // ReadonlyArray is not frozen, just typed
      expect(Array.isArray(prompts)).toBe(true);
    });
  });

  describe('getPromptByName', () => {
    it('should return prompt by name', () => {
      const prompt = getPromptByName('create-and-preview-style');
      expect(prompt).toBeDefined();
      expect(prompt?.name).toBe('create-and-preview-style');
    });

    it('should return undefined for unknown prompt', () => {
      const prompt = getPromptByName('non-existent-prompt');
      expect(prompt).toBeUndefined();
    });

    it('should find all registered prompts by name', () => {
      const promptNames = [
        'create-and-preview-style',
        'build-custom-map',
        'analyze-geojson'
      ];

      promptNames.forEach((name) => {
        const prompt = getPromptByName(name);
        expect(prompt).toBeDefined();
        expect(prompt?.name).toBe(name);
      });
    });
  });

  describe('prompt naming convention', () => {
    it('should follow snake_case naming', () => {
      const prompts = getAllPrompts();
      prompts.forEach((prompt) => {
        expect(prompt.name).toMatch(/^[a-z]+(-[a-z]+)*$/);
        expect(prompt.name).not.toMatch(/[A-Z]/);
        expect(prompt.name).not.toMatch(/_/);
      });
    });

    it('should have unique names', () => {
      const prompts = getAllPrompts();
      const names = prompts.map((p) => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
