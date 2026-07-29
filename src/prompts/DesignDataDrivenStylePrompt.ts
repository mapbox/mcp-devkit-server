// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt, type PromptArgument } from './BasePrompt.js';

/**
 * Prompt for creating data-driven map styles with dynamic properties
 *
 * This prompt guides users through creating styles that respond to data properties:
 * 1. Understand the data structure and available properties
 * 2. Choose appropriate data-driven styling approach
 * 3. Design expressions for colors, sizes, and other properties
 * 4. Create the style with data-driven layers
 * 5. Test and preview the result
 */
export class DesignDataDrivenStylePrompt extends BasePrompt {
  readonly name = 'design-data-driven-style';
  readonly description =
    'Create a map style with data-driven properties that respond dynamically to feature data. Guides you through expressions, color scales, and property-based styling.';

  readonly arguments: ReadonlyArray<PromptArgument> = [
    {
      name: 'style_name',
      description: 'Name for the data-driven style',
      required: true
    },
    {
      name: 'data_description',
      description:
        'Description of the data (e.g., "population by city", "earthquake magnitudes", "property prices")',
      required: true
    },
    {
      name: 'property_name',
      description:
        'Name of the data property to visualize (e.g., "population", "magnitude", "price")',
      required: true
    },
    {
      name: 'visualization_type',
      description:
        'How to visualize: "color" (choropleth), "size" (proportional symbols), "both", "heatmap" (default: "color")',
      required: false
    },
    {
      name: 'color_scheme',
      description:
        'Color scheme: "sequential" (low to high), "diverging" (two extremes), "categorical" (distinct categories) (default: "sequential")',
      required: false
    }
  ];

  getMessages(args: Record<string, string>): PromptMessage[] {
    const styleName = args['style_name'];
    const dataDescription = args['data_description'];
    const propertyName = args['property_name'];
    const visualizationType = args['visualization_type'] || 'color';
    const colorScheme = args['color_scheme'] || 'sequential';

    let instructionText = `Create a data-driven map style: "${styleName}"

Data: ${dataDescription}
Property to visualize: ${propertyName}
Visualization type: ${visualizationType}
Color scheme: ${colorScheme}

This workflow will guide you through creating a map style with dynamic, data-driven properties.

## Step 1: Understand Data-Driven Styling

Data-driven styling in Mapbox uses **expressions** to calculate property values based on feature data.

**Expression types:**
- \`["get", "${propertyName}"]\` - Get a feature property value
- \`["interpolate", ...]\` - Smoothly transition between values
- \`["step", ...]\` - Discrete steps/breaks in values
- \`["match", ...]\` - Match specific values (for categories)
- \`["case", ...]\` - Conditional logic

## Step 2: Choose Your Data-Driven Approach

Based on your requirements (${visualizationType} visualization with ${colorScheme} colors):

`;

    if (visualizationType === 'color' || visualizationType === 'both') {
      if (colorScheme === 'sequential') {
        instructionText += `### Color by Value (Sequential)

Use color to show values from low to high:

\`\`\`json
{
  "type": "fill",
  "slot": "bottom",
  "paint": {
    "fill-color": [
      "interpolate",
      ["linear"],
      ["get", "${propertyName}"],
      0, "#f7fbff",      // Low values: light blue
      25, "#6baed6",     // Medium-low: medium blue
      50, "#3182bd",     // Medium: darker blue
      75, "#08519c",     // Medium-high: deep blue
      100, "#08306b"     // High values: darkest blue
    ],
    "fill-opacity": 0.7,
    "fill-emissive-strength": 1
  }
}
\`\`\`

**Adjust the breakpoints** (0, 25, 50, 75, 100) based on your actual data range.

**Why \`slot\` and \`fill-emissive-strength\` are there** (Standard styles):
- \`"slot": "bottom"\` keeps the choropleth above land and water but **below roads and labels**, so the
  basemap stays readable through it. With no slot the layer lands above every basemap layer, street
  labels included. Use \`"middle"\` for zone/geofence overlays that should sit above roads.
- \`"fill-emissive-strength": 1\` holds the fill at its authored color under \`dusk\` and \`night\`. It
  defaults to \`0\`, letting the scene light the layer — so it falls into shadow and goes nearly
  invisible on a night map.

`;
      } else if (colorScheme === 'diverging') {
        instructionText += `### Color by Value (Diverging)

Use two colors to show deviation from a midpoint:

\`\`\`json
{
  "type": "fill",
  "slot": "bottom",
  "paint": {
    "fill-color": [
      "interpolate",
      ["linear"],
      ["get", "${propertyName}"],
      0, "#b2182b",      // Low values: dark red
      25, "#ef8a62",     // Below average: salmon
      50, "#f7f7f7",     // Average: near-white midpoint
      75, "#67a9cf",     // Above average: light blue
      100, "#2166ac"     // High values: dark blue
    ],
    "fill-opacity": 0.7,
    "fill-emissive-strength": 1
  }
}
\`\`\`

**Use when**: Showing deviation from a norm (e.g., temperature above/below average).

**This is ColorBrewer RdBu, not red→green, deliberately.** A red→yellow→green ramp (RdYlGn, the
"traffic light") is the most common colorblind failure in data visualization: roughly 1 in 12 men
cannot separate its endpoints, so the two extremes carrying all the meaning collapse together. Use
**RdBu**, **PuOr**, or **BrBG** for diverging data — all keep their endpoints distinct under
deuteranopia and protanopia. Put the neutral color at your data's actual midpoint, not at the
middle of the number range.

`;
      } else if (colorScheme === 'categorical') {
        instructionText += `### Color by Category

Use distinct colors for different categories:

\`\`\`json
{
  "type": "fill",
  "slot": "bottom",
  "paint": {
    "fill-color": [
      "match",
      ["get", "${propertyName}"],
      "category1", "#e41a1c",  // Red
      "category2", "#377eb8",  // Blue
      "category3", "#4daf4a",  // Green
      "category4", "#984ea3",  // Purple
      "category5", "#ff7f00",  // Orange
      "#999999"                // Default: gray
    ],
    "fill-opacity": 0.7,
    "fill-emissive-strength": 1
  }
}
\`\`\`

**Replace** "category1", "category2", etc. with your actual category values. Always keep the final
fallback color — a \`match\` without one drops features whose value you didn't anticipate.

This is ColorBrewer Set1, a qualitative palette. Red and green together is fine in a *categorical*
palette: the categories are unordered and each gets a legend entry. What to avoid is red→green as a
*ramp*, where the reader must judge position along a scale by hue alone. Keep categorical palettes
to 8 colors or fewer; past that they stop being tellable apart.

`;
      }
    }

    if (visualizationType === 'size' || visualizationType === 'both') {
      instructionText += `### Size by Value (Proportional Symbols)

Use circle size to represent magnitude:

\`\`\`json
{
  "type": "circle",
  "slot": "middle",
  "paint": {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "${propertyName}"],
      0, 5,              // Low values: small circles (5px)
      25, 10,            // Medium-low: 10px
      50, 15,            // Medium: 15px
      75, 20,            // Medium-high: 20px
      100, 30            // High values: large circles (30px)
    ],
    "circle-color": "#3182bd",
    "circle-opacity": 0.6,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#ffffff",
    "circle-emissive-strength": 1
  }
}
\`\`\`

\`circle-emissive-strength\` is the one most often left out, because circles are usually the
foreground data — cluster bubbles, proportional symbols, user-location dots. It defaults to \`0\`
like fill and line, so a bubble map that looks right at \`day\` dims out at \`night\`.

**Scale circles by area, not radius.** Fed straight into \`circle-radius\`, a value of 100 looks ~4x
wider than 25 rather than 4x in area, so large values read as wildly exaggerated. Interpolate on
\`["sqrt", ["get", "${propertyName}"]]\` when the circle encodes magnitude proportionally.

`;
    }

    if (visualizationType === 'heatmap') {
      instructionText += `### Heatmap Visualization

Show density and intensity using a heatmap:

\`\`\`json
{
  "type": "heatmap",
  "slot": "middle",
  "paint": {
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "${propertyName}"],
      0, 0,
      100, 1
    ],
    "heatmap-intensity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0, 1,
      9, 3
    ],
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0, "rgba(33,102,172,0)",
      0.2, "rgb(103,169,207)",
      0.4, "rgb(209,229,240)",
      0.6, "rgb(253,219,199)",
      0.8, "rgb(239,138,98)",
      1, "rgb(178,24,43)"
    ],
    "heatmap-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0, 2,
      9, 20
    ]
  }
}
\`\`\`

There is no \`heatmap-emissive-strength\` — heatmap layers aren't lit by the scene, so they hold their
color across all four presets on their own. Don't invent it; \`validate_style_tool\` will reject it.

**\`heatmap-radius\` must grow with zoom**, as it does above. Radius is in screen pixels, so a fixed
value covers far more ground when zoomed out — a heatmap that reads correctly at z9 becomes one
undifferentiated blob at z2.

`;
    }

    instructionText += `## Step 3: Understand Your Data Range

Before finalizing the style, you need to know:
1. **Minimum value** in your dataset for "${propertyName}"
2. **Maximum value** in your dataset for "${propertyName}"
3. **Typical distribution** (are most values low, high, or evenly distributed?)

**If you have GeoJSON data:**
- You can provide it to validate_geojson_tool or visualize_geojson_tool
- These tools will show you the data structure and property values

**If using Mapbox tilesets:**
- Read \`resource://mapbox-streets-v8-fields\` to see available fields
- Review typical value ranges in the documentation

## Step 4: Create the Style

Now create the data-driven style:

1. **Start with a base style**
   - Use style_builder_tool with \`base_style: "standard"\` — Mapbox Standard is the default for new styles
   - The tool takes structured parameters, not a description: \`base_style\`, \`standard_config\`,
     \`custom_sources\` and a \`layers\` array
   - **Quiet the basemap through \`standard_config\`, not by deleting layers.** A data map needs the
     basemap to recede: set \`theme: "faded"\` or \`"monochrome"\` and turn off what competes with your
     data (\`showPointOfInterestLabels: false\`, \`show3dObjects: false\`). Biggest readability win for
     a choropleth, at the cost of one config property.
   - For a dark data map set \`lightPreset: "night"\` — not \`dark-v11\`, and not hand-authored dark
     colors. Your own layers do *not* follow the preset, which is why they need emissive strength \`1\`.

2. **Add your data source through \`custom_sources\`**
   - Declare it in the same style_builder_tool call, keyed by an id your layer then references
     with \`source_id\`. Don't hand-author the \`sources\` block: layers built this way get their
     slot, emissive strength and (on lines) \`line-occlusion-opacity\` set for you, which is
     exactly what gets lost when the JSON is written by hand.
   \`\`\`json
   "custom_sources": {
     "data": { "type": "geojson", "data": "YOUR_GEOJSON_URL_OR_INLINE_FEATURECOLLECTION" }
   }
   \`\`\`
   - For a Mapbox tileset use \`{ "type": "vector", "url": "mapbox://your.tileset" }\`, and set
     \`source_layer\` on the layer — the layer name inside the tileset.

3. **Add your data-driven layer**
   - Point it at the source with \`source_id\`, and set \`render_type\` explicitly — it is required
     for your own data, because geometry cannot be inferred from a URL or a tileset
   - Use the expression examples from Step 2
   - Adjust breakpoints based on your actual data range
   - Choose appropriate layer type (fill, circle, heatmap, etc.)
   - **Set \`slot: "bottom"\` on a choropleth.** The builder's default for your own data is
     \`middle\` — right for a zone or geofence overlay, wrong for a fill that encodes a value,
     which wants the road network reading over it. The builder reports the slot it inferred, so
     check that line if you left it off.

4. **Create the style**
   - Use create_style_tool with:
     * name: "${styleName}"
     * The style JSON you've built with data-driven properties

## Step 5: Advanced Expressions (Optional)

For more sophisticated styling:

### Zoom-Based + Data-Driven

Combine zoom level with data properties:

\`\`\`json
{
  "circle-radius": [
    "interpolate",
    ["linear"],
    ["zoom"],
    5, [
      "interpolate",
      ["linear"],
      ["get", "${propertyName}"],
      0, 2,
      100, 8
    ],
    10, [
      "interpolate",
      ["linear"],
      ["get", "${propertyName}"],
      0, 5,
      100, 20
    ]
  ]
}
\`\`\`

### Conditional Styling

Apply different styles based on conditions:

\`\`\`json
{
  "fill-color": [
    "case",
    ["<", ["get", "${propertyName}"], 10], "#fee5d9",  // Low
    ["<", ["get", "${propertyName}"], 50], "#fcae91",  // Medium
    ["<", ["get", "${propertyName}"], 100], "#fb6a4a", // High
    "#de2d26"                                           // Very high
  ]
}
\`\`\`

### Text Labels with Data

Show property values as labels:

\`\`\`json
{
  "type": "symbol",
  "layout": {
    "text-field": [
      "concat",
      ["to-string", ["get", "${propertyName}"]],
      " units"
    ],
    "text-size": 12
  }
}
\`\`\`

## Step 6: Test and Preview

1. **Generate preview**
   - Use preview_style_tool with the style ID
   - Check that colors/sizes reflect the data appropriately
   - Verify the visualization is readable at different zoom levels

2. **Iterate if needed**
   - Adjust breakpoints if colors/sizes don't match data well
   - Try different color schemes if readability is poor
   - Consider adding labels or legends

## Step 7: Best Practices Summary

✅ **DO:**
- Use interpolate for smooth transitions (continuous data)
- Use step for clear breaks (ranked/classified data)
- Use match for categorical data, always with a fallback color
- Give every custom layer an explicit \`slot\` — \`bottom\` for choropleths, \`middle\` for overlays,
  routes and custom POI layers, \`top\` for markers and active selections
- Set emissive strength \`1\` on every fill, line, and circle layer you add
- Add \`line-occlusion-opacity\` to routes so 3D buildings don't hide them
- Quiet the basemap via \`standard_config\` (\`theme: "faded"\`, POI labels off) before restyling data
- Test at different zoom levels, and at the \`night\` light preset as well as \`day\`
- Ensure color contrasts are accessible (4.5:1 ratio)
- Document your data property names and ranges

❌ **DON'T:**
- Use too many color breaks (5-7 is usually enough)
- Rely solely on color (add patterns or sizes for accessibility)
- **Use red→green ramps for ordered data** (RdYlGn / "traffic light") — the most common colorblind
  failure. Use RdBu, PuOr, or BrBG for diverging data instead
- **Use rainbow ramps for ordered data** — hue has no natural order, so readers can't tell which end
  is "more" without the legend, and the bands imply breaks that aren't in the data. Use a single- or
  multi-hue sequential ramp
- Omit \`slot\` and let a data layer land above the street labels
- Leave fill/line/circle emissive strength at \`0\` and ship a map that goes blank at night
- Cap \`fill-opacity\` so low that a data-driven ramp can never reach full strength
- Forget to handle null/undefined property values

## Step 8: Validate the Style

After creating your data-driven style, automatically run validation:

1. **Run validation:**
   - Use the prepare-style-for-production prompt
   - Pass the style ID as the style_id_or_json parameter
   - Data-driven styles use complex expressions that benefit from validation
   - This checks:
     * Expression syntax and type correctness
     * Color contrast for accessibility (WCAG AA)
     * Overall style optimization
   - Validation is fast (offline processing only)

2. **Present validation results:**
   - Include validation summary with the preview:
     * ✅ Issues found or "Style is production-ready"
     * Expression validation status (critical for data-driven styles)
     * Accessibility compliance (WCAG AA)
     * Optimization recommendations
   - This ensures your expressions work correctly with real data

3. **Note for users:**
   - Validation runs automatically to catch issues early
   - For quick prototypes, warnings can be addressed later
   - Complex nested expressions especially benefit from validation

## Step 9: Documentation

For more information on expressions:
- Read \`resource://mapbox-style-layers\` for style spec reference
- Search for "expressions" in the Mapbox documentation
- Review expression examples for your use case

---

Begin creating your data-driven style now. Follow the steps systematically and present the resulting style to the user.`;

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: instructionText
        }
      }
    ];
  }
}
