// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { MapboxStyleLayersResource } from './mapbox-style-layers-resource/MapboxStyleLayersResource.js';
import { MapboxStreetsV8FieldsResource } from './mapbox-streets-v8-fields-resource/MapboxStreetsV8FieldsResource.js';
import { MapboxTokenScopesResource } from './mapbox-token-scopes-resource/MapboxTokenScopesResource.js';
import { MapboxLayerTypeMappingResource } from './mapbox-layer-type-mapping-resource/MapboxLayerTypeMappingResource.js';
import { MapboxDocumentationResource } from './mapbox-documentation-resource/MapboxDocumentationResource.js';
import { PreviewStyleUIResource } from './ui-apps/PreviewStyleUIResource.js';
import { StyleComparisonUIResource } from './ui-apps/StyleComparisonUIResource.js';
import { GeojsonPreviewUIResource } from './ui-apps/GeojsonPreviewUIResource.js';
import { httpRequest } from '../utils/httpPipeline.js';

// Central registry of all resources
export const ALL_RESOURCES = [
  new MapboxStyleLayersResource(),
  new MapboxStreetsV8FieldsResource(),
  new MapboxTokenScopesResource(),
  new MapboxLayerTypeMappingResource(),
  new MapboxDocumentationResource({ httpRequest }),
  // MCP Apps UI resources (ui:// scheme)
  new PreviewStyleUIResource(),
  new StyleComparisonUIResource(),
  new GeojsonPreviewUIResource()
] as const;

export type ResourceInstance = (typeof ALL_RESOURCES)[number];

export function getAllResources(): readonly ResourceInstance[] {
  return ALL_RESOURCES;
}

export function getResourceByUri(uri: string): ResourceInstance | undefined {
  return ALL_RESOURCES.find((resource) => resource.uri === uri);
}
