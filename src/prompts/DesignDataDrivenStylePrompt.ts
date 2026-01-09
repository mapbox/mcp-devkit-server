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
    "fill-opacity": 0.7
  }
}
\`\`\`

**Adjust the breakpoints** (0, 25, 50, 75, 100) based on your actual data range.

`;
      } else if (colorScheme === 'diverging') {
        instructionText += `### Color by Value (Diverging)

Use two colors to show deviation from a midpoint:

\`\`\`json
{
  "type": "fill",
  "paint": {
    "fill-color": [
      "interpolate",
      ["linear"],
      ["get", "${propertyName}"],
      0, "#d7191c",      // Low values: red
      25, "#fdae61",     // Below average: orange
      50, "#ffffbf",     // Average: yellow
      75, "#a6d96a",     // Above average: light green
      100, "#1a9641"     // High values: green
    ],
    "fill-opacity": 0.7
  }
}
\`\`\`

**Use when**: Showing deviation from a norm (e.g., temperature above/below average).

`;
      } else if (colorScheme === 'categorical') {
        instructionText += `### Color by Category

Use distinct colors for different categories:

\`\`\`json
{
  "type": "fill",
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
    "fill-opacity": 0.7
  }
}
\`\`\`

**Replace** "category1", "category2", etc. with your actual category values.

`;
      }
    }

    if (visualizationType === 'size' || visualizationType === 'both') {
      instructionText += `### Size by Value (Proportional Symbols)

Use circle size to represent magnitude:

\`\`\`json
{
  "type": "circle",
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
    "circle-stroke-color": "#ffffff"
  }
}
\`\`\`

`;
    }

    if (visualizationType === 'heatmap') {
      instructionText += `### Heatmap Visualization

Show density and intensity using a heatmap:

\`\`\`json
{
  "type": "heatmap",
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
- Use get_reference_tool with 'streets-v8-fields-reference' to see available fields
- Review typical value ranges in the documentation

## Step 4: Create the Style

Now create the data-driven style:

1. **Start with a base style**
   - Use style_builder_tool to generate a base style
   - Provide instructions like: "Create a ${colorScheme} map for visualizing ${dataDescription}"

2. **Add your data source**
   - If using GeoJSON, you'll add it as a source:
   \`\`\`json
   "sources": {
     "data": {
       "type": "geojson",
       "data": "YOUR_GEOJSON_URL_OR_INLINE_DATA"
     }
   }
   \`\`\`

   - If using Mapbox tileset:
   \`\`\`json
   "sources": {
     "data": {
       "type": "vector",
       "url": "mapbox://your.tileset"
     }
   }
   \`\`\`

3. **Add your data-driven layer**
   - Use the expression examples from Step 2
   - Adjust breakpoints based on your actual data range
   - Choose appropriate layer type (fill, circle, heatmap, etc.)

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
- Use match for categorical data
- Test at different zoom levels
- Ensure color contrasts are accessible (4.5:1 ratio)
- Document your data property names and ranges

❌ **DON'T:**
- Use too many color breaks (5-7 is usually enough)
- Rely solely on color (add patterns or sizes for accessibility)
- Use red/green combinations (colorblind-unfriendly)
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
- Use get_reference_tool with 'style-spec-reference'
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
