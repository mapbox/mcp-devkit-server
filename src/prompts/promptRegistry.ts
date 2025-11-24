// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { BasePrompt } from './BasePrompt.js';
import { CreateStylePrompt } from './CreateStylePrompt.js';
import { CompareStylesPrompt } from './CompareStylesPrompt.js';
import { AnalyzeGeojsonPrompt } from './AnalyzeGeojsonPrompt.js';
import { SetupProductionTokenPrompt } from './SetupProductionTokenPrompt.js';
import { DebugStylePrompt } from './DebugStylePrompt.js';

/**
 * Registry of all available prompts in the DevKit server.
 * Prompts are templates that guide users in effectively using the server's capabilities.
 */
export function getAllPrompts(): BasePrompt[] {
  return [
    new CreateStylePrompt(),
    new CompareStylesPrompt(),
    new AnalyzeGeojsonPrompt(),
    new SetupProductionTokenPrompt(),
    new DebugStylePrompt()
  ];
}

/**
 * Find a specific prompt by name
 */
export function findPromptByName(name: string): BasePrompt | undefined {
  return getAllPrompts().find((prompt) => prompt.name === name);
}
