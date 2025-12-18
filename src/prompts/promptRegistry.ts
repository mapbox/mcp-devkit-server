// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { CreateAndPreviewStylePrompt } from './CreateAndPreviewStylePrompt.js';
import { BuildCustomMapPrompt } from './BuildCustomMapPrompt.js';
import { AnalyzeGeojsonPrompt } from './AnalyzeGeojsonPrompt.js';

// Central registry of all prompts
export const ALL_PROMPTS = [
  new CreateAndPreviewStylePrompt(),
  new BuildCustomMapPrompt(),
  new AnalyzeGeojsonPrompt()
] as const;

export type PromptInstance = (typeof ALL_PROMPTS)[number];

/**
 * Get all registered prompts
 */
export function getAllPrompts(): readonly PromptInstance[] {
  return ALL_PROMPTS;
}

/**
 * Get a specific prompt by name
 * @param name - The name of the prompt to retrieve
 */
export function getPromptByName(name: string): PromptInstance | undefined {
  return ALL_PROMPTS.find((prompt) => prompt.name === name);
}
