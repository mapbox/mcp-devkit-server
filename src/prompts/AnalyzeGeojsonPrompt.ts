// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  PromptMessage,
  PromptArgument
} from '@modelcontextprotocol/sdk/types.js';
import { BasePrompt } from './BasePrompt.js';

/**
 * Prompt that guides users through analyzing and visualizing GeoJSON data
 */
export class AnalyzeGeojsonPrompt extends BasePrompt {
  readonly name = 'analyze-geojson-data';
  readonly title = 'Analyze GeoJSON Data';
  readonly description =
    'Analyze GeoJSON data and visualize it on a map to understand spatial patterns and properties';

  readonly arguments: readonly PromptArgument[] = [
    {
      name: 'dataType',
      description:
        'What the GeoJSON represents (e.g., "delivery routes", "store locations", "sensor readings", "customer addresses")',
      required: true
    },
    {
      name: 'focusArea',
      description:
        'What to focus on in the analysis (e.g., "spatial distribution", "clustering patterns", "property values", "data quality")',
      required: false
    }
  ] as const;

  protected generateMessages(args?: Record<string, string>): PromptMessage[] {
    const dataType = args?.dataType || 'geographic features';
    const focusArea =
      args?.focusArea ||
      'spatial patterns, data quality, and actionable insights';

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze GeoJSON data representing ${dataType} and provide insights with visual map representations.

## Analysis Objective

**Data Type**: ${dataType}
**Focus Area**: ${focusArea}

## Analysis Workflow

1. **Understand the GeoJSON Structure**:
   - Examine the GeoJSON data provided by the user
   - Identify the geometry types (Point, LineString, Polygon, etc.)
   - List the key properties attached to each feature
   - Note any patterns in the property names and values

2. **Validate Data Quality**:
   - Check for valid GeoJSON structure (type: "FeatureCollection" or individual geometries)
   - Verify coordinate validity (latitude: -90 to 90, longitude: -180 to 180)
   - Identify any missing or null values in critical properties
   - Flag any duplicate features or coordinates

3. **Calculate Spatial Statistics**:
   For Point features:
   - Count total features
   - Calculate bounding box (min/max lat/lng)
   - Identify geographic center
   - Detect clustering patterns

   For LineString features:
   - Count routes/paths
   - Analyze connectivity
   - Identify start/end points

   For Polygon features:
   - Count areas/zones
   - Analyze overlap or gaps
   - Calculate approximate coverage

4. **Visualize the Data**:
   - Use \`geojson_preview_tool\` to generate a map visualization
   - The tool will create an interactive map showing all features
   - Point out any interesting visual patterns visible on the map

5. **Analyze Properties**:
   - Summarize property statistics (counts, ranges, distributions)
   - Identify correlations between properties and location
   - Highlight outliers or unusual values
   - For ${dataType}, specifically look for:
     * Relevant business metrics
     * Temporal patterns (if timestamps exist)
     * Categorical distributions

6. **Provide Actionable Insights**:
   Given that this is ${dataType}, focus on ${focusArea}:
   - **Spatial Patterns**: Are features clustered or dispersed? Any hot spots?
   - **Data Quality**: Are there any issues that need addressing?
   - **Business Insights**: What do the patterns tell us about the ${dataType}?
   - **Recommendations**: What actions could improve outcomes?

7. **Suggest Next Steps**:
   - Data improvements (if quality issues found)
   - Additional analysis opportunities
   - Visualization enhancements
   - Integration strategies for applications

## Common Data Types & Focus Areas

- **Delivery Routes**: Analyze route efficiency, coverage gaps, distance optimization
- **Store/Business Locations**: Assess market coverage, competitor proximity, demographic reach
- **Sensor/IoT Data**: Identify reading patterns, anomalies, coverage gaps
- **Customer Addresses**: Understand geographic distribution, service area optimization
- **Transit Data**: Evaluate network connectivity, coverage, accessibility
- **Real Estate**: Analyze property distribution, price patterns by location
- **Events/Incidents**: Detect hot spots, temporal trends, geographic correlations

## Output Format

Please provide:
1. **Data Summary**: Quick overview of geometry types and feature count
2. **Quality Assessment**: Any data issues or concerns
3. **Spatial Analysis**: Geographic patterns and statistics
4. **Property Insights**: Key findings from feature properties
5. **Visualization**: Map showing the data (via geojson_preview_tool)
6. **Recommendations**: Actionable next steps

Proceed with the analysis now, following this comprehensive workflow.`
        }
      }
    ];
  }
}
