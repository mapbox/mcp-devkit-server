// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { BaseResource } from '../BaseResource.js';
import { STREETS_V8_FIELDS } from '../../constants/mapboxStreetsV8Fields.trimmed.js';

/**
 * Resource providing Mapbox Streets v8 source layer field definitions
 * Exposes complete field metadata for all Streets v8 layers with enumerated values
 */
export class MapboxStreetsV8FieldsResource extends BaseResource {
  readonly name = 'Mapbox Streets v8 Fields Reference';
  readonly uri = 'resource://mapbox-streets-v8-fields';
  readonly description =
    'Complete field definitions for all Mapbox Streets v8 source layers including available values for each field. Use this to understand what fields and values are available when filtering or styling map features.';
  readonly mimeType = 'application/json';

  public async readCallback(uri: URL, _extra: unknown) {
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: this.mimeType,
          text: JSON.stringify(STREETS_V8_FIELDS, null, 2)
        }
      ]
    };
  }
}
