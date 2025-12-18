// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt, type PromptArgument } from './BasePrompt.js';

/**
 * Prompt for analyzing and visualizing GeoJSON data
 *
 * This prompt orchestrates multiple tools to:
 * 1. Validate GeoJSON format
 * 2. Calculate bounding box
 * 3. Generate visualization link
 * 4. Provide analysis summary
 */
export class AnalyzeGeojsonPrompt extends BasePrompt {
  readonly name = 'analyze-geojson';
  readonly description =
    'Analyze and visualize GeoJSON data. Validates format, calculates bounding box, and generates an interactive map visualization.';

  readonly arguments: ReadonlyArray<PromptArgument> = [
    {
      name: 'geojson_data',
      description:
        'GeoJSON object or string to analyze (Point, LineString, Polygon, Feature, FeatureCollection, etc.)',
      required: true
    },
    {
      name: 'show_bounds',
      description:
        'Whether to calculate and display the bounding box (true/false, default: true)',
      required: false
    },
    {
      name: 'convert_coordinates',
      description:
        'Whether to provide coordinate conversion examples for Web Mercator (true/false, default: false)',
      required: false
    }
  ];

  getMessages(args: Record<string, string>): PromptMessage[] {
    const geojsonData = args['geojson_data'];
    const showBounds = args['show_bounds'] !== 'false'; // Default to true
    const convertCoordinates = args['convert_coordinates'] === 'true'; // Default to false

    let instructionText = `Analyze the provided GeoJSON data and generate an interactive visualization.

**GeoJSON Data:**
\`\`\`json
${geojsonData}
\`\`\`

Follow these steps to analyze and visualize the data:

1. **Parse and validate the GeoJSON**
   - Parse the GeoJSON data (it may be provided as a string or object)
   - Verify it's valid GeoJSON with proper structure
   - Identify the geometry type (Point, LineString, Polygon, Feature, FeatureCollection, etc.)
   - Count the number of features if it's a FeatureCollection`;

    if (showBounds) {
      instructionText += `

2. **Calculate bounding box**
   - Use the bounding_box_tool to calculate the geographic extent
   - The tool will return [minX, minY, maxX, maxY] (west, south, east, north)
   - Present the bounds in a clear format:
     * Western edge (minX): [longitude]
     * Eastern edge (maxX): [longitude]
     * Southern edge (minY): [latitude]
     * Northern edge (maxY): [latitude]
   - Calculate and display the width and height in degrees`;
    }

    if (convertCoordinates) {
      instructionText += `

3. **Provide coordinate conversion examples**
   - Use the coordinate_conversion_tool to show Web Mercator equivalents
   - Convert a sample point from the GeoJSON from EPSG:4326 to EPSG:3857
   - Explain when Web Mercator coordinates might be useful (web mapping, tilesets)`;
    }

    const nextStep =
      showBounds && convertCoordinates
        ? '4'
        : showBounds || convertCoordinates
          ? '3'
          : '2';

    instructionText += `

${nextStep}. **Generate visualization**
   - Use the geojson_preview_tool to create an interactive map
   - This will generate a geojson.io URL where the data can be viewed and edited
   - The visualization will show:
     * The geometry rendered on a map
     * Feature properties in a side panel
     * Interactive editing capabilities

${parseInt(nextStep) + 1}. **Provide analysis summary**
   Present a comprehensive summary including:
   - **Geometry type**: [Point/LineString/Polygon/etc.]
   - **Feature count**: [number of features]
   - **Coordinate system**: WGS84 (EPSG:4326)`;

    if (showBounds) {
      instructionText += `\n   - **Geographic extent**: [bounding box summary]`;
    }

    instructionText += `\n   - **Visualization link**: [geojson.io URL - clickable]
   - **Properties**: [list any feature properties found]
   - **Data quality notes**: [any issues or observations]

**Analysis guidelines:**
- Check for common issues: invalid coordinates, missing required fields, topology errors
- Note if coordinates are in the correct order (longitude, latitude)
- Identify if the data uses right-hand rule for polygon winding
- Suggest improvements if the GeoJSON could be optimized
- For large datasets, note that the preview URL may be long

**Important notes:**
- GeoJSON coordinates must be [longitude, latitude], not [latitude, longitude]
- Valid longitude range: -180 to 180
- Valid latitude range: -90 to 90
- The preview tool works best with small to medium-sized datasets`;

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
