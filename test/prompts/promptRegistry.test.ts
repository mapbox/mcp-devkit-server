// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import {
  getAllPrompts,
  findPromptByName
} from '../../src/prompts/promptRegistry.js';

describe('Prompt Registry', () => {
  describe('getAllPrompts', () => {
    it('should return all available prompts', () => {
      const prompts = getAllPrompts();

      expect(prompts).toBeDefined();
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('should return prompts with correct structure', () => {
      const prompts = getAllPrompts();

      prompts.forEach((prompt) => {
        expect(prompt.name).toBeDefined();
        expect(typeof prompt.name).toBe('string');
        expect(prompt.toPromptDefinition).toBeDefined();
        expect(prompt.handleGetPrompt).toBeDefined();
      });
    });

    it('should include all expected prompts', () => {
      const prompts = getAllPrompts();
      const promptNames = prompts.map((p) => p.name);

      expect(promptNames).toContain('create-style-for-usecase');
      expect(promptNames).toContain('compare-styles-at-location');
      expect(promptNames).toContain('analyze-geojson-data');
      expect(promptNames).toContain('setup-production-token');
      expect(promptNames).toContain('debug-style-issues');
    });
  });

  describe('findPromptByName', () => {
    it('should find existing prompts', () => {
      const prompt = findPromptByName('create-style-for-usecase');

      expect(prompt).toBeDefined();
      expect(prompt?.name).toBe('create-style-for-usecase');
    });

    it('should return undefined for non-existent prompts', () => {
      const prompt = findPromptByName('non-existent-prompt');

      expect(prompt).toBeUndefined();
    });
  });

  describe('Prompt Definitions', () => {
    it('should have proper prompt definitions for all prompts', () => {
      const prompts = getAllPrompts();

      prompts.forEach((prompt) => {
        const definition = prompt.toPromptDefinition();

        expect(definition.name).toBe(prompt.name);
        expect(definition.description).toBeDefined();
        expect(typeof definition.description).toBe('string');
      });
    });

    it('should have arguments for prompts that need them', () => {
      const createStylePrompt = findPromptByName('create-style-for-usecase');
      const compareStylesPrompt = findPromptByName(
        'compare-styles-at-location'
      );

      expect(createStylePrompt).toBeDefined();
      expect(createStylePrompt?.arguments).toBeDefined();
      expect(createStylePrompt?.arguments?.length).toBeGreaterThan(0);

      expect(compareStylesPrompt).toBeDefined();
      expect(compareStylesPrompt?.arguments).toBeDefined();
      expect(compareStylesPrompt?.arguments?.length).toBeGreaterThan(0);
    });
  });

  describe('Required Arguments', () => {
    it('should enforce required arguments in create-style-for-usecase', async () => {
      const prompt = findPromptByName('create-style-for-usecase');
      expect(prompt).toBeDefined();

      // Missing required argument should throw
      await expect(async () => {
        prompt?.handleGetPrompt({});
      }).rejects.toThrow(/required/i);
    });

    it('should enforce required arguments in compare-styles-at-location', async () => {
      const prompt = findPromptByName('compare-styles-at-location');
      expect(prompt).toBeDefined();

      // Missing required arguments should throw
      await expect(async () => {
        prompt?.handleGetPrompt({});
      }).rejects.toThrow(/required/i);
    });

    it('should allow optional arguments to be omitted', async () => {
      const prompt = findPromptByName('create-style-for-usecase');
      expect(prompt).toBeDefined();

      // Should not throw with only required arguments
      const result = await prompt?.handleGetPrompt({
        useCase: 'food delivery app'
      });

      expect(result).toBeDefined();
      expect(result?.messages).toBeDefined();
      expect(Array.isArray(result?.messages)).toBe(true);
    });
  });

  describe('Message Generation', () => {
    it('should generate messages with user role', async () => {
      const prompt = findPromptByName('create-style-for-usecase');
      const result = await prompt?.handleGetPrompt({
        useCase: 'restaurant finder'
      });

      expect(result?.messages).toBeDefined();
      expect(result?.messages?.[0].role).toBe('user');
    });

    it('should include argument values in generated messages', async () => {
      const prompt = findPromptByName('create-style-for-usecase');
      const result = await prompt?.handleGetPrompt({
        useCase: 'tourism guide',
        colorScheme: 'light',
        location: 'Warsaw'
      });

      const messageText =
        result?.messages?.[0].content.type === 'text'
          ? result.messages[0].content.text
          : '';

      expect(messageText).toContain('tourism guide');
      expect(messageText).toContain('light');
      expect(messageText).toContain('Warsaw');
    });

    it('should generate appropriate messages for debug-style-issues prompt', async () => {
      const prompt = findPromptByName('debug-style-issues');
      const result = await prompt?.handleGetPrompt({
        problem: 'style not loading',
        styleId: 'username/my-style'
      });

      const messageText =
        result?.messages?.[0].content.type === 'text'
          ? result.messages[0].content.text
          : '';

      expect(messageText).toContain('style not loading');
      expect(messageText).toContain('username/my-style');
      expect(messageText).toContain('debug');
    });

    it('should generate appropriate messages for setup-production-token prompt', async () => {
      const prompt = findPromptByName('setup-production-token');
      const result = await prompt?.handleGetPrompt({
        website: 'https://example.com',
        purpose: 'production web app'
      });

      const messageText =
        result?.messages?.[0].content.type === 'text'
          ? result.messages[0].content.text
          : '';

      expect(messageText).toContain('https://example.com');
      expect(messageText).toContain('production web app');
      expect(messageText).toContain('public');
    });
  });

  describe('Prompt Naming Convention', () => {
    it('should use kebab-case for all prompt names', () => {
      const prompts = getAllPrompts();

      prompts.forEach((prompt) => {
        // Check if name is kebab-case (lowercase with hyphens)
        expect(prompt.name).toMatch(/^[a-z]+(-[a-z]+)*$/);
      });
    });

    it('should have unique prompt names', () => {
      const prompts = getAllPrompts();
      const names = prompts.map((p) => p.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });
  });
});
