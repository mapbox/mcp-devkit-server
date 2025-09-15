# Mapbox Style Layers Resource Example

This example demonstrates how the Mapbox Style Layers Resource guides LLMs in creating Mapbox styles based on natural language requests.

## How It Works

1. The `MapboxStyleLayersResource` is registered as an MCP resource at `resource://mapbox-style-layers`
2. When an LLM receives a request like "create a style that highlights railways and parks, and changes water to yellow", it can:
   - Query the resource to understand available layers
   - Get the correct source-layer names, filters, and properties
   - Generate proper Mapbox GL style JSON

## Example User Requests

### Request 1: "Highlight railways and parks, make water yellow"

The resource guides the LLM to:

- Use `water` layer (source-layer: "water") with `fill-color: "#ffff00"`
- Use `landuse` layer filtered by `class: "park"` with bright green color
- Use `road` layer filtered by `class: ["major_rail", "minor_rail"]` with red color

### Request 2: "Create a dark mode map with prominent buildings"

The resource guides the LLM to:

- Set `land` background layer to dark color
- Use `building` layer with light color and high opacity
- Adjust text colors for visibility on dark background

### Request 3: "Show only major roads and hide all labels"

The resource guides the LLM to:

- Include only `motorways` and `primary_roads` layers
- Exclude all label layers (`place_labels`, `road_labels`, `poi_labels`)
- Use appropriate filters like `["match", ["get", "class"], ["motorway", "trunk"], true, false]`

## Resource Content Structure

The resource provides:

1. **Quick Reference**: Maps common user requests to specific layers
2. **Layer Categories**: Groups layers by type (water, transportation, labels, etc.)
3. **Detailed Specifications**: For each layer:
   - Description
   - Source layer name
   - Layer type (fill, line, symbol, etc.)
   - Common filters
   - Paint properties with examples
   - Layout properties with examples
   - Example user requests

4. **Expression Examples**: Common Mapbox GL expression patterns:
   - Zoom-based interpolation
   - Feature property matching
   - Conditional styling

## Usage in LLM Context

When the LLM needs to create or modify a Mapbox style:

1. It reads the resource to understand available layers
2. Maps user intent to specific layers using the descriptions and examples
3. Generates proper filter expressions using the provided patterns
4. Creates valid paint and layout properties

## Example Generated Style

Based on "highlight railways and parks, yellow water":

```json
{
  "version": 8,
  "name": "Custom Style",
  "sources": {
    "composite": {
      "type": "vector",
      "url": "mapbox://mapbox.mapbox-streets-v8"
    }
  },
  "layers": [
    {
      "id": "land",
      "type": "background",
      "paint": {
        "background-color": "#f8f4f0"
      }
    },
    {
      "id": "water",
      "type": "fill",
      "source": "composite",
      "source-layer": "water",
      "paint": {
        "fill-color": "#ffff00"
      }
    },
    {
      "id": "parks",
      "type": "fill",
      "source": "composite",
      "source-layer": "landuse",
      "filter": ["==", ["get", "class"], "park"],
      "paint": {
        "fill-color": "#00ff00",
        "fill-opacity": 0.9
      }
    },
    {
      "id": "railways",
      "type": "line",
      "source": "composite",
      "source-layer": "road",
      "filter": [
        "match",
        ["get", "class"],
        ["major_rail", "minor_rail"],
        true,
        false
      ],
      "paint": {
        "line-color": "#ff0000",
        "line-width": [
          "interpolate",
          ["exponential", 1.5],
          ["zoom"],
          14,
          2,
          20,
          8
        ]
      }
    }
  ]
}
```

## Benefits

1. **Accuracy**: LLM uses correct source-layer names and properties
2. **Completeness**: All necessary filter expressions are included
3. **Best Practices**: Follows Mapbox GL style specification patterns
4. **Natural Language**: Users can describe what they want without knowing technical details
