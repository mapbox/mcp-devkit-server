// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ReadResourceResult,
  ServerNotification,
  ServerRequest
} from '@modelcontextprotocol/sdk/types.js';
import { BaseResource } from '../BaseResource.js';

/**
 * Serves UI App HTML for GeoJSON Preview
 * Implements MCP Apps pattern with ui:// scheme
 */
export class GeojsonPreviewUIResource extends BaseResource {
  readonly name = 'GeoJSON Preview UI';
  readonly uri = 'ui://mapbox/geojson-preview/*';
  readonly description =
    'Interactive UI for previewing GeoJSON data (MCP Apps)';
  readonly mimeType = 'text/html';

  public async readCallback(
    uri: URL,
    _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ): Promise<ReadResourceResult> {
    // Extract content hash from URI path
    // Format: ui://mapbox/geojson-preview/{contentHash}
    const pathParts = uri.pathname.split('/').filter((p) => p);
    const contentHash = pathParts[2];

    if (!contentHash) {
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'text/plain',
            text: 'Error: Invalid URI format. Expected ui://mapbox/geojson-preview/{contentHash}'
          }
        ]
      };
    }

    // Generate HTML with embedded iframe for GeoJSON visualization
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeoJSON Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    #preview-frame {
      width: 100vw;
      height: 100vh;
      border: none;
      display: block;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #666;
    }
  </style>
</head>
<body>
  <div id="loading">Loading GeoJSON preview...</div>
  <iframe id="preview-frame" style="display:none"></iframe>

  <script type="module">
    // MCP Apps pattern: Extract parameters from tool result
    const contentHash = '${contentHash}';

    // For now, show a message that the preview URL is needed from the host
    document.addEventListener('DOMContentLoaded', () => {
      const frame = document.getElementById('preview-frame');
      const loading = document.getElementById('loading');

      loading.textContent = 'GeoJSON preview requires data from host';
      loading.style.color = '#0066cc';

      // TODO: Integrate @modelcontextprotocol/ext-apps SDK
      // import { App } from "@modelcontextprotocol/ext-apps";
      // const app = new App();
      // await app.connect();
      // app.ontoolresult = (result) => {
      //   if (result.previewUrl) {
      //     frame.src = result.previewUrl;
      //     frame.style.display = 'block';
      //     loading.style.display = 'none';
      //   }
      // };
    });
  </script>
</body>
</html>`;

    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: 'text/html',
          text: html
        }
      ]
    };
  }
}
