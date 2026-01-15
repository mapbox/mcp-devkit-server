// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { MapboxStyleLayersResource } from './mapbox-style-layers-resource/MapboxStyleLayersResource.js';
import { MapboxStreetsV8FieldsResource } from './mapbox-streets-v8-fields-resource/MapboxStreetsV8FieldsResource.js';
import { MapboxTokenScopesResource } from './mapbox-token-scopes-resource/MapboxTokenScopesResource.js';
import { MapboxLayerTypeMappingResource } from './mapbox-layer-type-mapping-resource/MapboxLayerTypeMappingResource.js';
import { MapboxDocumentationResource } from './mapbox-documentation-resource/MapboxDocumentationResource.js';
import { httpRequest } from '../utils/httpPipeline.js';

// Central registry of all resources
export const ALL_RESOURCES = [
  new MapboxStyleLayersResource(),
  new MapboxStreetsV8FieldsResource(),
  new MapboxTokenScopesResource(),
  new MapboxLayerTypeMappingResource(),
  new MapboxDocumentationResource({ httpRequest })
] as const;

export type ResourceInstance = (typeof ALL_RESOURCES)[number];

export function getAllResources(): readonly ResourceInstance[] {
  return ALL_RESOURCES;
}

export function getResourceByUri(uri: string): ResourceInstance | undefined {
  return ALL_RESOURCES.find((resource) => resource.uri === uri);
}
