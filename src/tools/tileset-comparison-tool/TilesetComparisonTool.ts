import { BaseTool } from '../BaseTool.js';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import { ListTokensTool } from '../list-tokens-tool/ListTokensTool.js';
import {
  TilesetComparisonSchema,
  TilesetComparisonInput
} from './TilesetComparisonTool.schema.js';

// HTML template as a string constant - avoids file I/O and compatibility issues
const COMPARISON_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{title}}</title>
    <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
    <link href="https://api.mapbox.com/mapbox-gl-js/v3.14.0/mapbox-gl.css" rel="stylesheet">
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.14.0/mapbox-gl.js"></script>
    <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-compare/v0.4.0/mapbox-gl-compare.js"></script>
    <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-compare/v0.4.0/mapbox-gl-compare.css" type="text/css">
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            overflow: hidden;
            font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif;
        }
        body * {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
        .map {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 100%;
        }
        .map-overlay {
            font: 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif;
            position: absolute;
            width: 200px;
            top: 10px;
            left: 10px;
            padding: 10px;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 3px;
            z-index: 1;
        }
        .map-overlay h3 {
            margin: 0 0 10px;
            font-size: 14px;
        }
        .map-overlay .label {
            display: block;
            margin: 0 0 5px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    {{overlay}}
    <div id="comparison-container">
        <div id="before" class="map"></div>
        <div id="after" class="map"></div>
    </div>

    <script>
        // Wait for the page to load completely
        window.addEventListener('load', function() {
            // Check if mapboxgl is defined
            if (typeof mapboxgl === 'undefined') {
                document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Mapbox GL JS failed to load. Please check your internet connection and try again.</div>';
                return;
            }

            mapboxgl.accessToken = '{{accessToken}}';

            const beforeMap = new mapboxgl.Map({
                container: 'before',
                style: '{{beforeStyle}}'{{beforeMapOptions}}
            });

            const afterMap = new mapboxgl.Map({
                container: 'after',
                style: '{{afterStyle}}'{{afterMapOptions}}
            });

            // Add navigation controls
            beforeMap.addControl(new mapboxgl.NavigationControl());
            afterMap.addControl(new mapboxgl.NavigationControl());

            // Wait for both maps to load before initializing the comparison
            let beforeLoaded = false;
            let afterLoaded = false;

            function initComparison() {
                if (beforeLoaded && afterLoaded) {
                    // Initialize the comparison plugin
                    const container = '#comparison-container';
                    const map = new mapboxgl.Compare(beforeMap, afterMap, container, {
                        // Set this to enable comparing two maps by mouse movement
                        mousemove: false
                    });
                }
            }

            beforeMap.on('load', function() {
                beforeLoaded = true;
                initComparison();
            });

            afterMap.on('load', function() {
                afterLoaded = true;
                initComparison();
            });
        });
    </script>
</body>
</html>`;

export class TilesetComparisonTool extends BaseTool<
  typeof TilesetComparisonSchema
> {
  readonly name = 'tileset_comparison_tool';
  readonly description =
    'Generate an HTML file for comparing two Mapbox styles side-by-side using mapbox-gl-compare';

  constructor() {
    super({ inputSchema: TilesetComparisonSchema });
  }

  protected async execute(
    input: TilesetComparisonInput,
    providedToken?: string
  ): Promise<{ type: 'text'; text: string }> {
    let accessToken = input.accessToken || providedToken;

    // If no token provided, try to get a public token from the account
    if (!accessToken) {
      try {
        const listTokensTool = new ListTokensTool();
        const tokensResult = await listTokensTool.run({
          usage: 'pk' // Filter for public tokens only
        });

        if (!tokensResult.isError) {
          const firstContent = tokensResult.content[0];
          if (firstContent.type === 'text') {
            const tokensData = JSON.parse(firstContent.text);
            const publicTokens = tokensData.tokens;
            if (publicTokens && publicTokens.length > 0) {
              accessToken = publicTokens[0].token;
            }
          }
        }
      } catch {
        // Silently continue, will fail later if no token
      }
    }

    if (!accessToken) {
      throw new Error(
        'No access token provided and no public token found. Please provide a public access token (pk.*).'
      );
    }

    // Ensure the token is a public token (starts with pk.)
    // Secret tokens (sk.*) cannot be used in client-side HTML
    if (!accessToken.startsWith('pk.')) {
      // If a secret token was provided, try to get a public token instead
      if (accessToken.startsWith('sk.')) {
        try {
          const listTokensTool = new ListTokensTool();
          const tokensResult = await listTokensTool.run({
            usage: 'pk' // Filter for public tokens only
          });

          if (!tokensResult.isError) {
            const firstContent = tokensResult.content[0];
            if (firstContent.type === 'text') {
              const tokensData = JSON.parse(firstContent.text);
              const publicTokens = tokensData.tokens;
              if (publicTokens && publicTokens.length > 0) {
                accessToken = publicTokens[0].token;
              } else {
                throw new Error(
                  'A secret token (sk.*) was provided, but HTML comparison requires a public token (pk.*). ' +
                    'No public token found in your account. Please create a public token first.'
                );
              }
            }
          }
        } catch {
          throw new Error(
            'A secret token (sk.*) was provided, but HTML comparison requires a public token (pk.*). ' +
              'Failed to fetch public tokens from your account. Please provide a public token directly.'
          );
        }
      } else {
        throw new Error(
          `Invalid token format. Expected a public token starting with 'pk.' but got a token starting with '${accessToken.substring(0, 3)}'. ` +
            'HTML comparison requires a public token for client-side usage.'
        );
      }
    }

    // Process style URLs - if just an ID is provided, convert to full style URL
    const processStyleUrl = (style: string): string => {
      // If it's already a full URL, return as is
      if (style.startsWith('mapbox://styles/')) {
        return style;
      }
      // If it contains a slash, assume it's username/styleId format
      if (style.includes('/')) {
        return `mapbox://styles/${style}`;
      }
      // If it's just a style ID, try to get username from the token
      try {
        const username = MapboxApiBasedTool.getUserNameFromToken(accessToken);
        return `mapbox://styles/${username}/${style}`;
      } catch (error) {
        throw new Error(
          `Could not determine username for style ID "${style}". ${error instanceof Error ? error.message : ''}\n` +
            `Please provide either:\n` +
            `1. Full style URL: mapbox://styles/username/${style}\n` +
            `2. Username/styleId format: username/${style}\n` +
            `3. Just the style ID with a valid Mapbox token that contains username information`
        );
      }
    };

    const beforeStyle = processStyleUrl(input.before);
    const afterStyle = processStyleUrl(input.after);

    // Build map initialization options
    const mapOptions: string[] = [];
    if (input.center) {
      mapOptions.push(`center: [${input.center[0]}, ${input.center[1]}]`);
    }
    if (input.zoom !== undefined) {
      mapOptions.push(`zoom: ${input.zoom}`);
    }
    if (input.bearing !== undefined) {
      mapOptions.push(`bearing: ${input.bearing}`);
    }
    if (input.pitch !== undefined) {
      mapOptions.push(`pitch: ${input.pitch}`);
    }

    const mapOptionsString =
      mapOptions.length > 0
        ? ',\n            ' + mapOptions.join(',\n            ')
        : '';

    // Build overlay HTML if title is provided
    const overlay = input.title
      ? `<div class="map-overlay">
        <h3>${input.title}</h3>
        <span class="label">Before:</span> ${input.before}<br>
        <span class="label">After:</span> ${input.after}
    </div>`
      : '';

    // Replace placeholders in template
    // At this point, accessToken is guaranteed to be defined due to our checks above
    const html = COMPARISON_TEMPLATE.replace(
      '{{title}}',
      input.title || 'Tileset Comparison'
    )
      .replace('{{overlay}}', overlay)
      .replace('{{accessToken}}', accessToken as string)
      .replace('{{beforeStyle}}', beforeStyle)
      .replace('{{afterStyle}}', afterStyle)
      .replace('{{beforeMapOptions}}', mapOptionsString)
      .replace('{{afterMapOptions}}', mapOptionsString);

    // Return the HTML content
    return {
      type: 'text',
      text: html
    };
  }
}
