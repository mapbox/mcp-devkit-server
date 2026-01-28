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
 * Serves UI App HTML for Mapbox Style Preview
 * Implements MCP Apps pattern with ui:// scheme
 */
export class PreviewStyleUIResource extends BaseResource {
  readonly name = 'Mapbox Style Preview UI';
  readonly uri = 'ui://mapbox/preview-style/*';
  readonly description =
    'Interactive UI for previewing Mapbox styles (MCP Apps)';
  readonly mimeType = 'text/html';

  public async readCallback(
    uri: URL,
    _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ): Promise<ReadResourceResult> {
    // Extract username and styleId from URI path
    // Format: ui://mapbox/preview-style/{username}/{styleId}
    const pathParts = uri.pathname.split('/').filter((p) => p);
    const username = pathParts[2];
    const styleId = pathParts[3];

    if (!username || !styleId) {
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'text/plain',
            text: 'Error: Invalid URI format. Expected ui://mapbox/preview-style/{username}/{styleId}'
          }
        ]
      };
    }

    // Generate HTML with embedded iframe and MCP Apps SDK
    // The iframe URL will be constructed client-side based on parameters
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mapbox Style Preview</title>
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
  <div id="loading">Loading preview...</div>
  <iframe id="preview-frame" style="display:none"></iframe>

  <script type="module">
    import { App } from "https://esm.sh/@modelcontextprotocol/ext-apps@0.1.1";

    const frame = document.getElementById('preview-frame');
    const loading = document.getElementById('loading');

    try {
      const app = new App();
      await app.connect();

      // Receive tool result from host and extract preview URL
      app.onContextUpdate((context) => {
        if (!context.toolResult) return;

        // Find the text content which contains the preview URL
        const textContent = context.toolResult.content.find(
          (c) => c.type === 'text'
        );

        if (textContent && textContent.text) {
          // Set iframe to the preview URL from tool result
          frame.src = textContent.text;
          frame.style.display = 'block';
          loading.style.display = 'none';
        }
      });
    } catch (error) {
      loading.textContent = 'Failed to connect to MCP host: ' + error.message;
      loading.style.color = '#cc0000';
    }
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
