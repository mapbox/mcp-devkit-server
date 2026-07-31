// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

/**
 * @module prompts
 *
 * Public API for Mapbox MCP Devkit prompts. This module exports:
 * - Prompt classes for custom instantiation
 * - Pre-configured prompt instances ready to use
 * - Registry functions for batch access
 *
 * @example Simple usage with pre-configured instances
 * ```typescript
 * import { createAndPreviewStyle } from '@mapbox/mcp-devkit-server/prompts';
 *
 * // Use directly
 * const result = await createAndPreviewStyle.execute({ ... });
 * ```
 *
 * @example Advanced usage with custom instantiation
 * ```typescript
 * import { CreateAndPreviewStylePrompt } from '@mapbox/mcp-devkit-server/prompts';
 *
 * const customPrompt = new CreateAndPreviewStylePrompt();
 * ```
 */

// Export all prompt classes
export { CreateAndPreviewStylePrompt } from './CreateAndPreviewStylePrompt.js';
export { BuildCustomMapPrompt } from './BuildCustomMapPrompt.js';
export { AnalyzeGeojsonPrompt } from './AnalyzeGeojsonPrompt.js';
export { SetupMapboxProjectPrompt } from './SetupMapboxProjectPrompt.js';
export { DebugMapboxIntegrationPrompt } from './DebugMapboxIntegrationPrompt.js';
export { DesignDataDrivenStylePrompt } from './DesignDataDrivenStylePrompt.js';
export { PrepareStyleForProductionPrompt } from './PrepareStyleForProductionPrompt.js';

// Import prompt classes for instantiation
import { CreateAndPreviewStylePrompt } from './CreateAndPreviewStylePrompt.js';
import { BuildCustomMapPrompt } from './BuildCustomMapPrompt.js';
import { AnalyzeGeojsonPrompt } from './AnalyzeGeojsonPrompt.js';
import { SetupMapboxProjectPrompt } from './SetupMapboxProjectPrompt.js';
import { DebugMapboxIntegrationPrompt } from './DebugMapboxIntegrationPrompt.js';
import { DesignDataDrivenStylePrompt } from './DesignDataDrivenStylePrompt.js';
import { PrepareStyleForProductionPrompt } from './PrepareStyleForProductionPrompt.js';

// Export pre-configured prompt instances with short, clean names
/** Create and preview a new Mapbox style */
export const createAndPreviewStyle = new CreateAndPreviewStylePrompt();

/** Build a custom map */
export const buildCustomMap = new BuildCustomMapPrompt();

/** Analyze GeoJSON data */
export const analyzeGeojson = new AnalyzeGeojsonPrompt();

/** Setup a Mapbox project */
export const setupMapboxProject = new SetupMapboxProjectPrompt();

/** Debug Mapbox integration issues */
export const debugMapboxIntegration = new DebugMapboxIntegrationPrompt();

/** Design data-driven styles */
export const designDataDrivenStyle = new DesignDataDrivenStylePrompt();

/** Prepare style for production */
export const prepareStyleForProduction = new PrepareStyleForProductionPrompt();

// Export registry functions for batch access
export {
  getAllPrompts,
  getPromptByName,
  type PromptInstance
} from './promptRegistry.js';
