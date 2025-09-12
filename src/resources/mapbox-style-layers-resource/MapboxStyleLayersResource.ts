import { BaseResource } from '../BaseResource.js';
import {
  MAPBOX_STYLE_LAYERS,
  getLayerSuggestions
} from '../../constants/mapboxStyleLayers.js';

/**
 * Resource providing comprehensive Mapbox style layer definitions
 * to guide LLMs in creating and modifying Mapbox styles
 */
export class MapboxStyleLayersResource extends BaseResource {
  readonly name = 'Mapbox Style Layers Guide';
  readonly uri = 'resource://mapbox-style-layers';
  readonly description =
    'Comprehensive guide for Mapbox style layers including types, properties, and examples';
  readonly mimeType = 'text/markdown';

  protected async readCallback(uri: URL) {
    // Generate comprehensive markdown documentation
    const markdown = this.generateMarkdown();

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: this.mimeType,
          text: markdown
        }
      ]
    };
  }

  private generateMarkdown(): string {
    const sections: string[] = [];

    // Header
    sections.push('# Mapbox Style Creation Guide');
    sections.push('');
    sections.push('## How to Create a Custom Mapbox Style');
    sections.push('');
    sections.push('### Step-by-Step Process:');
    sections.push(
      '1. **Understand the request** - What layers should be visible? What colors/styling?'
    );
    sections.push(
      '2. **Use style_builder_tool** - This tool generates the style JSON configuration'
    );
    sections.push(
      '3. **Apply the style** - Use create_style_tool to create a new style or update_style_tool to modify existing'
    );
    sections.push('');
    sections.push('### Example Workflow:');
    sections.push('```');
    sections.push(
      'User: "Create a dark mode style with blue water and hidden labels"'
    );
    sections.push('Assistant: ');
    sections.push('1. Uses style_builder_tool with:');
    sections.push('   - global_settings: { mode: "dark" }');
    sections.push('   - layers: [');
    sections.push(
      '     { layer_type: "water", action: "color", color: "#0066ff" },'
    );
    sections.push('     { layer_type: "place_labels", action: "hide" },');
    sections.push('     { layer_type: "road_labels", action: "hide" }');
    sections.push('   ]');
    sections.push('2. Uses create_style_tool with the generated JSON');
    sections.push('```');
    sections.push('');
    sections.push('## Quick Reference');
    sections.push('');
    sections.push('### Common User Requests → Layer Mappings');
    sections.push('');
    sections.push('- **"change water color"** → `water`, `waterway`');
    sections.push(
      '- **"highlight parks"** → `parks` (landuse with class=park)'
    );
    sections.push(
      '- **"show railways"** → `railways` (road with class=major_rail)'
    );
    sections.push(
      '- **"color roads"** → `motorways`, `primary_roads`, `secondary_roads`, `streets`'
    );
    sections.push('- **"3D buildings"** → `building_3d` (fill-extrusion)');
    sections.push(
      '- **"hide labels"** → `place_labels`, `road_labels`, `poi_labels`'
    );
    sections.push(
      '- **"show borders"** → `country_boundaries`, `state_boundaries`'
    );
    sections.push('- **"transit/subway"** → `transit`, `railways`');
    sections.push(
      '- **"country boundaries"** → `country_boundaries` (admin layer, admin_level=0)'
    );
    sections.push(
      '- **"state boundaries"** → `state_boundaries` (admin layer, admin_level=1)'
    );
    sections.push('');

    // Layer categories
    sections.push('## Layer Categories');
    sections.push('');

    const categories = {
      'Background & Base': ['land'],
      'Water Features': ['water', 'waterway'],
      'Land Use': ['parks', 'buildings', 'building_3d'],
      Transportation: [
        'railways',
        'motorways',
        'primary_roads',
        'secondary_roads',
        'streets',
        'paths',
        'tunnels',
        'bridges'
      ],
      Aviation: ['airports'],
      Boundaries: ['country_boundaries', 'state_boundaries'],
      Labels: ['place_labels', 'road_labels', 'poi_labels', 'transit']
    };

    Object.entries(categories).forEach(([category, layers]) => {
      sections.push(`### ${category}`);
      layers.forEach((layerKey) => {
        const layer = MAPBOX_STYLE_LAYERS[layerKey];
        if (layer) {
          sections.push(`- **${layerKey}**: ${layer.description}`);
        }
      });
      sections.push('');
    });

    // Detailed layer specifications
    sections.push('## Detailed Layer Specifications');
    sections.push('');

    Object.entries(MAPBOX_STYLE_LAYERS).forEach(([key, layer]) => {
      sections.push(`### ${key}`);
      sections.push('');
      sections.push(`**Description:** ${layer.description}`);
      sections.push('');

      if (layer.sourceLayer) {
        sections.push(`**Source Layer:** \`${layer.sourceLayer}\``);
        sections.push('');
      }

      sections.push(`**Type:** \`${layer.type}\``);
      sections.push('');

      if (layer.commonFilters && layer.commonFilters.length > 0) {
        sections.push('**Common Filters:**');
        layer.commonFilters.forEach((filter) => {
          sections.push(`- ${filter}`);
        });
        sections.push('');
      }

      if (layer.paintProperties.length > 0) {
        sections.push('**Paint Properties:**');
        sections.push('');
        layer.paintProperties.forEach((prop) => {
          sections.push(`- \`${prop.property}\`: ${prop.description}`);
          sections.push(`  - Example: \`${JSON.stringify(prop.example)}\``);
        });
        sections.push('');
      }

      if (layer.layoutProperties && layer.layoutProperties.length > 0) {
        sections.push('**Layout Properties:**');
        sections.push('');
        layer.layoutProperties.forEach((prop) => {
          sections.push(`- \`${prop.property}\`: ${prop.description}`);
          sections.push(`  - Example: \`${JSON.stringify(prop.example)}\``);
        });
        sections.push('');
      }

      if (layer.examples.length > 0) {
        sections.push('**Example User Requests:**');
        layer.examples.forEach((example) => {
          sections.push(`- "${example}"`);
        });
        sections.push('');
      }

      sections.push('---');
      sections.push('');
    });

    // Usage examples
    sections.push('## Complete Style Examples');
    sections.push('');
    sections.push('### Example 1: Highlight Railways and Parks, Yellow Water');
    sections.push('');
    sections.push('```javascript');
    sections.push('layers: [');
    sections.push('  {');
    sections.push('    id: "water",');
    sections.push('    type: "fill",');
    sections.push('    source: "composite",');
    sections.push('    "source-layer": "water",');
    sections.push('    paint: {');
    sections.push('      "fill-color": "#ffff00" // Yellow');
    sections.push('    }');
    sections.push('  },');
    sections.push('  {');
    sections.push('    id: "parks",');
    sections.push('    type: "fill",');
    sections.push('    source: "composite",');
    sections.push('    "source-layer": "landuse",');
    sections.push('    filter: ["==", ["get", "class"], "park"],');
    sections.push('    paint: {');
    sections.push('      "fill-color": "#00ff00", // Bright green');
    sections.push('      "fill-opacity": 0.9');
    sections.push('    }');
    sections.push('  },');
    sections.push('  {');
    sections.push('    id: "railways",');
    sections.push('    type: "line",');
    sections.push('    source: "composite",');
    sections.push('    "source-layer": "road",');
    sections.push(
      '    filter: ["match", ["get", "class"], ["major_rail", "minor_rail"], true, false],'
    );
    sections.push('    paint: {');
    sections.push('      "line-color": "#ff0000", // Red');
    sections.push(
      '      "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 14, 2, 20, 8]'
    );
    sections.push('    }');
    sections.push('  }');
    sections.push(']');
    sections.push('```');
    sections.push('');

    // Expression examples
    sections.push('## Common Expression Patterns');
    sections.push('');
    sections.push('### Zoom-based Interpolation');
    sections.push('```javascript');
    sections.push('"line-width": [');
    sections.push('  "interpolate",');
    sections.push('  ["exponential", 1.5],');
    sections.push('  ["zoom"],');
    sections.push('  12, 0.5,  // At zoom 12, width is 0.5');
    sections.push('  18, 20    // At zoom 18, width is 20');
    sections.push(']');
    sections.push('```');
    sections.push('');

    sections.push('### Feature Property Matching');
    sections.push('```javascript');
    sections.push('filter: [');
    sections.push('  "match",');
    sections.push('  ["get", "class"],');
    sections.push('  ["motorway", "trunk"], true,  // Match these values');
    sections.push('  false  // Default');
    sections.push(']');
    sections.push('```');
    sections.push('');

    sections.push('### Conditional Styling');
    sections.push('```javascript');
    sections.push('"fill-color": [');
    sections.push('  "case",');
    sections.push('  ["==", ["get", "type"], "hospital"], "#ff0000",');
    sections.push('  ["==", ["get", "type"], "school"], "#0000ff",');
    sections.push('  "#cccccc"  // Default color');
    sections.push(']');
    sections.push('```');
    sections.push('');

    // Tips
    sections.push('## Tips for LLM Usage');
    sections.push('');
    sections.push(
      '1. **Layer Order Matters**: Layers are drawn in the order they appear (first = bottom)'
    );
    sections.push(
      '2. **Use Filters**: Filter by `class`, `type`, or other properties to target specific features'
    );
    sections.push(
      '3. **Zoom Levels**: Use interpolation for smooth transitions across zoom levels'
    );
    sections.push(
      '4. **Source Layers**: Most features come from `composite` source with specific `source-layer`'
    );
    sections.push(
      '5. **Color Formats**: Use hex colors (#rrggbb), rgb(), hsl(), or named colors'
    );
    sections.push(
      '6. **Opacity**: Use opacity properties for transparency (0 = transparent, 1 = opaque)'
    );
    sections.push('');

    return sections.join('\n');
  }
}

// Helper function to interpret user requests
export function interpretStyleRequest(userPrompt: string): {
  suggestedLayers: string[];
  interpretation: string;
} {
  const suggestions = getLayerSuggestions(userPrompt);

  let interpretation = 'Based on your request, you may want to modify: ';

  if (suggestions.length > 0) {
    interpretation += suggestions
      .map((s) => {
        const layer = MAPBOX_STYLE_LAYERS[s];
        return `${s} (${layer?.description || 'unknown'})`;
      })
      .join(', ');
  } else {
    interpretation +=
      'No specific layers identified. Please provide more details.';
  }

  return {
    suggestedLayers: suggestions,
    interpretation
  };
}
