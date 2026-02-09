// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

/**
 * @module resources
 *
 * Public API for Mapbox MCP Devkit resources. This module exports:
 * - Resource classes for custom instantiation
 * - Pre-configured resource instances ready to use
 * - Registry functions for batch access
 *
 * @example Simple usage with pre-configured instances
 * ```typescript
 * import { mapboxStyleLayers } from '@mapbox/mcp-devkit-server/resources';
 *
 * // Use directly - httpRequest already configured
 * const result = await mapboxStyleLayers.read();
 * ```
 *
 * @example Advanced usage with custom pipeline
 * ```typescript
 * import { MapboxDocumentationResource } from '@mapbox/mcp-devkit-server/resources';
 * import { httpRequest } from '@mapbox/mcp-devkit-server/utils';
 *
 * const customResource = new MapboxDocumentationResource({ httpRequest });
 * ```
 */

import { httpRequest } from '../utils/httpPipeline.js';

// Export all resource classes
export { MapboxStyleLayersResource } from './mapbox-style-layers-resource/MapboxStyleLayersResource.js';
export { MapboxStreetsV8FieldsResource } from './mapbox-streets-v8-fields-resource/MapboxStreetsV8FieldsResource.js';
export { MapboxTokenScopesResource } from './mapbox-token-scopes-resource/MapboxTokenScopesResource.js';
export { MapboxLayerTypeMappingResource } from './mapbox-layer-type-mapping-resource/MapboxLayerTypeMappingResource.js';
export { MapboxDocumentationResource } from './mapbox-documentation-resource/MapboxDocumentationResource.js';
export { PreviewStyleUIResource } from './ui-apps/PreviewStyleUIResource.js';
export { StyleComparisonUIResource } from './ui-apps/StyleComparisonUIResource.js';
export { GeojsonPreviewUIResource } from './ui-apps/GeojsonPreviewUIResource.js';

// Import resource classes for instantiation
import { MapboxStyleLayersResource } from './mapbox-style-layers-resource/MapboxStyleLayersResource.js';
import { MapboxStreetsV8FieldsResource } from './mapbox-streets-v8-fields-resource/MapboxStreetsV8FieldsResource.js';
import { MapboxTokenScopesResource } from './mapbox-token-scopes-resource/MapboxTokenScopesResource.js';
import { MapboxLayerTypeMappingResource } from './mapbox-layer-type-mapping-resource/MapboxLayerTypeMappingResource.js';
import { MapboxDocumentationResource } from './mapbox-documentation-resource/MapboxDocumentationResource.js';
import { PreviewStyleUIResource } from './ui-apps/PreviewStyleUIResource.js';
import { StyleComparisonUIResource } from './ui-apps/StyleComparisonUIResource.js';
import { GeojsonPreviewUIResource } from './ui-apps/GeojsonPreviewUIResource.js';

// Export pre-configured resource instances with short, clean names
/** Mapbox style layers reference */
export const mapboxStyleLayers = new MapboxStyleLayersResource();

/** Mapbox Streets v8 fields reference */
export const mapboxStreetsV8Fields = new MapboxStreetsV8FieldsResource();

/** Mapbox token scopes reference */
export const mapboxTokenScopes = new MapboxTokenScopesResource();

/** Mapbox layer type mapping reference */
export const mapboxLayerTypeMapping = new MapboxLayerTypeMappingResource();

/** Mapbox documentation */
export const mapboxDocumentation = new MapboxDocumentationResource({
  httpRequest
});

/** Preview style UI resource */
export const previewStyleUI = new PreviewStyleUIResource();

/** Style comparison UI resource */
export const styleComparisonUI = new StyleComparisonUIResource();

/** GeoJSON preview UI resource */
export const geojsonPreviewUI = new GeojsonPreviewUIResource();

// Export registry functions for batch access
export {
  getAllResources,
  getResourceByUri,
  type ResourceInstance
} from './resourceRegistry.js';
