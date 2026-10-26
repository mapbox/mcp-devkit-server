// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { McpServer } from '@modelcontextprotocol/server';
import type { BaseResource } from './BaseResource.js';
import { MapboxStyleLayersResource } from './mapbox-style-layers-resource/MapboxStyleLayersResource.js';
import { MapboxStreetsV8FieldsResource } from './mapbox-streets-v8-fields-resource/MapboxStreetsV8FieldsResource.js';
import { MapboxTokenScopesResource } from './mapbox-token-scopes-resource/MapboxTokenScopesResource.js';
import { MapboxLayerTypeMappingResource } from './mapbox-layer-type-mapping-resource/MapboxLayerTypeMappingResource.js';
import { MapPreviewUIResource } from './ui-apps/MapPreviewUIResource.js';
import { StyleComparisonUIResource } from './ui-apps/StyleComparisonUIResource.js';

// Central registry of all resources
export const ALL_RESOURCES = [
  new MapboxStyleLayersResource(),
  new MapboxStreetsV8FieldsResource(),
  new MapboxTokenScopesResource(),
  new MapboxLayerTypeMappingResource(),
  // MCP Apps UI resources (ui:// scheme)
  new MapPreviewUIResource(),
  new StyleComparisonUIResource()
] as const;

export type ResourceInstance = (typeof ALL_RESOURCES)[number];

export function getAllResources(): readonly ResourceInstance[] {
  return ALL_RESOURCES;
}

/**
 * Registers every resource on `server` via `BaseResource.installTo`, so each
 * read callback receives the request's `extra` (including the caller's
 * `http.authInfo`). UI resources declare `RESOURCE_MIME_TYPE` themselves, which is
 * all `registerAppResource` would add.
 */
export function installResources(
  server: McpServer,
  resources: readonly BaseResource[] = ALL_RESOURCES
): void {
  resources.forEach((resource) => resource.installTo(server));
}

export function getResourceByUri(uri: string): ResourceInstance | undefined {
  return ALL_RESOURCES.find((resource) => resource.uri === uri);
}
