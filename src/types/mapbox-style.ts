/**
 * Comprehensive Mapbox Style Specification types with full expression support
 */

// Expression Types
export type Expression =
  // Literals
  | string
  | number
  | boolean
  | null
  | Expression[]
  // Property accessors
  | ['get', string]
  | ['get', string, unknown]
  | ['has', string]
  | ['has', string, unknown]
  | ['at', number, Expression]
  | ['in', Expression, Expression]
  | ['index-of', Expression, Expression]
  | ['length', Expression]
  | ['geometry-type']
  | ['id']
  | ['properties']
  | ['feature-state', string]
  // Type functions
  | ['typeof', Expression]
  | ['to-string', Expression]
  | ['to-number', Expression]
  | ['to-boolean', Expression]
  | ['to-color', Expression]
  | ['to-rgba', Expression]
  // Logical
  | ['!', Expression]
  | ['!=', Expression, Expression]
  | ['<', Expression, Expression]
  | ['<=', Expression, Expression]
  | ['==', Expression, Expression]
  | ['>', Expression, Expression]
  | ['>=', Expression, Expression]
  | ['all', ...Expression[]]
  | ['any', ...Expression[]]
  | ['case', ...Expression[]]
  | ['coalesce', ...Expression[]]
  | ['match', Expression, ...any[]]
  | ['within', unknown]
  // Math
  | ['+', ...Expression[]]
  | ['-', Expression, Expression?]
  | ['*', ...Expression[]]
  | ['/', Expression, Expression]
  | ['%', Expression, Expression]
  | ['^', Expression, Expression]
  | ['abs', Expression]
  | ['acos', Expression]
  | ['asin', Expression]
  | ['atan', Expression]
  | ['ceil', Expression]
  | ['cos', Expression]
  | ['distance', unknown]
  | ['e']
  | ['floor', Expression]
  | ['ln', Expression]
  | ['ln2']
  | ['log10', Expression]
  | ['log2', Expression]
  | ['max', ...Expression[]]
  | ['min', ...Expression[]]
  | ['pi']
  | ['round', Expression]
  | ['sin', Expression]
  | ['sqrt', Expression]
  | ['tan', Expression]
  // String
  | ['concat', ...Expression[]]
  | ['downcase', Expression]
  | ['upcase', Expression]
  | ['slice', Expression, Expression, Expression?]
  // Color
  | ['rgb', Expression, Expression, Expression]
  | ['rgba', Expression, Expression, Expression, Expression]
  | ['hsl', Expression, Expression, Expression]
  | ['hsla', Expression, Expression, Expression, Expression]
  // Interpolation
  | ['interpolate', Interpolation, Expression, ...any[]]
  | ['interpolate-hcl', Interpolation, Expression, ...any[]]
  | ['interpolate-lab', Interpolation, Expression, ...any[]]
  | ['step', Expression, Expression, ...any[]]
  // Variable binding
  | ['let', ...any[]]
  | ['var', string]
  // Zoom
  | ['zoom']
  | ['heatmap-density']
  | ['line-progress']
  | ['sky-radial-progress']
  | ['accumulated']
  // Special
  | ['literal', any]
  | ['image', Expression]
  | ['format', ...any[]]
  | ['number-format', Expression, unknown]
  | ['collator', unknown]
  | ['resolved-locale', unknown]
  | ['is-supported-script', Expression]
  | ['pitch']
  | ['distance-from-center']
  | ['raster-value']
  | ['raster-particle-speed'];

export type Interpolation =
  | ['linear']
  | ['exponential', number]
  | ['cubic-bezier', number, number, number, number];

// Filter Types - Legacy and Expression-based
export type Filter =
  | ['has', string]
  | ['!has', string]
  | ['==', string | ['get', string] | ['geometry-type'], any]
  | ['!=', string | ['get', string] | ['geometry-type'], any]
  | ['>', string | ['get', string], number]
  | ['>=', string | ['get', string], number]
  | ['<', string | ['get', string], number]
  | ['<=', string | ['get', string], number]
  | ['in', string | ['get', string], ...any[]]
  | ['!in', string | ['get', string], ...any[]]
  | ['all', ...Filter[]]
  | ['any', ...Filter[]]
  | ['none', ...Filter[]]
  | Expression; // Modern expression-based filters

// Layer Types
export interface BaseLayer {
  id: string;
  type: string;
  metadata?: Record<string, unknown>;
  source?: string;
  'source-layer'?: string;
  minzoom?: number;
  maxzoom?: number;
  filter?: Filter;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
}

export interface BackgroundLayer extends BaseLayer {
  type: 'background';
  paint?: {
    'background-color'?: Expression | string;
    'background-opacity'?: Expression | number;
    'background-pattern'?: Expression | string;
  };
}

export interface FillLayer extends BaseLayer {
  type: 'fill';
  paint?: {
    'fill-antialias'?: Expression | boolean;
    'fill-color'?: Expression | string;
    'fill-opacity'?: Expression | number;
    'fill-outline-color'?: Expression | string;
    'fill-pattern'?: Expression | string;
    'fill-sort-key'?: Expression | number;
    'fill-translate'?: Expression | [number, number];
    'fill-translate-anchor'?: 'map' | 'viewport';
  };
}

export interface LineLayer extends BaseLayer {
  type: 'line';
  layout?: {
    'line-cap'?: Expression | 'butt' | 'round' | 'square';
    'line-join'?: Expression | 'bevel' | 'round' | 'miter';
    'line-miter-limit'?: Expression | number;
    'line-round-limit'?: Expression | number;
    'line-sort-key'?: Expression | number;
  };
  paint?: {
    'line-blur'?: Expression | number;
    'line-color'?: Expression | string;
    'line-dasharray'?: Expression | number[];
    'line-gap-width'?: Expression | number;
    'line-gradient'?: Expression | string;
    'line-offset'?: Expression | number;
    'line-opacity'?: Expression | number;
    'line-pattern'?: Expression | string;
    'line-translate'?: Expression | [number, number];
    'line-translate-anchor'?: 'map' | 'viewport';
    'line-width'?: Expression | number;
  };
}

export interface SymbolLayer extends BaseLayer {
  type: 'symbol';
  layout?: {
    'symbol-placement'?: 'point' | 'line' | 'line-center';
    'symbol-spacing'?: Expression | number;
    'symbol-avoid-edges'?: boolean;
    'symbol-sort-key'?: Expression | number;
    'symbol-z-order'?: 'auto' | 'viewport-y' | 'source';
    'icon-allow-overlap'?: Expression | boolean;
    'icon-anchor'?: Expression | string;
    'icon-ignore-placement'?: Expression | boolean;
    'icon-image'?: Expression | string;
    'icon-keep-upright'?: boolean;
    'icon-offset'?: Expression | [number, number];
    'icon-optional'?: boolean;
    'icon-padding'?: Expression | number;
    'icon-pitch-alignment'?: 'map' | 'viewport' | 'auto';
    'icon-rotate'?: Expression | number;
    'icon-rotation-alignment'?: 'map' | 'viewport' | 'auto';
    'icon-size'?: Expression | number;
    'icon-text-fit'?: 'none' | 'width' | 'height' | 'both';
    'icon-text-fit-padding'?: Expression | [number, number, number, number];
    'text-allow-overlap'?: Expression | boolean;
    'text-anchor'?: Expression | string;
    'text-field'?: Expression | string;
    'text-font'?: Expression | string[];
    'text-ignore-placement'?: Expression | boolean;
    'text-justify'?: Expression | 'auto' | 'left' | 'center' | 'right';
    'text-keep-upright'?: boolean;
    'text-letter-spacing'?: Expression | number;
    'text-line-height'?: Expression | number;
    'text-max-angle'?: Expression | number;
    'text-max-width'?: Expression | number;
    'text-offset'?: Expression | [number, number];
    'text-optional'?: boolean;
    'text-padding'?: Expression | number;
    'text-pitch-alignment'?: 'map' | 'viewport' | 'auto';
    'text-radial-offset'?: Expression | number;
    'text-rotate'?: Expression | number;
    'text-rotation-alignment'?: 'map' | 'viewport' | 'auto';
    'text-size'?: Expression | number;
    'text-transform'?: Expression | 'none' | 'uppercase' | 'lowercase';
    'text-variable-anchor'?: string[];
    'text-writing-mode'?: string[];
  };
  paint?: {
    'icon-color'?: Expression | string;
    'icon-halo-blur'?: Expression | number;
    'icon-halo-color'?: Expression | string;
    'icon-halo-width'?: Expression | number;
    'icon-opacity'?: Expression | number;
    'icon-translate'?: Expression | [number, number];
    'icon-translate-anchor'?: 'map' | 'viewport';
    'text-color'?: Expression | string;
    'text-halo-blur'?: Expression | number;
    'text-halo-color'?: Expression | string;
    'text-halo-width'?: Expression | number;
    'text-opacity'?: Expression | number;
    'text-translate'?: Expression | [number, number];
    'text-translate-anchor'?: 'map' | 'viewport';
  };
}

export interface CircleLayer extends BaseLayer {
  type: 'circle';
  paint?: {
    'circle-blur'?: Expression | number;
    'circle-color'?: Expression | string;
    'circle-opacity'?: Expression | number;
    'circle-pitch-alignment'?: 'map' | 'viewport';
    'circle-pitch-scale'?: 'map' | 'viewport';
    'circle-radius'?: Expression | number;
    'circle-stroke-color'?: Expression | string;
    'circle-stroke-opacity'?: Expression | number;
    'circle-stroke-width'?: Expression | number;
    'circle-translate'?: Expression | [number, number];
    'circle-translate-anchor'?: 'map' | 'viewport';
  };
}

export interface RasterLayer extends BaseLayer {
  type: 'raster';
  paint?: {
    'raster-brightness-max'?: Expression | number;
    'raster-brightness-min'?: Expression | number;
    'raster-contrast'?: Expression | number;
    'raster-fade-duration'?: number;
    'raster-hue-rotate'?: Expression | number;
    'raster-opacity'?: Expression | number;
    'raster-resampling'?: 'linear' | 'nearest';
    'raster-saturation'?: Expression | number;
  };
}

export interface HillshadeLayer extends BaseLayer {
  type: 'hillshade';
  paint?: {
    'hillshade-accent-color'?: Expression | string;
    'hillshade-exaggeration'?: Expression | number;
    'hillshade-highlight-color'?: Expression | string;
    'hillshade-illumination-anchor'?: 'map' | 'viewport';
    'hillshade-illumination-direction'?: Expression | number;
    'hillshade-shadow-color'?: Expression | string;
  };
}

export interface HeatmapLayer extends BaseLayer {
  type: 'heatmap';
  paint?: {
    'heatmap-color'?: Expression;
    'heatmap-intensity'?: Expression | number;
    'heatmap-opacity'?: Expression | number;
    'heatmap-radius'?: Expression | number;
    'heatmap-weight'?: Expression | number;
  };
}

export interface FillExtrusionLayer extends BaseLayer {
  type: 'fill-extrusion';
  paint?: {
    'fill-extrusion-base'?: Expression | number;
    'fill-extrusion-color'?: Expression | string;
    'fill-extrusion-height'?: Expression | number;
    'fill-extrusion-opacity'?: Expression | number;
    'fill-extrusion-pattern'?: Expression | string;
    'fill-extrusion-translate'?: Expression | [number, number];
    'fill-extrusion-translate-anchor'?: 'map' | 'viewport';
    'fill-extrusion-vertical-gradient'?: boolean;
  };
}

export interface SkyLayer extends BaseLayer {
  type: 'sky';
  paint?: {
    'sky-atmosphere-color'?: Expression | string;
    'sky-atmosphere-halo-color'?: Expression | string;
    'sky-atmosphere-sun'?: Expression | [number, number];
    'sky-atmosphere-sun-intensity'?: Expression | number;
    'sky-gradient'?: Expression | string;
    'sky-gradient-center'?: Expression | [number, number];
    'sky-gradient-radius'?: Expression | number;
    'sky-opacity'?: Expression | number;
    'sky-type'?: 'gradient' | 'atmosphere';
  };
}

export type Layer =
  | BackgroundLayer
  | FillLayer
  | LineLayer
  | SymbolLayer
  | CircleLayer
  | RasterLayer
  | HillshadeLayer
  | HeatmapLayer
  | FillExtrusionLayer
  | SkyLayer;

// Source Types
export interface VectorSource {
  type: 'vector';
  url?: string;
  tiles?: string[];
  bounds?: [number, number, number, number];
  scheme?: 'xyz' | 'tms';
  minzoom?: number;
  maxzoom?: number;
  attribution?: string;
  promoteId?: string | Record<string, string>;
  volatile?: boolean;
}

export interface RasterSource {
  type: 'raster';
  url?: string;
  tiles?: string[];
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
  tileSize?: number;
  scheme?: 'xyz' | 'tms';
  attribution?: string;
  volatile?: boolean;
}

export interface RasterDemSource {
  type: 'raster-dem';
  url?: string;
  tiles?: string[];
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
  tileSize?: number;
  attribution?: string;
  encoding?: 'terrarium' | 'mapbox';
  volatile?: boolean;
}

export interface GeoJSONSource {
  type: 'geojson';
  data?: unknown;
  maxzoom?: number;
  attribution?: string;
  buffer?: number;
  filter?: unknown;
  tolerance?: number;
  cluster?: boolean;
  clusterRadius?: number;
  clusterMaxZoom?: number;
  clusterMinPoints?: number;
  clusterProperties?: Record<string, unknown>;
  lineMetrics?: boolean;
  generateId?: boolean;
  promoteId?: string | Record<string, string>;
}

export interface ImageSource {
  type: 'image';
  url?: string;
  coordinates?: [
    [number, number],
    [number, number],
    [number, number],
    [number, number]
  ];
}

export interface VideoSource {
  type: 'video';
  urls?: string[];
  coordinates?: [
    [number, number],
    [number, number],
    [number, number],
    [number, number]
  ];
}

export type Source =
  | VectorSource
  | RasterSource
  | RasterDemSource
  | GeoJSONSource
  | ImageSource
  | VideoSource;

// Main Style Type
export interface MapboxStyle {
  version: 8;
  name?: string;
  metadata?: Record<string, unknown>;
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
  light?: {
    anchor?: 'map' | 'viewport';
    position?: [number, number, number];
    color?: string;
    intensity?: number;
  };
  terrain?: {
    source: string;
    exaggeration?: Expression | number;
  };
  fog?: {
    range?: Expression | [number, number];
    color?: Expression | string;
    'horizon-blend'?: Expression | number;
    'high-color'?: Expression | string;
    'space-color'?: Expression | string;
    'star-intensity'?: Expression | number;
  };
  sources: Record<string, Source>;
  sprite?: string;
  glyphs?: string;
  transition?: {
    duration?: number;
    delay?: number;
  };
  projection?: {
    name:
      | 'albers'
      | 'equalEarth'
      | 'equirectangular'
      | 'lambertConformalConic'
      | 'mercator'
      | 'naturalEarth'
      | 'winkelTripel'
      | 'globe';
    center?: [number, number];
    parallels?: [number, number];
  };
  layers: Layer[];
}

// Style Diff Type for comparison
export interface StyleDiff {
  added: Layer[];
  removed: Layer[];
  modified: Array<{
    id: string;
    changes: Record<string, { old: unknown; new: unknown }>;
  }>;
}
