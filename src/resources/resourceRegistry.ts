import { MapboxStyleLayersResource } from './mapbox-style-layers-resource/MapboxStyleLayersResource.js';

// Central registry of all resources
export const ALL_RESOURCES = [new MapboxStyleLayersResource()] as const;

export type ResourceInstance = (typeof ALL_RESOURCES)[number];

export function getAllResources(): readonly ResourceInstance[] {
  return ALL_RESOURCES;
}

export function getResourceByUri(uri: string): ResourceInstance | undefined {
  return ALL_RESOURCES.find((resource) => resource.uri === uri);
}
