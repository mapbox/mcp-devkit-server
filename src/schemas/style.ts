// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';

// Basic types
const ColorSchema = z
  .string()
  .describe('Color as hex, rgb, rgba, hsl, or hsla');
const CoordinatesSchema = z.tuple([z.number(), z.number()]);

// Transition schema
const TransitionSchema = z
  .object({
    duration: z.number().optional(),
    delay: z.number().optional()
  })
  .passthrough();

// Light schema
const LightSchema = z
  .object({
    anchor: z.enum(['map', 'viewport']).optional(),
    position: z.tuple([z.number(), z.number(), z.number()]).optional(),
    color: ColorSchema.optional(),
    intensity: z.number().optional()
  })
  .passthrough();

// Lights (3D) schema
const LightsSchema = z.array(
  z
    .object({
      id: z.string(),
      type: z.enum(['ambient', 'directional'])
    })
    .passthrough()
);

// Terrain schema
const TerrainSchema = z
  .object({
    source: z.string(),
    exaggeration: z.number().optional()
  })
  .passthrough();

// Source schemas
const VectorSourceSchema = z
  .object({
    type: z.literal('vector'),
    url: z.string().optional(),
    tiles: z.array(z.string()).optional(),
    bounds: z
      .tuple([z.number(), z.number(), z.number(), z.number()])
      .optional(),
    scheme: z.enum(['xyz', 'tms']).optional(),
    minzoom: z.number().min(0).max(22).optional(),
    maxzoom: z.number().min(0).max(22).optional(),
    attribution: z.string().optional(),
    promoteId: z.union([z.string(), z.record(z.string())]).optional(),
    volatile: z.boolean().optional()
  })
  .passthrough();

const RasterSourceSchema = z
  .object({
    type: z.literal('raster'),
    url: z.string().optional(),
    tiles: z.array(z.string()).optional(),
    bounds: z
      .tuple([z.number(), z.number(), z.number(), z.number()])
      .optional(),
    minzoom: z.number().min(0).max(22).optional(),
    maxzoom: z.number().min(0).max(22).optional(),
    tileSize: z.number().optional(),
    scheme: z.enum(['xyz', 'tms']).optional(),
    attribution: z.string().optional(),
    volatile: z.boolean().optional()
  })
  .passthrough();

const RasterDemSourceSchema = z
  .object({
    type: z.literal('raster-dem'),
    url: z.string().optional(),
    tiles: z.array(z.string()).optional(),
    bounds: z
      .tuple([z.number(), z.number(), z.number(), z.number()])
      .optional(),
    minzoom: z.number().min(0).max(22).optional(),
    maxzoom: z.number().min(0).max(22).optional(),
    tileSize: z.number().optional(),
    attribution: z.string().optional(),
    encoding: z.enum(['terrarium', 'mapbox']).optional(),
    volatile: z.boolean().optional()
  })
  .passthrough();

const GeoJSONSourceSchema = z
  .object({
    type: z.literal('geojson'),
    data: z.union([z.string(), z.any()]), // URL or inline GeoJSON
    maxzoom: z.number().min(0).max(24).optional(),
    attribution: z.string().optional(),
    buffer: z.number().min(0).max(512).optional(),
    tolerance: z.number().optional(),
    cluster: z.boolean().optional(),
    clusterRadius: z.number().optional(),
    clusterMaxZoom: z.number().optional(),
    clusterProperties: z.record(z.any()).optional(),
    lineMetrics: z.boolean().optional(),
    generateId: z.boolean().optional(),
    promoteId: z.union([z.string(), z.record(z.string())]).optional()
  })
  .passthrough();

const ImageSourceSchema = z
  .object({
    type: z.literal('image'),
    url: z.string(),
    coordinates: z.tuple([
      CoordinatesSchema,
      CoordinatesSchema,
      CoordinatesSchema,
      CoordinatesSchema
    ])
  })
  .passthrough();

const VideoSourceSchema = z
  .object({
    type: z.literal('video'),
    urls: z.array(z.string()),
    coordinates: z.tuple([
      CoordinatesSchema,
      CoordinatesSchema,
      CoordinatesSchema,
      CoordinatesSchema
    ])
  })
  .passthrough();

const SourceSchema = z.union([
  VectorSourceSchema,
  RasterSourceSchema,
  RasterDemSourceSchema,
  GeoJSONSourceSchema,
  ImageSourceSchema,
  VideoSourceSchema
]);

// Layer schema (simplified - full schema would be very extensive)
const LayerSchema = z
  .object({
    id: z.string().describe('Unique layer name'),
    type: z.enum([
      'fill',
      'line',
      'symbol',
      'circle',
      'heatmap',
      'fill-extrusion',
      'raster',
      'hillshade',
      'background',
      'sky',
      'slot',
      'clip',
      'model',
      'raster-particle',
      'building'
    ]),
    source: z
      .string()
      .optional()
      .describe('Source name (not required for background/sky/slot)'),
    'source-layer': z
      .string()
      .optional()
      .describe('Layer from vector tile source'),
    minzoom: z.number().min(0).max(24).optional(),
    maxzoom: z.number().min(0).max(24).optional(),
    filter: z.any().optional().describe('Expression for filtering features'),
    layout: z.record(z.any()).optional(),
    paint: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
    slot: z.string().optional().describe('Slot this layer is assigned to')
  })
  .passthrough();

// Style import schema
const StyleImportSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    config: z.record(z.any()).optional()
  })
  .passthrough();

// Base Style properties (shared between input and output)
export const BaseStylePropertiesSchema = z
  .object({
    // Required Style Spec properties
    version: z
      .literal(8)
      .describe('Style specification version number. Must be 8'),
    sources: z.record(SourceSchema).describe('Data source specifications'),
    layers: z.array(LayerSchema).describe('Layers in draw order'),

    // Optional Style Spec properties
    metadata: z
      .record(z.any())
      .optional()
      .describe('Arbitrary properties for tracking'),
    center: CoordinatesSchema.optional().describe(
      'Default map center [longitude, latitude]'
    ),
    zoom: z.number().optional().describe('Default zoom level'),
    bearing: z.number().optional().describe('Default bearing in degrees'),
    pitch: z.number().optional().describe('Default pitch in degrees'),
    sprite: z
      .string()
      .optional()
      .describe('Base URL for sprite image and metadata'),
    glyphs: z.string().optional().describe('URL template for glyph sets'),
    light: LightSchema.optional()
      .nullable()
      .describe('Global light source (deprecated, use lights)'),
    lights: LightsSchema.optional()
      .nullable()
      .describe('Array of 3D light sources'),
    terrain: TerrainSchema.optional()
      .nullable()
      .describe('Global terrain elevation'),
    fog: z.record(z.any()).optional().nullable().describe('Fog properties'),
    projection: z
      .record(z.any())
      .optional()
      .nullable()
      .describe('Map projection'),
    transition: TransitionSchema.optional()
      .nullable()
      .describe('Default transition timing'),
    imports: z
      .array(StyleImportSchema)
      .optional()
      .nullable()
      .describe('Imported styles')
  })
  .passthrough();

export type MapboxSource = z.infer<typeof SourceSchema>;
export type MapboxLayer = z.infer<typeof LayerSchema>;
