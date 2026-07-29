// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  StyleBuilderToolSchema,
  type StyleBuilderToolInput
} from './StyleBuilderTool.input.schema.js';
// Using STREETS_V8_FIELDS as single source of truth instead of MAPBOX_STYLE_LAYERS
import { STREETS_V8_FIELDS } from '../../constants/mapboxStreetsV8Fields.js';
import type { Layer, Filter, MapboxStyle } from '../../types/mapbox-style.js';

// Type for dynamically created layer definitions
type DynamicLayerDefinition = {
  id: string;
  type: 'fill' | 'line' | 'symbol' | 'circle' | 'fill-extrusion' | 'heatmap';
  sourceLayer: string;
  description: string;
  paintProperties: Array<{
    property: string;
    description: string;
    example: unknown;
  }>;
  layoutProperties?: Array<{
    property: string;
    description: string;
    example: unknown;
  }>;
  commonFilters: string[];
};

type Slot = 'bottom' | 'middle' | 'top';

/** Where a layer's data comes from, which changes where it belongs in the stack. */
type LayerOrigin = 'basemap' | 'user';

/**
 * What differs between a Standard style and a Classic one.
 *
 * Standard is an import plus custom layers in slots on a lit 3D scene, with a config surface
 * for the basemap. Classic is a hand-authored layer stack over a background layer, with
 * neither. Most appearance options therefore apply to exactly one of them.
 *
 * Collected here in place of nine scattered `isUsingStandard` checks — including a positional
 * boolean threaded into layer creation, which is how wrong-target options like
 * `global_settings.mode` looked supported on Standard while doing almost nothing.
 */
interface StyleTarget {
  readonly kind: 'standard' | 'classic';
  readonly label: string;
  /** Standard owns basemap order, so custom layers are placed by slot instead. */
  readonly usesSlots: boolean;
  /** Only a lit scene needs emissive strength to keep custom layers visible. */
  readonly usesLighting: boolean;
  /** Classic has no import to supply land colour, so it needs its own background. */
  readonly needsBackgroundLayer: boolean;
  /** Options belonging to the other target, rejected with a pointer to the right one. */
  readonly foreignOptions: ReadonlyArray<{
    field: string;
    key?: string;
    path: string;
    instead: string;
  }>;
}

const STANDARD_TARGET: StyleTarget = {
  kind: 'standard',
  label: 'Standard',
  usesSlots: true,
  usesLighting: true,
  needsBackgroundLayer: false,
  foreignOptions: [
    {
      field: 'global_settings',
      key: 'mode',
      path: 'global_settings.mode',
      instead:
        'only recolors custom layers, so it cannot darken a Standard basemap. Use `standard_config.lightPreset: "night"`, which relights the whole scene.'
    },
    {
      field: 'global_settings',
      key: 'background_color',
      path: 'global_settings.background_color',
      instead:
        'has no effect: Standard supplies its own background through the import. `standard_config.colorLand` is the land colour on Standard; `colorWater`, `colorGreenspace` and `colorBuildings` retint the features drawn over it.'
    },
    {
      field: 'global_settings',
      key: 'label_color',
      path: 'global_settings.label_color',
      instead:
        'has no effect on Standard. Use `standard_config.colorPlaceLabels`, `colorRoadLabels` or `colorPointOfInterestLabels`.'
    }
  ]
};

const CLASSIC_TARGET: StyleTarget = {
  kind: 'classic',
  label: 'Classic',
  usesSlots: false,
  usesLighting: false,
  needsBackgroundLayer: true,
  foreignOptions: [
    {
      field: 'standard_config',
      path: 'standard_config',
      instead:
        'only applies to the Standard style, which is the one with a config surface. Either set `base_style: "standard"` or style the layers directly.'
    }
  ]
};

const resolveTarget = (baseStyle: string): StyleTarget =>
  baseStyle === 'standard' ? STANDARD_TARGET : CLASSIC_TARGET;

/**
 * What a named Classic base can be taken to mean, given the builder authors the layer stack
 * rather than importing the named style.
 *
 * A Classic base is deliberately NOT an import: the style stays self-contained, and the layers
 * the caller asks for are the layers there are. That means the builder cannot reproduce the
 * named style — no per-base palette is available to it, and inventing one would attribute made-up
 * cartography to a Mapbox style. So only what the base name states outright is honoured, which
 * is light-vs-dark and whether the base is imagery.
 *
 * That is still the fix for the original defect: every Classic value produced the same light
 * `#f8f4f0` vector map, so `dark-v11` was a light map and `satellite-v9` had no imagery. Bases
 * within a group are now equivalent, which is honest — the builder has nothing that separates
 * `dark-v11` from `navigation-night-v1`.
 */
const DARK_CLASSIC_BASES = new Set([
  'dark-v11',
  'navigation-night-v1',
  'satellite-v9',
  'satellite-streets-v12'
]);

/** Bases where the map is imagery, so raster tiles stand in for the background layer. */
const IMAGERY_CLASSIC_BASES = new Set([
  'satellite-v9',
  'satellite-streets-v12'
]);

/** The Classic appearance actually in force, once base and caller are reconciled. */
interface ClassicSettings {
  readonly mode: 'light' | 'dark';
  readonly backgroundColor: string;
  readonly labelColor?: string;
  readonly imagery: boolean;
}

/**
 * The two land colours are the ones the tool has always used for light and dark; the base name
 * only decides which. An explicit `global_settings` value beats both.
 */
function resolveClassicSettings(
  baseStyle: string,
  globalSettings: StyleBuilderToolInput['global_settings']
): ClassicSettings {
  const mode =
    globalSettings?.mode ??
    (DARK_CLASSIC_BASES.has(baseStyle) ? 'dark' : 'light');

  return {
    mode,
    backgroundColor:
      globalSettings?.background_color ??
      (mode === 'dark' ? '#1a1a1a' : '#f8f4f0'),
    labelColor: globalSettings?.label_color,
    imagery: IMAGERY_CLASSIC_BASES.has(baseStyle)
  };
}

/** The Classic styles guide, which lists every Classic style and the URL that references it. */
const CLASSIC_STYLES_DOC =
  'https://docs.mapbox.com/map-styles/guides/classic-styles/';

/**
 * What a general-purpose Classic map is expected to draw.
 *
 * Used to name the shortfall in a thin Classic stack, and to say what a complete one looks like.
 * Not a hard stop past the empty case — a couple of layers over satellite imagery is a legitimate
 * thing to build — but a stack missing these is more often an incomplete list than a deliberate one.
 */
const CLASSIC_STAPLE_LAYERS = [
  'water',
  'landuse',
  'road',
  'building',
  'place_label'
];

/**
 * Why an empty Classic build is a redirect rather than a style.
 *
 * A Classic base authors nothing, so `layers: []` produced a lone background layer and reported
 * success — the "looks finished and did nothing" outcome every other hard stop here exists to
 * prevent. It is also the shape a caller lands in having read `base_style: "dark-v11"` as "give me
 * dark-v11", which is the likeliest thing they meant and the one thing this tool cannot do: it
 * builds a new self-contained style, so using the real one is a reference rather than a build.
 */
function emptyClassicGuidance(baseStyle: string, imagery: boolean): string {
  const options = [
    `**You want the real \`${baseStyle}\`** — its palette, road hierarchy and label treatment. ` +
      `Reference \`mapbox://styles/mapbox/${baseStyle}\` in your map directly; there is no style ` +
      `to create. This tool builds new styles, it is not a way to fetch an existing one. Every ` +
      `Classic style and the URL for it: ${CLASSIC_STYLES_DOC}`,
    `**You want a map you can configure** — use \`base_style: "standard"\`. ` +
      (DARK_CLASSIC_BASES.has(baseStyle)
        ? `For a dark one add \`standard_config: { lightPreset: "night" }\`, which relights the ` +
          `whole scene instead of recolouring a hand-authored stack.`
        : `\`standard_config\` (\`theme\`, \`lightPreset\`, \`show*\`, \`color*\`) restyles the ` +
          `basemap without authoring a single layer.`)
  ];

  if (imagery) {
    options.push(
      `**You want imagery under an otherwise-Standard map** — reference ` +
        `\`mapbox://styles/mapbox/standard-satellite\` in your map. This tool imports plain ` +
        `Standard, and \`custom_sources\` takes GeoJSON and vector tilesets, not raster.`
    );
  }

  options.push(
    `**You do want a self-contained Classic stack** — then list every feature it should draw in ` +
      `\`layers\`: ${CLASSIC_STAPLE_LAYERS.map((name) => `\`${name}\``).join(', ')} at a ` +
      `minimum, plus whatever else the map needs.`
  );

  return (
    `**A Classic base draws nothing on its own, and no layers were listed.**\n\n` +
    `\`base_style: "${baseStyle}"\` is not a style import — the builder authors the whole stack, ` +
    `so an empty \`layers\` array means an empty map: ` +
    (imagery
      ? `satellite imagery with nothing over it.`
      : `a background colour and nothing else.`) +
    `\n\nOne of these is what you meant:\n` +
    options.map((option) => `• ${option}`).join('\n') +
    `\n\nNothing was generated.`
  );
}

/**
 * The Standard config toggle that hides a basemap feature, where one exists.
 *
 * `action: "hide"` works on Classic by omitting the layer, because the builder authors the
 * whole stack there. On Standard the feature belongs to the import and keeps drawing, so
 * omitting the layer hid nothing while the summary still reported it hidden. Standard's own
 * toggle is the only thing that does hide it.
 */
const STANDARD_HIDE_TOGGLE: Record<string, string> = {
  poi_label: 'showPointOfInterestLabels',
  place_label: 'showPlaceLabels',
  transit_stop_label: 'showTransitLabels',
  // show3dBuildings, not show3dObjects: the latter is the whole 3D group — buildings, trees,
  // landmarks and facades — so hiding "building" through it also strips the trees and
  // landmarks the caller never mentioned. show3dObjects stays available on standard_config
  // for callers who do want all 3D off.
  building: 'show3dBuildings',
  admin: 'showAdminBoundaries'
};

/**
 * `standard_config` properties that belong to a Standard style this tool does not build.
 *
 * The import URL here is always `mapbox://styles/mapbox/standard`, and `base_style` offers no
 * Standard Satellite value, so a Satellite-only property lands in the import config and is
 * ignored — the exact "setting silently did nothing" failure the target split exists to stop.
 * Rejected rather than dropped, and rejected here rather than by removing it from the schema,
 * because the schema strips unknown keys: a caller who sent it anyway would get silence.
 */
const STANDARD_SATELLITE_ONLY_CONFIG: Record<string, string> = {
  showRoadsAndTransit:
    'Standard Satellite only. On the Standard style this tool builds, the road network cannot ' +
    'be toggled off at all — `showRoadLabels: false` drops the labels and shields, ' +
    '`showPedestrianRoads: false` the paths, and `theme: "faded"` with `colorRoads` makes the ' +
    'network recede without removing it.'
};

/**
 * Why a basemap feature cannot be hidden on Standard, and what to reach for instead.
 *
 * Returned as a hard stop rather than a warning: a style that silently failed to hide what
 * was asked looks finished and is not.
 */
function standardHideGuidance(layerType: string): string {
  const alternatives: Record<string, string> = {
    road:
      'Standard has no toggle for the road network itself. `showRoadLabels: false` hides the ' +
      'labels and shields, `showPedestrianRoads: false` hides paths and pedestrian streets, and ' +
      '`theme: "faded"` with `colorRoads` makes the network recede without removing it.',
    water:
      'Water is part of the basemap on Standard. Use `standard_config.colorWater` to recolour ' +
      'it, or `theme: "faded"`/`"monochrome"` to make it recede.',
    landuse:
      'Landuse is part of the basemap on Standard. Use `standard_config.colorGreenspace` to ' +
      'recolour it, or `theme: "faded"`/`"monochrome"` to make it recede.'
  };

  return (
    `**"${layerType}" cannot be hidden on a Standard style.**\n\n` +
    (alternatives[layerType] ??
      `Standard exposes no \`show*\` toggle for "${layerType}", and a style importing Standard ` +
        `cannot remove layers from the import. Configure the basemap instead — \`theme: "faded"\` ` +
        `or \`"monochrome"\` recedes it as a whole, and the \`color*\` overrides retint individual ` +
        `features.`) +
    `\n\nHideable through \`standard_config\`: ${Object.entries(
      STANDARD_HIDE_TOGGLE
    )
      .map(([layer, toggle]) => `${layer} (\`${toggle}\`)`)
      .join(', ')}.` +
    `\n\nOn a Classic style \`action: "hide"\` works as you expected, because the builder authors ` +
    `every layer there. Nothing was generated.`
  );
}

/**
 * The Standard config property that recolours a basemap feature the caller is about to
 * redraw.
 *
 * Adding a Streets v8 layer over Standard does not restyle the basemap's own layer — it draws
 * a second copy on top, which has to be kept in sync by hand and picks up defaults (a fill
 * outline, an opacity) the basemap never had. Worth a nudge, not a rejection: an overdraw is
 * the right answer when the recolour is filtered to a subset the config cannot express.
 */
const STANDARD_COLOR_CONFIG: Record<string, string> = {
  water: 'colorWater',
  waterway: 'colorWater',
  landuse: 'colorGreenspace',
  landuse_overlay: 'colorGreenspace',
  road: 'colorRoads',
  admin: 'colorAdminBoundaries',
  place_label: 'colorPlaceLabels',
  poi_label: 'colorPointOfInterestLabels'
};

/**
 * Where a layer belongs in the Standard stack when the caller didn't say.
 *
 * Origin matters as much as geometry: a basemap fill (parks, water) belongs under the road
 * network, but a fill of the user's own data (zones, a choropleth) is an overlay and belongs
 * above roads, behind labels. Subtle to get wrong — it renders either way, it just reads wrong.
 */
function inferSlot(layerType: string, origin: LayerOrigin): Slot | undefined {
  if (origin === 'user') {
    // Overlay placement: markers above POI labels, everything else above roads but
    // behind labels and 3D buildings. A choropleth is the exception that can't be inferred —
    // it wants 'bottom' so the road network reads over it — so the inferred slot is reported
    // and the caller told to set 'bottom' when the fill encodes a data value.
    //
    // fill-extrusion is exempt for exactly the reason a basemap one is: it is real 3D geometry
    // that the scene depth-sorts against the buildings around it, and any slot flattens it into
    // the 2D stack. Whose data it is doesn't change that.
    if (layerType === 'fill-extrusion') return undefined;
    return layerType === 'symbol' ? 'top' : 'middle';
  }
  switch (layerType) {
    case 'fill':
    case 'raster':
    case 'hillshade':
      return 'bottom';
    case 'line':
    case 'circle':
    case 'heatmap':
      return 'middle';
    case 'symbol':
      return 'top';
    default:
      // fill-extrusion is real 3D geometry participating in the scene's depth, so it gets
      // no slot rather than being forced under the roads.
      return undefined;
  }
}

/**
 * Emissive strength keeps a custom layer at its authored colour on a lit scene.
 *
 * fill/line/circle default to 0, so the scene lights them into shadow under the dusk and
 * night presets. Omitted deliberately: symbol (icon/text emissive strength already default
 * to 1), fill-extrusion (should be lit by the scene), heatmap (no such property).
 */
const EMISSIVE_PROPERTY: Record<string, string> = {
  fill: 'fill-emissive-strength',
  line: 'line-emissive-strength',
  circle: 'circle-emissive-strength'
};

/**
 * Readable names for `standard_config` properties in the build summary.
 *
 * Only where the property name doesn't already read well — anything absent falls back to the key
 * itself, so a property added to the schema shows up in the summary without needing a line here.
 */
const STANDARD_CONFIG_LABEL: Record<string, string> = {
  showPlaceLabels: 'Place labels',
  showRoadLabels: 'Road labels',
  showPointOfInterestLabels: 'POI labels',
  showTransitLabels: 'Transit labels',
  showPedestrianRoads: 'Pedestrian roads',
  show3dObjects: '3D objects',
  show3dBuildings: '3D buildings',
  show3dTrees: '3D trees',
  show3dLandmarks: '3D landmarks',
  show3dFacades: '3D facades',
  showLandmarkIcons: 'Landmark icons',
  showLandmarkIconLabels: 'Landmark icon labels',
  showAdminBoundaries: 'Admin boundaries',
  showIndoor: 'Indoor maps',
  showIndoorLabels: 'Indoor labels',
  colorMotorways: 'motorways',
  colorTrunks: 'trunks',
  colorRoads: 'roads',
  colorWater: 'water',
  colorLand: 'land',
  colorGreenspace: 'greenspace',
  colorBuildings: 'buildings',
  colorCommercial: 'commercial',
  colorEducation: 'education',
  colorMedical: 'medical',
  colorIndustrial: 'industrial',
  colorAdminBoundaries: 'admin boundaries',
  colorPlaceLabels: 'place labels',
  colorRoadLabels: 'road labels',
  colorPointOfInterestLabels: 'POI labels',
  colorBuildingHighlight: 'building highlight',
  colorBuildingSelect: 'building select',
  colorPlaceLabelHighlight: 'place label highlight',
  colorPlaceLabelSelect: 'place label select',
  colorIndoorLabelHighlight: 'indoor label highlight',
  colorIndoorLabelSelect: 'indoor label select',
  densityPointOfInterestLabels: 'POI density',
  colorModePointOfInterestLabels: 'POI label color mode',
  backgroundPointOfInterestLabels: 'POI label background',
  fuelingStationModePointOfInterestLabels: 'Fueling station POI mode',
  'theme-data': 'Custom theme LUT',
  font: 'Font'
};

/**
 * `standard_config` properties that start with "color" but are not colours.
 *
 * `colorModePointOfInterestLabels` names a mode, not a value, so grouping it with the colour
 * overrides by prefix alone would report a mode as a colour.
 */
const NON_COLOR_CONFIG = new Set(['colorModePointOfInterestLabels']);

/**
 * The default arm of a data-driven colour on one of the caller's own layers.
 *
 * A `match` without a fallback drops every feature whose value wasn't listed, so one is always
 * emitted. Neutral grey rather than anything from the palette, so an unhandled category reads as
 * "not classified" instead of blending in with a real class.
 */
const UNCLASSIFIED_COLOR = '#999999';

/**
 * A colour value the style spec can actually parse.
 *
 * Bare hex ("7b61ff") arrives often enough to be worth handling, and left raw it fails validation
 * at upload rather than at the point the mistake was made. Only something that is unambiguously
 * bare hex is prefixed: a named colour ("red") or a functional one is already valid, and prefixing
 * it would produce "#red".
 */
function normalizeColor(color?: string): string | undefined {
  if (!color) return undefined;
  return /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)
    ? `#${color}`
    : color;
}

// Geometry types from Mapbox tilestats API for Streets v8
// This maps actual source-layer names to their geometry types
const SOURCE_LAYER_GEOMETRY: Record<
  string,
  'Point' | 'LineString' | 'Polygon'
> = {
  landuse: 'Polygon',
  waterway: 'LineString',
  water: 'Polygon',
  aeroway: 'LineString',
  structure: 'LineString',
  building: 'Polygon',
  landuse_overlay: 'Polygon',
  road: 'LineString',
  admin: 'LineString',
  place_label: 'Point',
  airport_label: 'Point',
  transit_stop_label: 'Point',
  natural_label: 'LineString', // Note: Can be both Point and LineString, but primarily LineString
  poi_label: 'Point',
  motorway_junction: 'Point',
  housenum_label: 'Point'
};

export class StyleBuilderTool extends BaseTool<typeof StyleBuilderToolSchema> {
  name = 'style_builder_tool';
  readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    title: 'Build Mapbox Style JSON Tool'
  };
  // Kept to the rules that change the shape of a call. Everything reference-shaped — the slot
  // table, the emissive-strength explanation, the Streets v8 field lists, worked examples — lives
  // in resource://mapbox-style-layers, and the per-field detail in this tool's input schema, which
  // the model is given alongside this text. Repeating it here cost ~5k characters on every
  // request to this server, styling task or not.
  description = `Generate Mapbox style JSON. Resolves layer types and filters against Streets v8, so
approximate layer names work — { class: 'park' } finds 'landuse', { maki: 'cafe' } finds 'poi_label'.
Use "admin" for all boundaries, "building" (singular), "road" for all streets. Unrecognized types
come back with the available layers and fields. See resource://mapbox-style-layers for slots,
emissive strength, layer properties and worked examples.

TARGET — base_style decides which options apply, and the wrong ones are REJECTED, not ignored:
• 'standard' is the default and almost always right. Takes standard_config; slots; lit scene
• Classic (streets-v12/light-v11/dark-v11/satellite-*/outdoors-v12/navigation-*) only when a
  classic style is explicitly asked for. Takes global_settings; no config surface, no slots
• A Classic base is NOT an import and does not reproduce the named style — this tool authors the
  stack, so EVERYTHING you want drawn must be listed in 'layers', and an empty list is REJECTED.
  To use the named style itself, reference mapbox://styles/mapbox/<name> in the map rather than
  building anything here. The base name only sets light vs dark and whether satellite imagery goes
  underneath; bases within a group are equivalent

ON STANDARD, CONFIGURE BEFORE YOU LAYER:
The basemap belongs to the import and this tool cannot reach into it, so a Streets v8 layer draws a
SECOND copy over the basemap's own. standard_config restyles the basemap itself:
• theme 'faded'/'monochrome' — fastest way to make your data pop
• lightPreset 'night' — THIS is dark mode. Not dark-v11, not global_settings.mode
• show* toggles to hide what competes with your data; color* to retint water/roads/parks/labels
• action:'hide' on Standard sets the matching toggle (poi_label→showPointOfInterestLabels,
  place_label, transit_stop_label, building→show3dBuildings, admin→showAdminBoundaries). Water,
  landuse and the road network have no toggle, so 'hide' on those is rejected — make them recede
  with theme and color* instead. On Classic, 'hide' just omits the layer

YOUR OWN DATA — custom_sources (the layer_type lookup covers Streets v8 only, not your data):
• custom_sources: { zones: { type: 'geojson', data: <url or FeatureCollection> } }, then
  layer: { layer_type: 'Zones', source_id: 'zones', render_type: 'fill', color: '#7b61ff' }
• render_type is REQUIRED here; for type 'vector' also set source_layer. 'composite' (and
  'satellite' on a satellite base) are reserved and rejected
• Color by value as on any layer: 'expression' for a ramp, or property_based + property_values
  for a category match ('color' becomes the fallback arm)
• These get overlay placement, emissive strength and line-occlusion-opacity set for you. Override
  with slot:'bottom' on a choropleth, so the road network reads over it`;

  constructor() {
    super({ inputSchema: StyleBuilderToolSchema });
  }

  protected async execute(
    input: StyleBuilderToolInput
  ): Promise<CallToolResult> {
    try {
      const result = this.buildStyle(input);
      const {
        style,
        corrections,
        layerHelp,
        availableProperties,
        standardConfig
      } = result;

      // If we need layer help, return guidance to the model
      if (layerHelp) {
        return {
          content: [
            {
              type: 'text' as const,
              text: layerHelp
            }
          ],
          isError: false // Return as guidance, not error
        };
      }

      // Build corrections message if any
      const correctionsMessage =
        corrections.length > 0
          ? `\n**Auto-corrections Applied:**\n${corrections.join('\n')}\n`
          : '';

      // Build available properties message
      let propertiesMessage = '';
      if (availableProperties && Object.keys(availableProperties).length > 0) {
        propertiesMessage = '\n**Available Properties for Your Layers:**\n';
        for (const [layerType, props] of Object.entries(availableProperties)) {
          propertiesMessage += `\n**${layerType} layers:**\n`;
          if (props.paint && props.paint.length > 0) {
            propertiesMessage += `- Paint: ${props.paint.slice(0, 8).join(', ')}${props.paint.length > 8 ? '...' : ''}\n`;
          }
          if (props.layout && props.layout.length > 0) {
            propertiesMessage += `- Layout: ${props.layout.slice(0, 8).join(', ')}${props.layout.length > 8 ? '...' : ''}\n`;
          }
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `**Style Built Successfully**

**Name:** ${input.style_name}
**Base:** ${input.base_style || 'standard'}
**Layers Configured:** ${input.layers.length}
${standardConfig ? `**Standard Config:** ${Object.keys(standardConfig).length} properties set` : ''}
${correctionsMessage}
${propertiesMessage}
${this.generateSummary(input, result)}

**Generated Style JSON:**
\`\`\`json
${JSON.stringify(style, null, 2)}
\`\`\`

**Next Steps:**
• Use \`create_style_tool\` with this JSON to create the style in your Mapbox account
• Use \`update_style_tool\` to apply these layers to an existing style
• Use \`preview_style_tool\` to see how this style looks`
          }
        ],
        isError: false
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `**Error building style:** ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }

  private buildStyle(input: StyleBuilderToolInput): {
    style: MapboxStyle;
    corrections: string[];
    layerHelp?: string;
    availableProperties?: Record<string, { paint: string[]; layout: string[] }>;
    /** `standard_config` as generated, including toggles resolved from `hide` actions. */
    standardConfig?: Record<string, unknown>;
    /** Which `standard_config` toggle each hidden layer resolved to, by index in `layers`. */
    hideToggles: Map<number, string>;
    /** The Streets v8 source layer each basemap layer resolved to, by index in `layers`. */
    resolvedSourceLayers: Map<number, string>;
    /** The reconciled Classic appearance, or null on Standard. */
    classic: ClassicSettings | null;
  } {
    const layers: Layer[] = [];
    const allCorrections: string[] = [];
    const availableProperties: Record<
      string,
      { paint: string[]; layout: string[] }
    > = {};
    // Apply default base_style if not specified
    const baseStyle = input.base_style || 'standard';
    const target = resolveTarget(baseStyle);

    // What each Classic base implies, reconciled with anything the caller set explicitly.
    // Standard takes none of it — the import supplies the basemap.
    const classic =
      target.kind === 'classic'
        ? resolveClassicSettings(baseStyle, input.global_settings)
        : null;

    // A `hide` on Standard becomes a basemap config toggle, since the feature belongs to the
    // import. Filled in as each layer is resolved, and read back by the summary so a `hide`
    // is reported as the toggle it actually set.
    const standardConfig: Record<string, unknown> = {
      ...(input.standard_config ?? {})
    };
    const hideToggles = new Map<number, string>();
    // The source layer each basemap layer resolved to, so the summary can describe a layer by
    // the name the style actually uses rather than by the string that was passed in.
    const resolvedSourceLayers = new Map<number, string>();
    const reportedHideToggles = new Set<string>();

    // Layer ids are derived from what the layer draws — the source layer plus its filter, or the
    // custom source id plus its render type — so two layers over the same feature collide: a
    // filtered pair off one GeoJSON source, or two unfiltered layers of the same basemap feature.
    // Duplicate ids are invalid per the style spec, and the collision was silent.
    const usedLayerIds = new Set<string>();
    const uniqueLayerId = (id: string): string => {
      if (!usedLayerIds.has(id)) {
        usedLayerIds.add(id);
        return id;
      }
      let suffix = 2;
      while (usedLayerIds.has(`${id}-${suffix}`)) suffix++;
      const unique = `${id}-${suffix}`;
      usedLayerIds.add(unique);
      return unique;
    };

    /**
     * A build that stopped with guidance instead of a style.
     *
     * Every one of these is a hard stop rather than a warning: the shared failure mode is a
     * style that looks finished and did not do what was asked.
     */
    const guidance = (layerHelp: string) => ({
      style: {} as MapboxStyle,
      corrections: [],
      layerHelp,
      availableProperties: {},
      hideToggles,
      resolvedSourceLayers,
      classic
    });

    // Reject the other target's options before generating anything, so a caller never
    // walks away believing a setting took effect when it was quietly dropped.
    const foreign = StyleBuilderTool.assertTargetOptions(input, target);
    if (foreign) {
      return guidance(foreign);
    }

    // A Classic base authors nothing, so no layers is no map — a background layer reported as a
    // style built successfully. Stopped rather than built, because the likeliest reading of
    // `base_style: "dark-v11"` is "give me dark-v11", which is a reference to an existing style
    // rather than anything this tool can produce. Standard is exempt: a config-only style with no
    // layers of its own is the normal shape there, since the import supplies the map.
    if (target.kind === 'classic' && input.layers.length === 0) {
      return guidance(
        emptyClassicGuidance(baseStyle, classic?.imagery ?? false)
      );
    }

    // Same rule one level down: a property of a *different Standard style* is as inert as a
    // Classic option on Standard, and gets the same treatment rather than being passed through
    // into the import config where nothing would read it.
    const satelliteOnly = Object.keys(input.standard_config ?? {}).filter(
      (key) => key in STANDARD_SATELLITE_ONLY_CONFIG
    );
    if (satelliteOnly.length > 0) {
      return guidance(
        `**Not available on the Standard style this tool builds: ${satelliteOnly
          .map((key) => `\`${key}\``)
          .join(', ')}.**\n\n` +
          satelliteOnly
            .map(
              (key) => `• \`${key}\` — ${STANDARD_SATELLITE_ONLY_CONFIG[key]}`
            )
            .join('\n') +
          `\n\nThis tool imports \`mapbox://styles/mapbox/standard\`, which has no such config ` +
          `property, so setting it would have done nothing. Nothing was generated.`
      );
    }

    // The builder's own source ids. A caller's source keyed the same way would replace the
    // basemap's rather than sit beside it — silently, because custom sources are merged last —
    // leaving every layer that referenced the id pointed at the wrong data.
    const reservedSourceIds = [
      'composite',
      ...(classic?.imagery ? ['satellite'] : [])
    ];
    const collisions = Object.keys(input.custom_sources ?? {}).filter((id) =>
      reservedSourceIds.includes(id)
    );
    if (collisions.length > 0) {
      return guidance(
        `**Reserved source id${collisions.length > 1 ? 's' : ''} in \`custom_sources\`: ` +
          `${collisions.map((id) => `\`${id}\``).join(', ')}.**\n\n` +
          `This ${target.label} style already declares ${reservedSourceIds
            .map((id) => `\`${id}\``)
            .join(' and ')} for the basemap` +
          `${classic?.imagery ? ' and its satellite imagery' : ''}, and \`custom_sources\` is ` +
          `merged last — so your source would replace it and every layer built from the ` +
          `basemap would read your data instead. Rename the entr${collisions.length > 1 ? 'ies' : 'y'} ` +
          `(and the matching \`source_id\`) to something of your own, such as ` +
          `${collisions.map((id) => `\`my-${id}\``).join(', ')}. Nothing was generated.`
      );
    }

    // Classic has no import to supply land colour, so it needs its own background layer —
    // unless the base is imagery, where the raster tiles are what the layers sit on.
    if (target.needsBackgroundLayer && classic) {
      layers.push(
        classic.imagery
          ? {
              id: uniqueLayerId('satellite'),
              type: 'raster',
              source: 'satellite'
            }
          : {
              id: uniqueLayerId('background'),
              type: 'background',
              paint: {
                'background-color': classic.backgroundColor
              }
            }
      );
    }

    // Build each configured layer
    for (const [index, config] of input.layers.entries()) {
      // A layer bound to the caller's own source skips the Streets v8 lookup — the
      // geometry lives in their data, not in the basemap.
      if (config.source_id) {
        // `hide` on your own data is omission on either target. The layer is yours to leave
        // out rather than the import's to remove, so none of the Standard config surface
        // applies — reaching for a `show*` toggle here would be advice about the basemap.
        if (config.action === 'hide') continue;

        const userLayer = this.createUserDataLayer(
          config,
          input,
          target,
          allCorrections,
          uniqueLayerId
        );
        if (typeof userLayer === 'string') {
          return guidance(userLayer);
        }
        layers.push(userLayer);
        continue;
      }

      // Determine the source layer for this config
      let sourceLayer = config.layer_type;
      let layerDef: DynamicLayerDefinition | null = null;

      // Check if layer_type is a valid source layer
      if (sourceLayer in STREETS_V8_FIELDS) {
        layerDef = this.createDynamicLayerDefinition(sourceLayer, config);
      } else if (
        config.filter_properties &&
        Object.keys(config.filter_properties).length > 0
      ) {
        // Try to find the correct source layer based on filter properties
        const bestMatch = this.findSourceLayerByFilterProperties(
          config.filter_properties
        );
        if (bestMatch) {
          sourceLayer = bestMatch;
          allCorrections.push(
            `• Determined source layer "${sourceLayer}" from filter properties (original: "${config.layer_type}")`
          );
          layerDef = this.createDynamicLayerDefinition(sourceLayer, config);
        }
      }

      // If still no match, return helpful information. Reached for a `hide` too: an
      // unrecognised layer type is an unrecognised layer type whatever the action, and the
      // suggestion list is the useful answer rather than a verdict about Standard.
      if (!layerDef) {
        return guidance(this.generateLayerHelp(config));
      }

      resolvedSourceLayers.set(index, sourceLayer);

      // `hide` is answered against the *resolved* source layer, so a name the tool had to
      // work out from filter_properties gets the same answer as every other action would.
      if (config.action === 'hide') {
        if (target.kind === 'standard') {
          const toggle = STANDARD_HIDE_TOGGLE[sourceLayer];
          if (!toggle) {
            return guidance(standardHideGuidance(sourceLayer));
          }
          if (standardConfig[toggle] === true) {
            allCorrections.push(
              `• \`standard_config.${toggle}\` was set to true and "${sourceLayer}" was also ` +
                `asked to be hidden. The hide won — the toggle is now false. Drop one of the ` +
                `two so the intent is unambiguous.`
            );
          }
          // Reported once per toggle. Two layers hiding the same feature is one decision,
          // and repeating the line reads like two separate things happened.
          if (!reportedHideToggles.has(toggle)) {
            reportedHideToggles.add(toggle);
            allCorrections.push(
              `• Hiding "${sourceLayer}" on Standard set \`standard_config.${toggle}: false\`. ` +
                `Omitting the layer would not have hidden it — the basemap draws it through the import.`
            );
          }
          standardConfig[toggle] = false;
          hideToggles.set(index, toggle);
        }
        // On Classic, leaving the layer out of the stack is what hides the feature.
        continue;
      }

      // Redrawing a basemap feature on Standard stacks a second copy over the import's own.
      // The config property restyles the basemap itself, so point at it before generating.
      if (
        target.kind === 'standard' &&
        (config.action === 'color' || config.action === 'highlight')
      ) {
        const colorConfig = STANDARD_COLOR_CONFIG[sourceLayer];
        if (colorConfig) {
          allCorrections.push(
            `• Recolouring "${sourceLayer}" adds a second copy over the basemap's own — Standard ` +
              `keeps drawing it underneath. \`standard_config.${colorConfig}\` retints the basemap ` +
              `itself, which stays in sync with it. Keep the custom layer only if the recolour is ` +
              `filtered to a subset the config cannot express.`
          );
        }
      }

      const result = this.createLayer(
        layerDef,
        config,
        classic,
        target,
        uniqueLayerId
      );
      if (result.layer) {
        layers.push(result.layer);

        // Collect available properties for this layer type
        if (layerDef.type && !availableProperties[layerDef.type]) {
          availableProperties[layerDef.type] = {
            paint: layerDef.paintProperties
              .filter((p) => p.example !== undefined)
              .map((p) => p.property),
            layout: layerDef.layoutProperties
              ? layerDef.layoutProperties
                  .filter((p) => p.example !== undefined)
                  .map((p) => p.property)
              : []
          };
        }
      }
      if (result.corrections.length > 0) {
        // Check for critical errors that need immediate attention
        const criticalError = result.corrections.find((c) =>
          c.startsWith('ERROR:')
        );
        if (criticalError) {
          // Return helpful guidance for the model to retry with correct field
          return guidance(
            criticalError +
              '\n\n**Please retry with the corrected filter_properties.**'
          );
        }
        allCorrections.push(...result.corrections);
      }
    }

    // Hiding a basemap feature and also drawing it is contradictory on its face, but it is a
    // real technique on Standard: turn the basemap's own POIs off, draw your filtered subset
    // over the top. So it is worth naming rather than rejecting — the same input is a mistake
    // when the drawn layer is unfiltered, since that just reinstates what was hidden.
    //
    // Keyed by the hidden feature rather than by the layer that hid it, so two layers hiding
    // one feature produce one line — the same de-duplication the toggle report needs.
    const hiddenFeatures = new Map<string, string>();
    for (const [index, toggle] of hideToggles) {
      const name = resolvedSourceLayers.get(index);
      if (name) hiddenFeatures.set(name, toggle);
    }
    for (const [hiddenLayer, toggle] of hiddenFeatures) {
      const alsoDrawn = [...resolvedSourceLayers].filter(
        ([otherIndex, name]) =>
          name === hiddenLayer && input.layers[otherIndex].action !== 'hide'
      );
      if (alsoDrawn.length === 0) continue;
      const unfiltered = alsoDrawn.some(
        ([otherIndex]) =>
          !input.layers[otherIndex].filter_properties &&
          !input.layers[otherIndex].filter
      );
      allCorrections.push(
        `• "${hiddenLayer}" is hidden through \`standard_config.${toggle}\` and also drawn as a ` +
          `custom layer. ` +
          (unfiltered
            ? `The custom layer has no filter, so it redraws what the toggle just hid — drop ` +
              `one of the two.`
            : `That is the right shape for showing a filtered subset of a feature you have ` +
              `otherwise turned off; no change needed if it was deliberate.`)
      );
    }

    // A thin Classic stack is usually an incomplete layer list rather than a deliberate one, and
    // the shortfall is invisible in the output: the style is valid, it just draws less of the map
    // than the caller pictured. Named rather than rejected, since a few layers over imagery — or a
    // data-only style — are both legitimate. Imagery bases are exempt: there the photograph is the
    // map, and the vector features are the addition.
    if (target.kind === 'classic' && !classic?.imagery) {
      const drawn = new Set(
        [...resolvedSourceLayers]
          .filter(([index]) => input.layers[index].action !== 'hide')
          .map(([, name]) => name)
      );
      const missing = CLASSIC_STAPLE_LAYERS.filter((name) => !drawn.has(name));
      if (missing.length > 0) {
        allCorrections.push(
          `• This Classic style draws nothing for ${missing
            .map((name) => `"${name}"`)
            .join(
              ', '
            )}. A Classic base is not an import, so a feature absent from \`layers\` is ` +
            `absent from the map. Add them if the map should show them — or reference ` +
            `\`mapbox://styles/mapbox/${baseStyle}\` directly if what you wanted was that style's ` +
            `own cartography (${CLASSIC_STYLES_DOC}).`
        );
      }
    }

    // Note: We no longer automatically add layers that weren't explicitly requested
    // The user should specify all desired layers in the input

    // Create the base style object with minimal properties
    // Additional properties will be added based on base style type
    const style: MapboxStyle = {
      version: 8,
      name: input.style_name
    } as MapboxStyle;

    // For standard style, use imports to inherit from Mapbox Standard
    if (baseStyle === 'standard') {
      // Follow the exact order from the working Mapbox Studio example
      style.metadata = {
        'mapbox:autocomposite': true,
        'mapbox:uiParadigm': 'imports',
        'mapbox:sdk-support': {
          js: '3.14.0',
          android: '11.14.0',
          ios: '11.14.0'
        },
        'mapbox:groups': {}
      };
      style.center = [0, 0];
      style.zoom = 2;

      // Build the import configuration
      const importConfig: any = {
        id: 'basemap',
        url: 'mapbox://styles/mapbox/standard'
      };

      // Add Standard style configuration if provided, including the toggles that `hide`
      // actions resolved to.
      if (Object.keys(standardConfig).length > 0) {
        importConfig.config = standardConfig;
      }

      style.imports = [importConfig];
      style.sources = {
        composite: {
          url: 'mapbox://mapbox.mapbox-streets-v8',
          type: 'vector'
        }
      };
      // The Streets sprite is deliberate here, not a Classic-style leftover: a sprite must
      // match the icon vocabulary of the *data source*, not the imported basemap. The symbol
      // layers this tool emits reference maki names — ["get", "maki"] off the Streets v8 maki
      // field, or a literal like "marker-15" — and the Streets sprite is built for that data.
      //
      // Standard's icons aren't an option: an import is a separate scope, not addressable
      // from the importing style's layers, and Standard exposes its own iconography rather
      // than maki names. Per the spec a sprite is required once any layer uses icon-image or
      // a *-pattern, and the root style's sprite is what serves the root style's layers.
      style.sprite = 'mapbox://sprites/mapbox/streets-v12';
      style.glyphs = 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf';
      style.projection = { name: 'globe' };
      style.layers = layers;

      // Explicitly set terrain to null for API compatibility
      // @ts-expect-error - The API expects null but TypeScript type doesn't allow it
      style.terrain = null;
    } else {
      // Classic styles - use traditional sources
      style.center = [0, 0];
      style.zoom = 2;
      style.sources = {
        composite: {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2'
        }
      };
      // A satellite base is imagery, not a colour: without the raster source the "satellite"
      // bases were indistinguishable from streets-v12 over a flat background.
      if (classic?.imagery) {
        (style.sources as Record<string, unknown>).satellite = {
          type: 'raster',
          url: 'mapbox://mapbox.satellite',
          tileSize: 256
        };
      }
      style.sprite = 'mapbox://sprites/mapbox/streets-v12';
      style.glyphs = 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf';
      style.layers = layers;
    }

    // The caller's own sources sit alongside the basemap source under the ids their layers
    // reference. Added after the target-specific block so neither branch can clobber them.
    if (input.custom_sources) {
      for (const [id, source] of Object.entries(input.custom_sources)) {
        (style.sources as Record<string, unknown>)[id] =
          source.type === 'geojson'
            ? { type: 'geojson', data: source.data }
            : { type: 'vector', url: source.url };
      }
    }

    return {
      style,
      corrections: allCorrections,
      availableProperties,
      standardConfig:
        target.kind === 'standard' && Object.keys(standardConfig).length > 0
          ? standardConfig
          : undefined,
      hideToggles,
      resolvedSourceLayers,
      classic
    };
  }

  private findSourceLayerByFilterProperties(
    filterProperties: Record<string, any>
  ): string | null {
    let bestMatch: { layer: string; score: number } | null = null;

    for (const [sourceLayer, fields] of Object.entries(STREETS_V8_FIELDS)) {
      let score = 0;
      const layerFields = fields as any;

      for (const [filterKey, filterValue] of Object.entries(filterProperties)) {
        // Check if this field exists in this source layer
        if (filterKey in layerFields) {
          score += 10;

          // Check if the value is valid for this field
          if (layerFields[filterKey].values) {
            const validValues = layerFields[filterKey].values;
            const valuesToCheck = Array.isArray(filterValue)
              ? filterValue
              : [filterValue];

            for (const val of valuesToCheck) {
              const normalizedVal = String(val).toLowerCase();
              if (
                validValues.some(
                  (v: any) => String(v).toLowerCase() === normalizedVal
                )
              ) {
                score += 20; // High score for exact match
              }
            }
          }
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { layer: sourceLayer, score };
      }
    }

    return bestMatch?.layer || null;
  }

  private generateLayerHelp(
    config: StyleBuilderToolInput['layers'][0]
  ): string {
    // Generate all possible layer/filter combinations from STREETS_V8_FIELDS
    const combinations: string[] = [];

    for (const [sourceLayer, fields] of Object.entries(STREETS_V8_FIELDS)) {
      const layerFields = fields as any;
      const fieldExamples: string[] = [];

      // Get up to 3 example fields with their values
      let fieldCount = 0;
      for (const [fieldName, fieldDef] of Object.entries(layerFields)) {
        if (fieldCount >= 3) break;
        if (
          fieldDef &&
          typeof fieldDef === 'object' &&
          'values' in fieldDef &&
          fieldDef.values
        ) {
          const values = (fieldDef.values as any[])
            .slice(0, 3)
            .map((v) => `"${v}"`)
            .join(', ');
          fieldExamples.push(`${fieldName}: ${values}`);
          fieldCount++;
        }
      }

      if (fieldExamples.length > 0) {
        combinations.push(`**${sourceLayer}**: ${fieldExamples.join(' | ')}`);
      }
    }

    // Create helpful message for the model
    let helpText = `**Layer "${config.layer_type}" not found.**\n\n`;

    helpText += `**IMPORTANT:** Keep the same base_style and other settings, just correct the layer_type.\n\n`;

    helpText += `**Available source layers you can use:**\n`;

    // List all available source layers with helpful clarifications
    const allLayers = Object.keys(SOURCE_LAYER_GEOMETRY);
    const layerDescriptions: Record<string, string> = {
      admin: 'admin (administrative boundaries - countries, states, etc.)',
      building: 'building (building footprints)',
      landuse: 'landuse (parks, residential, industrial areas)',
      landuse_overlay: 'landuse_overlay (wetlands, national parks)',
      road: 'road (all roads, streets, paths, railways)',
      water: 'water (oceans, lakes, rivers as polygons)',
      waterway: 'waterway (rivers, streams as lines)',
      place_label: 'place_label (city, state, country labels)',
      poi_label: 'poi_label (points of interest)',
      transit_stop_label: 'transit_stop_label (bus, train stops)',
      natural_label: 'natural_label (natural feature labels)',
      motorway_junction: 'motorway_junction (highway exits)',
      housenum_label: 'housenum_label (house numbers)',
      airport_label: 'airport_label (airport labels)',
      aeroway: 'aeroway (runways, taxiways)',
      structure: 'structure (bridges, tunnels, fences)'
    };

    helpText += allLayers
      .map((layer) => `• ${layerDescriptions[layer] || layer}`)
      .join('\n');
    helpText += '\n\n';

    // Add common confusion clarifications
    helpText += `**Note:** Looking for boundaries? Use "admin" with filter_properties like {admin_level: 0} for countries.\n\n`;

    if (
      config.filter_properties &&
      Object.keys(config.filter_properties).length > 0
    ) {
      helpText += `You specified filter_properties: ${JSON.stringify(config.filter_properties)}\n\n`;

      // Check which layers have these fields
      const matchingLayers: string[] = [];
      for (const [filterKey] of Object.entries(config.filter_properties)) {
        for (const [sourceLayer, fields] of Object.entries(STREETS_V8_FIELDS)) {
          if (filterKey in (fields as any)) {
            matchingLayers.push(`${sourceLayer} (has field: ${filterKey})`);
          }
        }
      }

      if (matchingLayers.length > 0) {
        helpText += `**Layers with your filter fields:**\n${matchingLayers.map((l) => `• ${l}`).join('\n')}\n\n`;
      }
    }

    helpText += `**Try again with the correct layer_type from the list above.**\n\n`;

    helpText += `**Example for parks:**
\`\`\`json
{
  "layer_type": "landuse",
  "filter_properties": { "class": "park" },
  "action": "color",
  "color": "#90C090"
}
\`\`\`

**Example for only cemeteries:**
\`\`\`json
{
  "layer_type": "landuse",
  "filter_properties": { "class": "cemetery" },
  "action": "color",
  "color": "#D0D0D0"
}
\`\`\``;

    return helpText;
  }

  private createLayer(
    layerDef: DynamicLayerDefinition,
    config: StyleBuilderToolInput['layers'][0],
    classic: ClassicSettings | null,
    target: StyleTarget,
    uniqueLayerId: (id: string) => string
  ): { layer: Layer | null; corrections: string[] } {
    // Generate a unique ID for the layer based on its properties
    let layerId = `${layerDef.id || config.layer_type}-custom`;

    // If there are filter properties, create a unique suffix from them
    if (config.filter_properties) {
      // Create a deterministic hash from the filter properties
      const filterKeys = Object.entries(config.filter_properties)
        .map(([key, value]) => `${key}-${value}`)
        .join('-');
      layerId = `${layerDef.id}-${filterKeys}`;
    }

    // Two layers over the same feature with the same filter derive the same name, which is not
    // a valid style. Suffixed rather than rejected: asking for the feature twice is legitimate.
    layerId = uniqueLayerId(layerId);

    const layer: Layer = {
      id: layerId,
      type: layerDef.type as Layer['type']
    };

    // Slots only exist on styles that import Standard, where Mapbox owns the basemap order.
    // A layer with no slot is not "unordered" — it lands above every basemap layer including
    // street labels, almost never the intent — so infer one rather than leaving it off.
    const slotCorrections: string[] = [];
    if (target.usesSlots) {
      if (config.slot) {
        // Explicitly set - respect their choice.
        layer.slot = config.slot;
      } else {
        const inferred = inferSlot(layerDef.type, 'basemap');
        if (inferred) {
          layer.slot = inferred;
          slotCorrections.push(
            `• No slot given for "${layerId}" — inferred slot "${inferred}" from its ${layerDef.type} type. ` +
              `Without a slot the layer would draw above the street labels. Set 'slot' explicitly to override.`
          );
        } else {
          // Not a gap in the inference: a fill-extrusion is real 3D geometry taking part in the
          // scene's depth, so it is left unslotted on purpose. Reported all the same, because a
          // layer coming back without the slot the docs insist on otherwise looks like a bug.
          slotCorrections.push(
            `• "${layerId}" was left without a slot deliberately — a ${layerDef.type} layer is 3D ` +
              `geometry that the scene depth-sorts against the buildings around it, and a slot would ` +
              `flatten it into the 2D stack. Set 'slot' explicitly only if you want that.`
          );
        }
      }
    }

    // Add source configuration
    if (layerDef.sourceLayer) {
      layer.source = 'composite';
      layer['source-layer'] = layerDef.sourceLayer;
    }

    // Generate comprehensive filter with auto-correction
    const filterResult = this.generateComprehensiveFilter(config, layerDef);
    if (filterResult.filter) {
      layer.filter = filterResult.filter;
    }

    // Build paint properties
    const paint: Record<string, unknown> = {};

    // Use the user-provided color if available, otherwise use defaults
    let effectiveColor = normalizeColor(config.color);

    // Only provide a default color if none was specified
    if (
      !effectiveColor &&
      (config.action === 'color' || config.action === 'highlight')
    ) {
      effectiveColor = this.getHarmoniousColor(
        config.layer_type,
        config.action
      );
    }

    // Apply color based on action
    if (
      (config.action === 'color' || config.action === 'highlight') &&
      effectiveColor
    ) {
      const colorProp = this.getColorProperty(layerDef.type);
      if (colorProp) {
        paint[colorProp] = this.generateExpression(
          effectiveColor,
          config,
          'color'
        );
      }
    }

    // Apply opacity - use specified value or smart defaults
    const opacityProp = this.getOpacityProperty(layerDef.type);
    if (opacityProp) {
      // Special handling for boundaries - fade at higher zooms
      if (
        config.layer_type === 'country_boundaries' ||
        config.layer_type === 'state_boundaries'
      ) {
        const baseOpacity =
          config.opacity !== undefined
            ? config.opacity
            : this.getDefaultOpacity(config.layer_type, layerDef.type);

        // Create zoom-based interpolation for boundaries
        paint[opacityProp] = [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          baseOpacity, // Full opacity at world view
          6,
          baseOpacity * 0.8, // Slightly faded at country view
          10,
          baseOpacity * 0.6, // More faded at region view
          14,
          baseOpacity * 0.4, // Very faded at city view
          18,
          baseOpacity * 0.2 // Almost invisible at street level
        ];
      } else if (this.isRoadLayer(config.layer_type)) {
        // Special handling for roads - more subtle at lower zooms
        const baseOpacity =
          config.opacity !== undefined
            ? config.opacity
            : this.getDefaultOpacity(config.layer_type, layerDef.type);

        // For highlighted/navigation roads, use higher opacity
        const isNavigationHighlight =
          config.action === 'highlight' || config.layer_type === 'motorways';

        if (isNavigationHighlight) {
          // Navigation-focused roads should be more prominent
          paint[opacityProp] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            Math.max(baseOpacity * 0.6, 0.6), // More visible at country view
            8,
            Math.max(baseOpacity * 0.75, 0.75), // Good visibility at region view
            11,
            Math.max(baseOpacity * 0.85, 0.85), // Strong at city level
            14,
            Math.max(baseOpacity * 0.95, 0.95), // Nearly full at neighborhood
            16,
            1.0 // Full opacity at street level
          ];
        } else {
          // Regular roads - subtle at low zooms
          paint[opacityProp] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            baseOpacity * 0.3, // Very subtle at country view
            8,
            baseOpacity * 0.5, // Half opacity at region view
            11,
            baseOpacity * 0.7, // More visible at city level
            14,
            baseOpacity * 0.85, // Nearly full at neighborhood level
            16,
            baseOpacity // Full opacity at street level
          ];
        }
      } else {
        // For Standard style overlays, use higher opacity by default
        // This keeps colors vibrant and easily distinguishable
        const opacity =
          config.opacity !== undefined
            ? config.opacity
            : target.kind === 'standard'
              ? 0.75
              : this.getDefaultOpacity(config.layer_type, layerDef.type);

        // Only apply if not full opacity (to keep styles cleaner)
        if (opacity < 1.0) {
          paint[opacityProp] = this.generateExpression(
            opacity,
            config,
            'opacity'
          );
        }
      }
    }

    // Apply width for line layers with better defaults
    if (layerDef.type === 'line') {
      if (config.width !== undefined) {
        // Use the user-provided width
        const width = config.width;

        // Always use zoom interpolation for roads
        if (typeof width === 'number' && width > 0) {
          // Create zoom-based interpolation that respects the provided width
          // but ensures it scales properly with zoom
          paint['line-width'] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            width * 0.4, // Thinner at low zoom
            10,
            width * 0.6, // Building up
            14,
            width * 0.85, // Near full width at city zoom
            18,
            width // Full width at high zoom
          ];
        } else {
          paint['line-width'] = this.generateExpression(width, config, 'width');
        }
      } else {
        // Apply smart default widths based on road type with zoom interpolation
        const defaultWidth = this.getDefaultLineWidth(
          config.layer_type,
          config.action === 'highlight'
        );

        if (defaultWidth) {
          paint['line-width'] = defaultWidth;
        }
      }
    }

    // For highlight action, make it prominent but refined
    if (config.action === 'highlight') {
      if (!effectiveColor) {
        const colorProp = this.getColorProperty(layerDef.type);
        if (colorProp) {
          paint[colorProp] = this.generateExpression(
            this.getHarmoniousColor(config.layer_type, 'highlight'),
            config,
            'color'
          );
        }
      }
      if (!config.width && layerDef.type === 'line' && !paint['line-width']) {
        // Use refined highlight width
        const highlightWidth = this.getDefaultLineWidth(
          config.layer_type,
          true
        );
        paint['line-width'] = highlightWidth || 1.8;
      }
      // For highlights, use moderately higher opacity
      if (
        config.opacity === undefined &&
        !paint[this.getOpacityProperty(layerDef.type) || '']
      ) {
        const opacityProp = this.getOpacityProperty(layerDef.type);
        if (opacityProp) {
          // Use 0.6 for road highlights, 0.8 for other features
          const highlightOpacity =
            config.layer_type.includes('road') ||
            config.layer_type.includes('street') ||
            config.layer_type.includes('motorway')
              ? 0.6
              : 0.8;
          paint[opacityProp] = this.generateExpression(
            highlightOpacity,
            config,
            'opacity'
          );
        }
      }
    }

    // Apply defaults from layer definition with harmonious colors
    for (const prop of layerDef.paintProperties) {
      if (!(prop.property in paint)) {
        // Use harmonious defaults
        if (prop.property.includes('color')) {
          if (
            prop.example &&
            typeof prop.example === 'string' &&
            prop.example.startsWith('#')
          ) {
            paint[prop.property] = prop.example;
          } else {
            paint[prop.property] = this.getHarmoniousColor(
              config.layer_type,
              'default'
            );
          }
        } else if (prop.property === 'line-width') {
          // Skip line-width defaults, we handle those with smart zoom scaling above
          continue;
        } else if (prop.example !== undefined) {
          paint[prop.property] = prop.example;
        }
      }
    }

    // Special handling for symbol layers to ensure better text readability
    if (layer.type === 'symbol') {
      // Ensure text has proper halo for readability
      if (!paint['text-halo-color']) {
        paint['text-halo-color'] =
          classic?.mode === 'dark' ? '#000000' : '#ffffff';
      }
      if (!paint['text-halo-width']) {
        paint['text-halo-width'] = 1.5;
      }
    }

    // label_color and mode are Classic-only: Standard does labels through standard_config,
    // and buildStyle rejects them there. Classic has no config surface, so apply them here.
    if (layer.type === 'symbol' && classic) {
      // Precedence, most specific first: this layer's color, then label_color, then the
      // dark-mode default. All three must beat the generic per-property default, which has
      // already put a literal text-color in `paint` — deferring to it is why label_color
      // previously did nothing.
      if (!config.color) {
        if (classic.labelColor) {
          paint['text-color'] = classic.labelColor;
        } else if (classic.mode === 'dark') {
          paint['text-color'] = '#ffffff';
        }
      }
      if (classic.mode === 'dark') {
        paint['text-halo-color'] = '#000000';
      }
    }

    // Keep custom fill/line/circle layers visible under dusk and night. These default to 0,
    // which lets the scene light the layer into shadow.
    if (target.usesLighting) {
      const emissiveProp = EMISSIVE_PROPERTY[layer.type as string];
      if (emissiveProp && paint[emissiveProp] === undefined) {
        paint[emissiveProp] = 1;
      }
    }

    if (Object.keys(paint).length > 0) {
      layer.paint = paint;
    }

    // Add layout properties with better defaults for specific layer types
    if (
      'layoutProperties' in layerDef &&
      layerDef.layoutProperties &&
      Array.isArray(layerDef.layoutProperties) &&
      layerDef.layoutProperties.length > 0
    ) {
      const layout: Record<string, unknown> = {};

      // Keyed on Streets v8 source layer names that actually exist. Previously keyed on
      // 'transit', 'poi_labels', 'place_labels' and 'road_labels' — none of them a valid
      // source layer, so every branch was unreachable and every symbol layer fell through
      // to the generic defaults below and picked up a hardcoded "marker-15" icon.
      const sourceLayerName = layerDef.sourceLayer || config.layer_type;
      const iconField = this.iconField(sourceLayerName);

      if (iconField && layerDef.type === 'symbol') {
        // Any iconified point layer — POIs by maki, transit and airports by their own field.
        // Driven off the field so each feature gets its own icon.
        layout['text-field'] = ['get', 'name'];
        layout['icon-image'] = ['get', iconField];
        layout['text-anchor'] = 'top';
        layout['text-offset'] = [0, 0.8];
        layout['icon-size'] = 1;
        layout['text-font'] = ['DIN Pro Regular', 'Arial Unicode MS Regular'];
        layout['text-size'] = 12;
      } else if (sourceLayerName === 'place_label') {
        // Deliberately no icon-image: place labels are text only, and the generic defaults
        // would pin a marker on every city.
        layout['text-field'] = ['get', 'name'];
        layout['text-font'] = ['DIN Pro Medium', 'Arial Unicode MS Regular'];
        layout['text-size'] = [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          12,
          18,
          24
        ];
      } else if (sourceLayerName === 'road' && layerDef.type === 'symbol') {
        // Road labels ride along the line rather than sitting at a point.
        layout['symbol-placement'] = 'line';
        layout['text-field'] = ['get', 'name'];
        layout['text-font'] = ['DIN Pro Regular', 'Arial Unicode MS Regular'];
        layout['text-size'] = 12;
        layout['text-rotation-alignment'] = 'map';
      } else {
        // Default layout from definition.
        for (const prop of layerDef.layoutProperties) {
          if (prop.example === undefined) continue;
          // Never hand a symbol layer an icon it has no icon field for: the example value
          // is a literal ("marker-15"), so applying it gives every layer the same pin.
          if (prop.property === 'icon-image') continue;
          layout[prop.property] = prop.example;
        }
      }

      if (Object.keys(layout).length > 0) {
        layer.layout = layout;
      }
    }

    return {
      layer,
      corrections: [...slotCorrections, ...filterResult.corrections]
    };
  }

  /**
   * Build a layer over one of the caller's own sources.
   *
   * Previously inexpressible: the tool only restyled Streets v8 basemap layers, so a user's
   * zones, route or store points had to be hand-authored elsewhere and uploaded raw — which
   * is exactly where slots and emissive strength got lost.
   *
   * Returns the layer, or a guidance string when the config cannot be honoured.
   */
  private createUserDataLayer(
    config: StyleBuilderToolInput['layers'][0],
    input: StyleBuilderToolInput,
    target: StyleTarget,
    corrections: string[],
    uniqueLayerId: (id: string) => string
  ): Layer | string {
    const sourceId = config.source_id as string;
    const source = input.custom_sources?.[sourceId];
    if (!source) {
      const known = Object.keys(input.custom_sources || {});
      return (
        `**Unknown source_id "${sourceId}".**\n\n` +
        (known.length
          ? `Declared sources: ${known.map((k) => `\`${k}\``).join(', ')}.`
          : 'No `custom_sources` were declared.') +
        `\n\nAdd the source to \`custom_sources\` first, then reference its key from the layer.`
      );
    }

    // "auto" has nothing to work from: geometry can't be inferred from a URL or tileset.
    // Ask rather than guess wrong and render nothing visible.
    const renderType =
      config.render_type && config.render_type !== 'auto'
        ? config.render_type
        : null;
    if (!renderType) {
      return (
        `**render_type is required for layers built from your own data.**\n\n` +
        `Source "${sourceId}" has no geometry this tool can inspect, so it cannot choose for you. ` +
        `Set render_type to one of: fill (areas/zones), line (routes/boundaries), ` +
        `circle (points/bubbles), symbol (markers/labels), fill-extrusion (3D), heatmap (density).`
      );
    }

    if (source.type === 'vector' && !config.source_layer) {
      return (
        `**source_layer is required for vector source "${sourceId}".**\n\n` +
        `Vector tilesets contain named source layers; GeoJSON does not. ` +
        `Set \`source_layer\` to the layer name inside the tileset.`
      );
    }

    // Two layers off one source with the same render type derive the same name — a filtered pair
    // of zone fills, say — which is not a valid style. Suffixed rather than rejected.
    const layer: Layer = {
      id: uniqueLayerId(`${sourceId}-${renderType}`),
      type: renderType as Layer['type'],
      source: sourceId
    };
    if (source.type === 'vector' && config.source_layer) {
      layer['source-layer'] = config.source_layer;
    }

    // Reported rather than applied silently, the same as a basemap layer: the inferred slot
    // is a guess about intent, and for a fill it is the one guess that is often wrong.
    if (target.usesSlots) {
      if (config.slot) {
        layer.slot = config.slot;
      } else {
        const inferred = inferSlot(renderType, 'user');
        if (inferred) {
          layer.slot = inferred;
          corrections.push(
            `• No slot given for "${layer.id}" — inferred slot "${inferred}" from its ${renderType} ` +
              `type, the overlay placement for your own data. ` +
              (renderType === 'fill'
                ? `Set \`slot: "bottom"\` instead if this fill encodes a data value (a choropleth), ` +
                  `so the road network still reads over it.`
                : `Set 'slot' explicitly to override.`)
          );
        } else {
          // Same reasoning, and the same wording, as a basemap fill-extrusion: the layer is left
          // unslotted on purpose, and that is reported because a layer coming back without the
          // slot the docs insist on otherwise looks like a bug.
          corrections.push(
            `• "${layer.id}" was left without a slot deliberately — a ${renderType} layer is 3D ` +
              `geometry that the scene depth-sorts against the buildings around it, and a slot would ` +
              `flatten it into the 2D stack. Set 'slot' explicitly only if you want that.`
          );
        }
      }
    }

    // Data-driven colour is the whole point of putting your own data on a map, and this path
    // wrote the literal `color` only: `expression` and `property_based`/`property_values` were
    // accepted by the schema and dropped. A choropleth therefore came out as a fill with no
    // `fill-color` at all, which the spec renders as opaque black over the whole map.
    const paint: Record<string, unknown> = {};
    const colorProp = this.getColorProperty(renderType);
    // Normalised through the same helper as a basemap layer: bare hex reaches this path just as
    // readily, and it was the one path that passed it straight into the style.
    const literalColor = normalizeColor(config.color);
    if (colorProp) {
      const dataDriven =
        config.expression !== undefined ||
        (config.property_based !== undefined &&
          config.property_values !== undefined);
      if (dataDriven) {
        if (config.expression === undefined && config.color === undefined) {
          corrections.push(
            `• "${layer.id}" colours by \`${config.property_based}\`, and \`color\` sets the ` +
              `fallback for values not listed in \`property_values\` — ${UNCLASSIFIED_COLOR} was ` +
              `used. A \`match\` with no fallback draws nothing at all for an unlisted value, so ` +
              `there is always one; set \`color\` to choose it.`
          );
        }
        paint[colorProp] = this.generateExpression(
          literalColor ?? UNCLASSIFIED_COLOR,
          config,
          'color'
        );
      } else if (literalColor) {
        paint[colorProp] = literalColor;
      } else {
        // No colour is not the same as leaving the layer unstyled: every colour property here
        // defaults to opaque black, so the layer lands as a black slab over the map. That is the
        // same failure a `match` with no fallback has, which is why this path always emits one —
        // and the basemap path has always filled in a colour it wasn't given.
        paint[colorProp] = UNCLASSIFIED_COLOR;
        corrections.push(
          `• "${layer.id}" was given no \`color\`, so ${UNCLASSIFIED_COLOR} was used. The spec ` +
            `default for \`${colorProp}\` is opaque black, which covers the map rather than ` +
            `leaving the layer unstyled. Set \`color\`, or \`expression\` / \`property_based\` to ` +
            `colour it by value.`
        );
      }
    }

    // Zoom ramps go through the shared helper rather than `generateExpression`, which would hand
    // a numeric property the colour expression above.
    const ramped = (value: number, kind: 'opacity' | 'width'): unknown =>
      config.zoom_based
        ? this.zoomRamp(
            value,
            kind,
            config.min_zoom ?? 10,
            config.max_zoom ?? 18
          )
        : value;

    const opacityProp = this.getOpacityProperty(renderType);
    if (opacityProp && config.opacity !== undefined) {
      paint[opacityProp] = ramped(config.opacity, 'opacity');
    }
    if (renderType === 'line' && config.width !== undefined) {
      paint['line-width'] = ramped(config.width, 'width');
    }

    // `zoom_based` ramps opacity and width, and a colour ramp is what `expression` is for. With
    // neither of those set it has nothing to act on, so it was accepted and did nothing — the
    // silence this tool is otherwise careful to avoid.
    if (
      config.zoom_based &&
      config.opacity === undefined &&
      !(renderType === 'line' && config.width !== undefined)
    ) {
      corrections.push(
        `• \`zoom_based\` had no effect on "${layer.id}": it ramps \`opacity\` and, on a line, ` +
          `\`width\` — neither was set. Set one of them, or pass \`expression\` with an ` +
          `\`["interpolate", ["linear"], ["zoom"], …]\` ramp to vary the colour by zoom.`
      );
    }

    // A fill-extrusion with no height renders nothing: fill-extrusion-height defaults to 0, so the
    // layer is present, valid and flat — the same "looks finished, draws nothing" shape as a symbol
    // layer with no text-field. The property holding the height cannot be read out of a URL or a
    // tileset, so "height" is assumed, and the assumption reported rather than left to be found.
    if (renderType === 'fill-extrusion') {
      paint['fill-extrusion-height'] = ['get', 'height'];
      corrections.push(
        `• "${layer.id}" extrudes each feature by its \`height\` property. A fill-extrusion with ` +
          `no \`fill-extrusion-height\` draws nothing at all — the default is 0 — and the tool ` +
          `cannot read your data to find the right property. Edit ` +
          `\`paint.fill-extrusion-height\` in the JSON below if your features name it differently, ` +
          `or set it to a constant.`
      );
    }

    if (target.usesLighting) {
      const emissive = EMISSIVE_PROPERTY[renderType];
      if (emissive) paint[emissive] = 1;

      // A route is the canonical user line, and line-occlusion-opacity defaults to 0, so
      // the stretch behind a 3D building disappears. Basemap roads are left alone — there,
      // hiding behind a building is correct.
      if (renderType === 'line') {
        paint['line-occlusion-opacity'] = 1;
      }
    }

    // A symbol layer with neither text-field nor icon-image draws nothing whatsoever, so
    // render_type: "symbol" produced a layer that was present, valid and invisible. The property
    // holding the label cannot be read out of a URL or a tileset, so "name" is assumed — by far
    // the most common — and the assumption is reported rather than left to be discovered.
    //
    // No icon-image: the sprite here is the Streets one, so a literal would resolve, but it would
    // put the same generic pin on every feature. That is the defect the basemap path just lost.
    if (renderType === 'symbol') {
      layer.layout = {
        'text-field': ['get', 'name'],
        'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
        'text-size': 12
      };
      corrections.push(
        `• "${layer.id}" labels each feature from its \`name\` property. A symbol layer with no ` +
          `\`text-field\` renders nothing at all, and the tool cannot see your data to find the ` +
          `right property — edit \`layout.text-field\` in the JSON below if your features name it ` +
          `differently, or use \`render_type: "circle"\` for plain points.`
      );
    }

    if (config.filter) layer.filter = config.filter as Filter;
    if (Object.keys(paint).length > 0) layer.paint = paint;
    return layer;
  }

  /**
   * Reject options that belong to the other target.
   *
   * Silently ignoring a wrong-target option is how a caller ends up believing they set a
   * dark theme when nothing happened — so reject, naming the option that does work.
   *
   * Enforced here rather than in the schema because tool registration reads
   * `inputSchema.shape`, which only exists on a plain object schema: a discriminated union
   * would break registration, and its `oneOf` output is the kind of complex schema some
   * MCP clients mishandle.
   */
  private static assertTargetOptions(
    input: StyleBuilderToolInput,
    target: StyleTarget
  ): string | null {
    const wrong = target.foreignOptions
      .filter((opt) => {
        const value = (input as unknown as Record<string, unknown>)[opt.field];
        if (value === undefined || value === null) return false;
        if (!opt.key) return true;
        return (value as Record<string, unknown>)[opt.key] !== undefined;
      })
      .map((opt) => `\`${opt.path}\` ${opt.instead}`);

    // `slot` lives on the layer rather than at the top level, so the descriptor's field walk
    // cannot see it. Left out, it was the one wrong-target option still being dropped in
    // silence — and a caller carrying a Standard example over to Classic sets it every time.
    if (!target.usesSlots) {
      const slotted = input.layers
        .map((layer, index) => ({ layer, index }))
        .filter(({ layer }) => layer.slot !== undefined);
      if (slotted.length > 0) {
        wrong.push(
          `\`slot\` (on ${slotted
            .map(({ layer, index }) => `layers[${index}] "${layer.layer_type}"`)
            .join(
              ', '
            )}) only applies to styles that import Standard, where Mapbox owns the ` +
            `basemap order. A ${target.label} style is a layer stack you order yourself, so ` +
            `position layers by their order in \`layers\` instead — or set ` +
            `\`base_style: "standard"\` to use slots.`
        );
      }
    }

    if (wrong.length === 0) return null;
    return (
      `**Options that do not apply to a ${target.label} style.**\n\n` +
      wrong.map((w) => `• ${w}`).join('\n') +
      `\n\nRemove them, or change base_style. Nothing was generated.`
    );
  }

  /**
   * The per-feature field a source layer's icons come from, if it has one.
   *
   * Driving icon-image off the field gives each feature its own icon — a cafe gets the cafe
   * glyph, a rail stop its network glyph. A literal gives every feature the same generic pin,
   * which is what happened before: the layout defaults carry "marker-15" as their example
   * value and it was applied to every symbol layer regardless.
   */
  private iconField(sourceLayerName: string): 'maki' | 'network' | null {
    const fields = STREETS_V8_FIELDS[
      sourceLayerName as keyof typeof STREETS_V8_FIELDS
    ] as Record<string, unknown> | undefined;
    if (!fields) return null;
    // maki wins where a layer has both. transit_stop_label carries both: maki is populated
    // for every stop ("rail", "bus", "entrance"), while network holds a branded operator
    // icon that is null for most features, leaving most stops with no icon at all.
    if ('maki' in fields) return 'maki';
    if ('network' in fields) return 'network';
    return null;
  }

  private getColorProperty(layerType: string): string | null {
    const colorProps: Record<string, string> = {
      fill: 'fill-color',
      line: 'line-color',
      symbol: 'text-color',
      circle: 'circle-color',
      background: 'background-color',
      'fill-extrusion': 'fill-extrusion-color'
    };

    return colorProps[layerType] || null;
  }

  private getOpacityProperty(layerType: string): string | null {
    const opacityProps: Record<string, string> = {
      fill: 'fill-opacity',
      line: 'line-opacity',
      symbol: 'text-opacity',
      circle: 'circle-opacity',
      background: 'background-opacity',
      'fill-extrusion': 'fill-extrusion-opacity'
    };

    return opacityProps[layerType] || null;
  }

  /**
   * The summary reports what the build produced, not what was passed in.
   *
   * Every resolved value comes from the build result: `standardConfig` carries the toggles
   * `hide` actions resolved to, `hideToggles` says which toggle each layer got,
   * `resolvedSourceLayers` gives the Streets v8 layer each one landed on, and `classic` is the
   * already-reconciled Classic appearance. Re-deriving any of it from the input is how
   * "poi_label: Hidden" appeared above a style that hid nothing, and how a layer passed as
   * "pois" was described by a name the built style never used.
   *
   * `input` is still read for the caller's own intent — the action, the colour they asked for,
   * the id of a custom source — none of which the build changes.
   */
  private generateSummary(
    input: StyleBuilderToolInput,
    built: {
      standardConfig?: Record<string, unknown>;
      hideToggles: Map<number, string>;
      resolvedSourceLayers: Map<number, string>;
      classic: ClassicSettings | null;
    }
  ): string {
    const { standardConfig, hideToggles, resolvedSourceLayers, classic } =
      built;
    const parts: string[] = ['**Layer Configurations:**'];

    for (const [index, config] of input.layers.entries()) {
      // The resolved name, so a layer the tool worked out from filter_properties is described
      // as what it became. Falls back to the input only for a layer that never resolved —
      // one of the caller's own, which has no Streets v8 definition to describe.
      const resolved = resolvedSourceLayers.get(index) ?? config.layer_type;
      // A layer bound to a custom source is described by the name the caller gave it. Its
      // layer_type is free text, so looking it up reported a GeoJSON layer named "water" as
      // "water layer (Polygon geometry)" — Streets v8 metadata for data that isn't Streets v8.
      const layerDef = config.source_id
        ? null
        : this.createDynamicLayerDefinition(resolved, config);
      const description = layerDef?.description || resolved;

      switch (config.action) {
        case 'color':
          parts.push(`• ${description}: Set to ${config.color}`);
          break;
        case 'highlight':
          parts.push(
            `• ${description}: Highlighted${config.color ? ` in ${config.color}` : ''}`
          );
          break;
        case 'hide': {
          // A toggle exists only for a basemap feature on Standard. Your own layer is hidden
          // by being left out, on either target, so it reports as a plain omission.
          const toggle = hideToggles.get(index);
          parts.push(
            toggle
              ? `• ${description}: Hidden via \`standard_config.${toggle}\``
              : `• ${description}: Hidden`
          );
          break;
        }
        case 'show':
          parts.push(`• ${description}: Shown`);
          break;
      }
    }

    if (classic) {
      parts.push(`\n**Mode:** ${classic.mode}`);
      parts.push(
        classic.imagery
          ? `**Base imagery:** mapbox.satellite raster`
          : `**Background:** ${classic.backgroundColor}`
      );
    }

    // Add Standard style configuration summary if present.
    //
    // Derived from what `standardConfig` actually holds rather than from a hand-written list of
    // properties. The list only ever covered 8 of the 15 `show*` toggles and 6 of the 22 `color*`
    // overrides, so most of the config surface — and every property added to the schema after the
    // list was written — was set on the import and then left out of the summary. Reporting the
    // build accurately is the whole reason the summary reads from the build result.
    if (standardConfig && Object.keys(standardConfig).length > 0) {
      parts.push(`\n**Standard Style Configuration:**`);

      const visibility: string[] = [];
      const colorOverrides: string[] = [];
      const other: string[] = [];

      for (const [key, value] of Object.entries(standardConfig)) {
        if (value === undefined) continue;

        // Its own line, since these are the two that change the whole basemap.
        if (key === 'theme') {
          parts.push(`• Theme: ${value}`);
          continue;
        }
        if (key === 'lightPreset') {
          parts.push(`• Light preset: ${value}`);
          continue;
        }

        if (typeof value === 'boolean') {
          // Includes show3dBuildings alongside show3dObjects: hiding buildings and hiding every
          // 3D object are different requests, and the former is what `hide` on a building sets.
          visibility.push(
            `${STANDARD_CONFIG_LABEL[key] ?? key}: ${value ? 'shown' : 'hidden'}`
          );
        } else if (key.startsWith('color') && !NON_COLOR_CONFIG.has(key)) {
          colorOverrides.push(`${STANDARD_CONFIG_LABEL[key] ?? key}: ${value}`);
        } else {
          other.push(`${STANDARD_CONFIG_LABEL[key] ?? key}: ${value}`);
        }
      }

      if (visibility.length > 0) {
        parts.push(`• Visibility: ${visibility.join(', ')}`);
      }
      if (colorOverrides.length > 0) {
        parts.push(`• Color overrides: ${colorOverrides.join(', ')}`);
      }
      if (other.length > 0) {
        parts.push(`• Other: ${other.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  private generateExpression(
    value: string | number,
    config: StyleBuilderToolInput['layers'][0],
    propertyType: 'color' | 'opacity' | 'width'
  ): unknown {
    // A caller-supplied expression describes the *colour* — that is what `action: "color"` and
    // every documented example use it for. Returned for every property type, it also landed the
    // same colour ramp in `fill-opacity` and `line-width`, where the spec expects a number.
    if (config.expression && propertyType === 'color') {
      return config.expression;
    }

    // Generate property-based styling (data-driven). `property_values` holds colours, so this
    // is a colour expression too — feeding it to opacity or width produced the same mismatch.
    if (
      config.property_based &&
      config.property_values &&
      propertyType === 'color'
    ) {
      const entries = Object.entries(config.property_values);
      const expression: unknown[] = ['match', ['get', config.property_based]];

      for (const [propValue, styleValue] of entries) {
        expression.push(propValue);
        expression.push(styleValue);
      }

      // Add default value
      expression.push(value);
      return expression;
    }

    // Generate zoom-based interpolation
    if (config.zoom_based) {
      return this.zoomRamp(
        value,
        propertyType,
        config.min_zoom ?? 10,
        config.max_zoom ?? 18
      );
    }

    // Return static value if no expression needed
    return value;
  }

  /**
   * A zoom interpolation for one paint value.
   *
   * Split out of `generateExpression` so the custom-source path can ask for a zoom ramp without
   * also inheriting the colour-expression escape hatches, which do not apply to a number.
   */
  private zoomRamp(
    value: string | number,
    propertyType: 'color' | 'opacity' | 'width',
    minZoom: number,
    maxZoom: number
  ): unknown {
    if (propertyType === 'width') {
      // For width, interpolate from smaller to larger
      const minWidth = typeof value === 'number' ? value * 0.5 : 1;
      const maxWidth = typeof value === 'number' ? value * 2 : 6;

      return [
        'interpolate',
        ['exponential', 1.5],
        ['zoom'],
        minZoom,
        minWidth,
        maxZoom,
        maxWidth
      ];
    }

    if (propertyType === 'opacity') {
      // For opacity, can fade in/out with zoom
      const minOpacity =
        typeof value === 'number' ? Math.max(0, value - 0.3) : 0.3;
      const maxOpacity = typeof value === 'number' ? value : 1;

      return [
        'interpolate',
        ['linear'],
        ['zoom'],
        minZoom,
        minOpacity,
        maxZoom,
        maxOpacity
      ];
    }

    // For color, use step function for discrete changes
    const midZoom = (minZoom + maxZoom) / 2;
    return [
      'step',
      ['zoom'],
      value, // Default color
      midZoom,
      value // Could be enhanced to transition between colors
    ];
  }

  /**
   * Calculate similarity between two strings (simple Levenshtein-like score)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact match
    if (s1 === s2) return 1;

    // Substring match - high score if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
      const lengthRatio =
        Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
      return 0.7 + 0.2 * lengthRatio;
    }

    // Calculate common characters
    let common = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) common++;
    }

    return common / Math.max(s1.length, s2.length);
  }

  /**
   * Find the closest matching value for a field using intelligent matching
   */
  private findClosestFieldValue(
    fieldName: string,
    inputValue: string | number | boolean,
    validValues: readonly any[],
    sourceLayer?: string
  ): { value: any; corrected: boolean; message?: string } {
    // For non-string values, just check if it's valid
    if (typeof inputValue !== 'string') {
      const isValid = validValues.includes(inputValue);
      return {
        value: inputValue,
        corrected: false,
        message: isValid
          ? undefined
          : `Invalid ${fieldName} value: ${inputValue}. Valid values: ${validValues.slice(0, 10).join(', ')}${validValues.length > 10 ? '...' : ''}`
      };
    }

    // 1. Check for exact match (case-insensitive)
    const exactMatch = validValues.find(
      (v) =>
        typeof v === 'string' && v.toLowerCase() === inputValue.toLowerCase()
    );
    if (exactMatch) {
      return {
        value: exactMatch,
        corrected: exactMatch !== inputValue,
        message:
          exactMatch !== inputValue
            ? `Auto-corrected casing: "${inputValue}" → "${exactMatch}"`
            : undefined
      };
    }

    // 2. Try common variations (only if they result in a valid value)
    const variations = [
      inputValue.replace(/\s+/g, '_'), // spaces to underscores
      inputValue.replace(/\s+/g, '-'), // spaces to hyphens
      inputValue.replace(/_/g, '-'), // underscores to hyphens
      inputValue.replace(/-/g, '_'), // hyphens to underscores
      inputValue.replace(/[\s_-]+/g, '') // remove all separators
    ];

    for (const variation of variations) {
      const match = validValues.find(
        (v) =>
          typeof v === 'string' && v.toLowerCase() === variation.toLowerCase()
      );
      if (match) {
        return {
          value: match,
          corrected: true,
          message: `Auto-corrected: "${inputValue}" → "${match}"`
        };
      }
    }

    // 3. Find best match using similarity scoring
    const stringValues = validValues.filter(
      (v) => typeof v === 'string'
    ) as string[];
    if (stringValues.length > 0) {
      const scores = stringValues.map((v) => ({
        value: v,
        score: this.calculateSimilarity(inputValue, v)
      }));

      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);

      // If we have a good match (>70% similarity), use it
      if (scores[0].score > 0.7) {
        return {
          value: scores[0].value,
          corrected: true,
          message: `Auto-corrected: "${inputValue}" → "${scores[0].value}" (${Math.round(scores[0].score * 100)}% match)`
        };
      }

      // If we have a decent match (>50% similarity) and it's significantly better than the next one
      if (
        scores[0].score > 0.5 &&
        (!scores[1] || scores[0].score > scores[1].score * 1.5)
      ) {
        return {
          value: scores[0].value,
          corrected: true,
          message: `Auto-corrected: "${inputValue}" → "${scores[0].value}" (best guess)`
        };
      }
    }

    // 4. No good match found - check if this value exists in other fields
    // This helps when user specifies class:"golf_course" but it should be type:"golf_course"
    if (sourceLayer) {
      const layerFields = STREETS_V8_FIELDS[
        sourceLayer as keyof typeof STREETS_V8_FIELDS
      ] as any;
      if (layerFields) {
        // Check all other fields to see if this value exists there
        for (const [otherFieldName, otherFieldDef] of Object.entries(
          layerFields
        )) {
          if (otherFieldName === fieldName) continue; // Skip the current field
          if (!otherFieldDef || typeof otherFieldDef !== 'object') continue;
          if (
            !('values' in otherFieldDef) ||
            !Array.isArray((otherFieldDef as any).values)
          )
            continue;

          const otherValues = (otherFieldDef as any).values;
          const exactMatch = otherValues.find(
            (v: any) =>
              typeof v === 'string' &&
              v.toLowerCase() === inputValue.toLowerCase()
          );

          if (exactMatch) {
            return {
              value: inputValue,
              corrected: false,
              message: `ERROR: "${inputValue}" is not a valid ${fieldName} value. Did you mean ${otherFieldName}:"${exactMatch}"? Use filter_properties: {${otherFieldName}: "${exactMatch}"} instead.`
            };
          }
        }
      }
    }

    // 5. Really no match anywhere - return original with error message
    const suggestions = validValues.slice(0, 10).join(', ');
    return {
      value: inputValue,
      corrected: false,
      message: `Warning: "${inputValue}" is not a valid ${fieldName} value. Valid values include: ${suggestions}${validValues.length > 10 ? '...' : ''}`
    };
  }

  /**
   * Intelligently resolve filter properties by checking if they're field names or values
   */
  private resolveFilterProperty(
    sourceLayer: string,
    property: string,
    value: any
  ): {
    resolvedProperty: string;
    resolvedValue: any;
    correction?: string;
  } {
    const layerFields = STREETS_V8_FIELDS[
      sourceLayer as keyof typeof STREETS_V8_FIELDS
    ] as any;
    if (!layerFields) {
      return { resolvedProperty: property, resolvedValue: value };
    }

    // Case 1: Property is an actual field name in this layer (e.g., "toll", "oneway", "bike_lane")
    if (property in layerFields) {
      const fieldDef = layerFields[property];

      // Validate/correct the value for this field
      if (fieldDef && 'values' in fieldDef && Array.isArray(fieldDef.values)) {
        const result = this.findClosestFieldValue(
          property,
          value,
          fieldDef.values,
          sourceLayer
        );
        return {
          resolvedProperty: property,
          resolvedValue: result.value,
          correction: result.message
        };
      }
      return { resolvedProperty: property, resolvedValue: value };
    }

    // Case 2: Property might be a value that belongs to a field (e.g., "wetland" should be type: "wetland")
    // Priority order for searching fields
    const fieldPriority = [
      'type',
      'class',
      'maki',
      'structure',
      'surface',
      'mode',
      'stop_type'
    ];

    // First, try the priority fields
    for (const fieldName of fieldPriority) {
      const fieldDef = layerFields[fieldName];
      if (
        !fieldDef ||
        !('values' in fieldDef) ||
        !Array.isArray(fieldDef.values)
      )
        continue;

      // Check if our property name matches a value in this field
      for (const validValue of fieldDef.values) {
        if (
          String(validValue).toLowerCase() === String(property).toLowerCase()
        ) {
          return {
            resolvedProperty: fieldName,
            resolvedValue: validValue,
            correction: `Interpreted "${property}" as ${fieldName}="${validValue}"`
          };
        }
      }

      // Check for partial matches
      for (const validValue of fieldDef.values) {
        const propLower = String(property).toLowerCase();
        const valLower = String(validValue).toLowerCase();
        if (valLower.includes(propLower) || propLower.includes(valLower)) {
          return {
            resolvedProperty: fieldName,
            resolvedValue: validValue,
            correction: `Interpreted "${property}" as ${fieldName}="${validValue}" (partial match)`
          };
        }
      }
    }

    // Case 3: Search all other fields if no match in priority fields
    for (const [fieldName, fieldDef] of Object.entries(layerFields)) {
      if (fieldPriority.includes(fieldName)) continue; // Already checked
      if (!fieldDef || typeof fieldDef !== 'object') continue;
      if (!('values' in fieldDef) || !Array.isArray((fieldDef as any).values))
        continue;

      const values = (fieldDef as any).values;
      for (const validValue of values) {
        if (
          String(validValue).toLowerCase() === String(property).toLowerCase()
        ) {
          return {
            resolvedProperty: fieldName,
            resolvedValue: validValue,
            correction: `Interpreted "${property}" as ${fieldName}="${validValue}"`
          };
        }
      }
    }

    // Case 4: No match found - keep original but warn
    return {
      resolvedProperty: property,
      resolvedValue: value,
      correction: `Warning: "${property}" not found as field or value in ${sourceLayer} layer`
    };
  }

  private buildAdvancedFilter(
    sourceLayer: string,
    filterConfig: Record<
      string,
      string | number | boolean | (string | number | boolean)[]
    >
  ): { filter: Filter | null; corrections: string[] } {
    const filters: unknown[] = [];
    const corrections: string[] = [];

    // Get field definitions for this source layer
    const layerFields =
      STREETS_V8_FIELDS[sourceLayer as keyof typeof STREETS_V8_FIELDS];
    if (!layerFields) return { filter: null, corrections: [] };

    // Resolve each property to determine if it's a field name or value
    const resolvedConfig: Record<string, any> = {};

    for (const [property, value] of Object.entries(filterConfig)) {
      if (value === undefined || value === null) continue;

      const resolved = this.resolveFilterProperty(sourceLayer, property, value);

      if (resolved.correction) {
        corrections.push(resolved.correction);
      }

      // Accumulate values for the same property
      if (resolvedConfig[resolved.resolvedProperty]) {
        // If we already have this property, combine values into array
        const existing = resolvedConfig[resolved.resolvedProperty];
        if (Array.isArray(existing)) {
          existing.push(resolved.resolvedValue);
        } else {
          resolvedConfig[resolved.resolvedProperty] = [
            existing,
            resolved.resolvedValue
          ];
        }
      } else {
        resolvedConfig[resolved.resolvedProperty] = resolved.resolvedValue;
      }
    }

    // Now build filters from resolved config
    for (const [property, value] of Object.entries(resolvedConfig)) {
      if (value === undefined || value === null) continue;

      const fieldDef = layerFields[property as keyof typeof layerFields] as any;

      // Special handling for toll property - it's a presence check, not a value check
      // The toll field only has 'true' when present, otherwise it's not in the data
      if (
        property === 'toll' &&
        (value === true || value === 'true' || value === 1 || value === '1')
      ) {
        // Use "has" expression to check if toll property exists
        filters.push(['has', 'toll']);
        continue;
      }

      if (!fieldDef) {
        console.warn(
          `Warning: Field "${property}" does not exist in layer "${sourceLayer}". Skipping filter.`
        );
        continue;
      }

      // Check if this field uses string booleans by looking at its defined values
      const isStringBooleanField =
        fieldDef &&
        'values' in fieldDef &&
        Array.isArray(fieldDef.values) &&
        fieldDef.values.length > 0 &&
        (fieldDef.values.includes('true') || fieldDef.values.includes('false'));

      // Convert values for properties that expect string booleans
      let processedValue = value;
      if (isStringBooleanField) {
        if (Array.isArray(value)) {
          processedValue = value.map((v) => {
            // Handle all truthy values
            if (v === true || v === 1 || v === '1' || v === 'true')
              return 'true';
            // Handle all falsy values
            if (v === false || v === 0 || v === '0' || v === 'false')
              return 'false';
            return String(v);
          });
        } else {
          // Handle all truthy values
          if (
            value === true ||
            value === 1 ||
            value === '1' ||
            value === 'true'
          ) {
            processedValue = 'true';
          } else if (
            value === false ||
            value === 0 ||
            value === '0' ||
            value === 'false'
          ) {
            processedValue = 'false';
          } else {
            processedValue = String(value);
          }
        }
      }

      // Validate and auto-correct values against defined values
      if (
        fieldDef &&
        'values' in fieldDef &&
        Array.isArray(fieldDef.values) &&
        fieldDef.values.length > 0
      ) {
        const validValues = fieldDef.values;

        if (Array.isArray(processedValue)) {
          // For arrays, validate and correct each value
          const correctedValues = [];
          for (const val of processedValue) {
            const result = this.findClosestFieldValue(
              property,
              val,
              validValues,
              sourceLayer
            );
            if (result.message) {
              // If it's a critical error (wrong field), we should stop and guide the model
              if (result.message.startsWith('ERROR:')) {
                corrections.push(result.message);
                // Don't continue with invalid filter - return early
                return { filter: null, corrections: [result.message] };
              }
              corrections.push(`  ${property}: ${result.message}`);
            }
            correctedValues.push(result.value);
          }
          processedValue = correctedValues;
        } else {
          // For single values, validate and correct
          const result = this.findClosestFieldValue(
            property,
            processedValue,
            validValues,
            sourceLayer
          );
          if (result.message) {
            // If it's a critical error (wrong field), we should stop and guide the model
            if (result.message.startsWith('ERROR:')) {
              corrections.push(result.message);
              // Don't continue with invalid filter - return early
              return { filter: null, corrections: [result.message] };
            }
            corrections.push(`  ${property}: ${result.message}`);
          }
          processedValue = result.value;
        }
      }

      // Use Mapbox Studio's match format for all property filters
      // For presence-based fields like 'toll', we already handled them above
      if (Array.isArray(processedValue) && processedValue.length > 0) {
        // Array of values - use as is
        filters.push(['match', ['get', property], processedValue, true, false]);
      } else if (processedValue !== undefined && processedValue !== null) {
        // Single value - wrap in array for consistent match format
        filters.push([
          'match',
          ['get', property],
          [processedValue],
          true,
          false
        ]);
      }
    }

    const filter =
      filters.length === 0
        ? null
        : filters.length === 1
          ? (filters[0] as Filter)
          : (['all', ...filters] as Filter);

    return { filter, corrections };
  }

  private generateComprehensiveFilter(
    config: StyleBuilderToolInput['layers'][0],
    layerDef: DynamicLayerDefinition | null
  ): { filter: Filter | null; corrections: string[] } {
    // If custom filter is provided, process it through buildAdvancedFilter
    if (
      config.filter &&
      typeof config.filter === 'object' &&
      !Array.isArray(config.filter)
    ) {
      // It's a simple object like {type: 'wetland'}, process it
      if (layerDef && 'sourceLayer' in layerDef && layerDef.sourceLayer) {
        return this.buildAdvancedFilter(
          layerDef.sourceLayer,
          config.filter as Record<
            string,
            string | number | boolean | (string | number | boolean)[]
          >
        );
      }
    } else if (config.filter && Array.isArray(config.filter)) {
      // It's already a Mapbox expression, use it as-is
      return { filter: config.filter as Filter, corrections: [] };
    }

    const filters: Filter[] = [];
    const allCorrections: string[] = [];

    // Add filter_properties if provided
    if (
      config.filter_properties &&
      layerDef &&
      'sourceLayer' in layerDef &&
      layerDef.sourceLayer
    ) {
      const result = this.buildAdvancedFilter(
        layerDef.sourceLayer,
        config.filter_properties
      );
      if (result.filter) {
        filters.push(result.filter);
      }
      if (result.corrections.length > 0) {
        allCorrections.push(...result.corrections);
      }
    }

    // Combine filters if there are multiple
    const filter =
      filters.length === 0
        ? null
        : filters.length === 1
          ? filters[0]
          : (['all', ...filters] as Filter);

    return { filter, corrections: allCorrections };
  }

  private isRoadLayer(layerType: string): boolean {
    return [
      'roads',
      'motorways',
      'primary_roads',
      'secondary_roads',
      'streets',
      'paths',
      'railways'
    ].includes(layerType);
  }

  private getDefaultLineWidth(
    layerType: string,
    isHighlight: boolean = false
  ): unknown | null {
    // Reasonable default line widths with zoom interpolation
    const roadWidths: Record<string, unknown> = {
      roads: [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        0.6,
        10,
        1.9,
        14,
        3.8,
        18,
        5.0
      ],
      motorways: [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        1.0,
        10,
        2.5,
        14,
        4.4,
        18,
        6.3
      ],
      primary_roads: [
        'interpolate',
        ['linear'],
        ['zoom'],
        7,
        0.8,
        11,
        1.9,
        14,
        3.1,
        18,
        4.4
      ],
      secondary_roads: [
        'interpolate',
        ['linear'],
        ['zoom'],
        10,
        0.6,
        12,
        1.3,
        14,
        2.5,
        18,
        3.1
      ],
      streets: [
        'interpolate',
        ['linear'],
        ['zoom'],
        12,
        0.4,
        14,
        1.0,
        16,
        1.9,
        18,
        2.5
      ],
      paths: [
        'interpolate',
        ['linear'],
        ['zoom'],
        13,
        0.5,
        15,
        0.8,
        17,
        1.0,
        19,
        1.2
      ],
      railways: [
        'interpolate',
        ['linear'],
        ['zoom'],
        8,
        0.8,
        12,
        1.2,
        16,
        1.8,
        20,
        2.5
      ],
      waterway: [
        'interpolate',
        ['exponential', 1.3],
        ['zoom'],
        8,
        1.0,
        20,
        4.0
      ],
      // Administrative boundaries - thinner
      country_boundaries: [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        0.5,
        4,
        0.8,
        8,
        1.2,
        12,
        1.5,
        16,
        1.8
      ],
      state_boundaries: [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        0.3,
        6,
        0.6,
        10,
        1.0,
        14,
        1.3,
        18,
        1.5
      ]
    };

    // If highlighting, slightly increase the widths
    if (isHighlight && roadWidths[layerType]) {
      const baseExpression = roadWidths[layerType] as unknown[];
      const modifiedExpression = [...baseExpression];
      // Increase each width value by 20%
      for (let i = 0; i < modifiedExpression.length; i++) {
        if (typeof modifiedExpression[i] === 'number' && i % 2 === 0 && i > 3) {
          modifiedExpression[i] = (modifiedExpression[i] as number) * 1.2;
        }
      }
      return modifiedExpression;
    }

    return roadWidths[layerType] || null;
  }

  private getDefaultOpacity(layerType: string, layerDefType: string): number {
    // Symbol layers should always be fully opaque for readability
    if (layerDefType === 'symbol') {
      return 1.0;
    }

    // Layer-specific opacity for better visual hierarchy
    const opacityMap: Record<string, number> = {
      water: 0.85,
      waterway: 0.75,
      parks: 0.65,
      landuse: 0.45,
      motorways: 0.85,
      primary_roads: 0.75,
      secondary_roads: 0.65,
      streets: 0.55,
      paths: 0.45,
      railways: 0.7,
      roads: 0.6,
      buildings: 0.6,
      building_3d: 0.7,
      country_boundaries: 0.5,
      state_boundaries: 0.4,
      airports: 0.7,
      transit: 0.75,
      place_labels: 1.0,
      road_labels: 1.0,
      poi_labels: 1.0
    };

    return opacityMap[layerType] || 0.7;
  }

  private getLayerTypeProperties(
    layerType:
      | 'fill'
      | 'line'
      | 'symbol'
      | 'circle'
      | 'fill-extrusion'
      | 'heatmap'
  ) {
    const properties: {
      paintProperties: Array<{
        property: string;
        description: string;
        example: any;
      }>;
      layoutProperties?: Array<{
        property: string;
        description: string;
        example: any;
      }>;
    } = { paintProperties: [] };

    switch (layerType) {
      case 'line':
        properties.paintProperties = [
          {
            property: 'line-color',
            description: 'Line color',
            example: '#000000'
          },
          { property: 'line-width', description: 'Line width', example: 2 },
          {
            property: 'line-opacity',
            description: 'Line opacity',
            example: 0.8
          },
          {
            property: 'line-dasharray',
            description: 'Dash pattern',
            example: [2, 2]
          },
          { property: 'line-gap-width', description: 'Gap width', example: 0 }
        ];
        break;
      case 'fill':
        properties.paintProperties = [
          {
            property: 'fill-color',
            description: 'Fill color',
            example: '#000000'
          },
          {
            property: 'fill-opacity',
            description: 'Fill opacity',
            example: 0.5
          },
          {
            property: 'fill-outline-color',
            description: 'Outline color',
            example: '#000000'
          }
        ];
        break;
      case 'fill-extrusion':
        properties.paintProperties = [
          {
            property: 'fill-extrusion-color',
            description: 'Extrusion color',
            example: '#AAAAAA'
          },
          {
            property: 'fill-extrusion-height',
            description: 'Extrusion height',
            example: ['get', 'height']
          },
          {
            property: 'fill-extrusion-base',
            description: 'Extrusion base',
            example: ['get', 'min_height']
          },
          {
            property: 'fill-extrusion-opacity',
            description: 'Extrusion opacity',
            example: 0.8
          }
        ];
        break;
      case 'circle':
        properties.paintProperties = [
          {
            property: 'circle-radius',
            description: 'Circle radius',
            example: 5
          },
          {
            property: 'circle-color',
            description: 'Circle color',
            example: '#007cbf'
          },
          {
            property: 'circle-opacity',
            description: 'Circle opacity',
            example: 0.8
          },
          {
            property: 'circle-stroke-color',
            description: 'Circle stroke color',
            example: '#000000'
          },
          {
            property: 'circle-stroke-width',
            description: 'Circle stroke width',
            example: 1
          }
        ];
        break;
      case 'symbol':
        properties.paintProperties = [
          {
            property: 'text-color',
            description: 'Text color',
            example: '#000000'
          },
          {
            property: 'text-halo-color',
            description: 'Text halo color',
            example: '#FFFFFF'
          },
          {
            property: 'text-halo-width',
            description: 'Text halo width',
            example: 1
          },
          { property: 'icon-opacity', description: 'Icon opacity', example: 1 }
        ];
        properties.layoutProperties = [
          {
            property: 'text-field',
            description: 'Text content',
            example: ['get', 'name']
          },
          {
            property: 'text-font',
            description: 'Font stack',
            example: ['DIN Pro Medium', 'Arial Unicode MS Regular']
          },
          { property: 'text-size', description: 'Text size', example: 14 },
          {
            property: 'icon-image',
            description: 'Icon sprite name',
            example: 'marker-15'
          }
        ];
        break;
      case 'heatmap':
        properties.paintProperties = [
          {
            property: 'heatmap-weight',
            description: 'Point weight',
            example: 1
          },
          {
            property: 'heatmap-intensity',
            description: 'Intensity',
            example: 1
          },
          {
            property: 'heatmap-radius',
            description: 'Influence radius',
            example: 30
          },
          {
            property: 'heatmap-opacity',
            description: 'Layer opacity',
            example: 0.7
          }
        ];
        break;
    }

    return properties;
  }

  private createDynamicLayerDefinition(
    layerType: string,
    config?: StyleBuilderToolInput['layers'][0]
  ) {
    // Check if this layer type exists as a source-layer
    // No conversion needed - source-layer names already use underscores
    const sourceLayer = layerType;

    // Check if this source-layer exists in STREETS_V8_FIELDS or our geometry mapping
    const hasInStreetsV8 = sourceLayer in STREETS_V8_FIELDS;
    const hasInGeometry = sourceLayer in SOURCE_LAYER_GEOMETRY;

    if (!hasInStreetsV8 && !hasInGeometry) {
      return null;
    }

    // Get geometry type from our hardcoded mapping
    const geometry = SOURCE_LAYER_GEOMETRY[sourceLayer];
    if (!geometry) {
      // Source-layer exists in STREETS_V8_FIELDS but not in our geometry mapping
      return null;
    }

    // Determine layer type based on render_type override or geometry
    let type:
      | 'fill'
      | 'line'
      | 'symbol'
      | 'circle'
      | 'fill-extrusion'
      | 'heatmap';
    let paintProperties: Array<{
      property: string;
      description: string;
      example: any;
    }> = [];
    let layoutProperties:
      | Array<{
          property: string;
          description: string;
          example: any;
        }>
      | undefined;

    // Check if render_type is explicitly specified and not 'auto'
    if (config?.render_type && config.render_type !== 'auto') {
      // Use the explicitly specified render type
      type = config.render_type;
      const properties = this.getLayerTypeProperties(type);
      paintProperties = properties.paintProperties;
      layoutProperties = properties.layoutProperties;
    } else {
      // Auto-detect based on geometry
      switch (geometry) {
        case 'Polygon': {
          // Special case for buildings with 3D
          if (sourceLayer === 'building' && layerType.includes('3d')) {
            type = 'fill-extrusion';
          } else {
            type = 'fill';
          }
          const polygonProps = this.getLayerTypeProperties(type);
          paintProperties = polygonProps.paintProperties;
          layoutProperties = polygonProps.layoutProperties;
          break;
        }

        case 'LineString': {
          // Admin boundaries and natural features are often rendered as lines
          type = 'line';
          const lineProps = this.getLayerTypeProperties(type);
          paintProperties = lineProps.paintProperties;
          layoutProperties = lineProps.layoutProperties;
          break;
        }

        case 'Point': {
          // Points can be either circle or symbol layers
          // Labels and text-based layers should be symbols
          if (
            sourceLayer.includes('label') ||
            sourceLayer === 'motorway_junction'
          ) {
            type = 'symbol';
            const symbolProps = this.getLayerTypeProperties(type);
            paintProperties = symbolProps.paintProperties;
            layoutProperties = symbolProps.layoutProperties;
          } else {
            // Default to circle for point features without labels
            type = 'circle';
            const circleProps = this.getLayerTypeProperties(type);
            paintProperties = circleProps.paintProperties;
            layoutProperties = circleProps.layoutProperties;
          }
          break;
        }

        default: {
          // Fallback to fill for unknown geometry
          type = 'fill';
          const defaultProps = this.getLayerTypeProperties(type);
          paintProperties = defaultProps.paintProperties;
          layoutProperties = defaultProps.layoutProperties;
        }
      }
    }

    return {
      id: sourceLayer, // Use source-layer name as the id
      type: type,
      sourceLayer: sourceLayer,
      description: `${sourceLayer} layer (${geometry} geometry)`,
      paintProperties,
      layoutProperties,
      commonFilters: []
    };
  }

  private getHarmoniousColor(layerType: string, action: string): string {
    // Define sensible default colors for common layer types
    const colorPalette: Record<string, string> = {
      motorways: '#ff6600',
      primary_roads: '#ff9933',
      secondary_roads: '#ffaa66',
      streets: '#999999',
      paths: '#666666',
      railways: '#555555',
      roads: '#888888',
      water: '#4A90E2',
      waterway: '#5BA0F2',
      parks: '#90C090',
      landuse: '#A0D0A0',
      country_boundaries: '#9966CC',
      state_boundaries: '#B399D4',
      place_labels: '#333333',
      road_labels: '#444444',
      poi_labels: '#555555',
      buildings: '#D4C4B0',
      building_3d: '#C4B4A0',
      airports: '#CC99CC',
      transit: '#6699CC',
      default: '#808080',
      highlight: '#FF6B6B'
    };

    if (action === 'highlight') {
      // Highlight colors are more saturated
      const highlightColors: Record<string, string> = {
        motorways: '#ff3300',
        roads: '#ff6633',
        water: '#2E7BC7',
        parks: '#70A070',
        buildings: '#B8A090'
      };
      return highlightColors[layerType] || colorPalette.highlight;
    }

    return colorPalette[layerType] || colorPalette.default;
  }
}
