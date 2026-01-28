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
 * Serves UI App HTML for Mapbox Style Comparison
 * Implements MCP Apps pattern with ui:// scheme
 */
export class StyleComparisonUIResource extends BaseResource {
  readonly name = 'Mapbox Style Comparison UI';
  readonly uri = 'ui://mapbox/style-comparison/*';
  readonly description =
    'Interactive UI for comparing Mapbox styles side-by-side (MCP Apps)';
  readonly mimeType = 'text/html';

  public async readCallback(
    uri: URL,
    _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ): Promise<ReadResourceResult> {
    // Extract before and after styles from URI path
    // Format: ui://mapbox/style-comparison/{beforeStyle}/{afterStyle}
    const pathParts = uri.pathname.split('/').filter((p) => p);
    const beforeStyle = pathParts[2];
    const afterStyle = pathParts[3];

    if (!beforeStyle || !afterStyle) {
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'text/plain',
            text: 'Error: Invalid URI format. Expected ui://mapbox/style-comparison/{beforeStyle}/{afterStyle}'
          }
        ]
      };
    }

    // Generate HTML with embedded iframe for style comparison
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mapbox Style Comparison</title>
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
    #comparison-frame {
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
  <div id="loading">Loading comparison...</div>
  <iframe id="comparison-frame" style="display:none"></iframe>

  <script type="module">
    // MCP Apps pattern: Extract parameters from tool result
    const beforeStyle = '${beforeStyle}';
    const afterStyle = '${afterStyle}';

    // For now, show a message that the comparison URL is needed from the host
    document.addEventListener('DOMContentLoaded', () => {
      const frame = document.getElementById('comparison-frame');
      const loading = document.getElementById('loading');

      loading.textContent = 'Comparison requires access token from host';
      loading.style.color = '#0066cc';

      // TODO: Integrate @modelcontextprotocol/ext-apps SDK
      // import { App } from "@modelcontextprotocol/ext-apps";
      // const app = new App();
      // await app.connect();
      // app.ontoolresult = (result) => {
      //   if (result.comparisonUrl) {
      //     frame.src = result.comparisonUrl;
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
