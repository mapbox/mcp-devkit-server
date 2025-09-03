import { z } from 'zod';

/**
 * Common Zod schema definitions for reuse across different tools
 */

/**
 * Public Mapbox access token that starts with 'pk.'
 */
export const publicAccessTokenSchema = (description?: string) =>
  z
    .string()
    .startsWith(
      'pk.',
      'Invalid access token. Only public tokens (starting with pk.*) are allowed. Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs.'
    )
    .describe(
      description ||
        'Mapbox public access token (required, must start with pk.* and have styles:read permission). Secret tokens (sk.*) cannot be used as they cannot be exposed in browser URLs. Please use an existing public token or get one from list_tokens_tool or create one with create_token_tool with styles:read permission.'
    );

/**
 * Latitude coordinate with validation
 */
export const latitudeSchema = (
  description?: string,
  optional: boolean = false
) =>
  numberSchema(
    -90,
    90,
    description || 'Latitude coordinate (-90 to 90)',
    optional
  );

/**
 * Longitude coordinate with validation
 */
export const longitudeSchema = (
  description?: string,
  optional: boolean = false
) =>
  numberSchema(
    -180,
    180,
    description || 'Longitude coordinate (-180 to 180)',
    optional
  );

/**
 * Zoom level for map views
 */
export const zoomSchema = (description?: string) =>
  z
    .number()
    .optional()
    .describe(
      description ||
        'Initial zoom level for the map view (0-22). If provided along with latitude and longitude, sets the initial map position.'
    );

/**
 * Complete coordinate set (latitude + longitude + zoom) for map positioning
 */
export const mapPositionSchema = (
  latDescription?: string,
  lngDescription?: string,
  zoomDescription?: string
) => ({
  latitude: latitudeSchema(
    latDescription ||
      'Latitude coordinate for the initial map center (-90 to 90). Must be provided together with longitude and zoom.',
    true
  ),
  longitude: longitudeSchema(
    lngDescription ||
      'Longitude coordinate for the initial map center (-180 to 180). Must be provided together with latitude and zoom.',
    true
  ),
  zoom: zoomSchema(zoomDescription)
});

/**
 * Generic string schema
 */
export const stringSchema = (
  description: string,
  optional: boolean = false
) => {
  const schema = z.string().describe(description);
  return optional ? schema.optional() : schema;
};

/**
 * Generic number schema with range validation
 */
export const numberSchema = (
  min?: number,
  max?: number,
  description?: string,
  optional: boolean = false
) => {
  let schema = z.number();

  if (min !== undefined) {
    schema = schema.min(min);
  }
  if (max !== undefined) {
    schema = schema.max(max);
  }

  schema = schema.describe(
    description ||
      `Number${min !== undefined ? ` (min: ${min}` : ''}${max !== undefined ? `${min !== undefined ? ', ' : ' ('}max: ${max}` : ''}${min !== undefined || max !== undefined ? ')' : ''}`
  );

  return optional ? schema.optional() : schema;
};

/**
 * Generic boolean schema
 */
export const booleanSchema = (
  description: string,
  optional: boolean = false,
  defaultValue?: boolean
) => {
  const baseSchema = z.boolean().describe(description);

  if (defaultValue !== undefined) {
    return baseSchema.default(defaultValue);
  }

  if (optional) {
    return baseSchema.optional();
  }

  return baseSchema;
};

/**
 * Generic enum schema
 */
export const enumSchema = <T extends readonly [string, ...string[]]>(
  values: T,
  description: string,
  optional: boolean = false
) => {
  const schema = z.enum(values).describe(description);
  return optional ? schema.optional() : schema;
};

/**
 * Generic array schema
 */
export const arraySchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
  description: string,
  optional: boolean = false
) => {
  const schema = z.array(itemSchema).describe(description);
  return optional ? schema.optional() : schema;
};

/**
 * Generic record/object schema
 */
export const recordSchema = (
  description?: string,
  optional: boolean = false
) => {
  const schema = z
    .record(z.any())
    .describe(description || 'Object with arbitrary key-value pairs');

  return optional ? schema.optional() : schema;
};

/**
 * Mapbox style specification object
 */
export const mapboxStyleSchema = (
  description?: string,
  optional: boolean = false
) => recordSchema(description || 'Mapbox style specification object', optional);

/**
 * Pagination limit field
 */
export const limitSchema = (
  min: number = 1,
  max: number = 100,
  description?: string,
  optional: boolean = true
) =>
  numberSchema(
    min,
    max,
    description || `Maximum number of items to return (${min}-${max})`,
    optional
  );
