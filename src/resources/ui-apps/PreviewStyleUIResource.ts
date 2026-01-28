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
    // MCP Apps pattern: Extract parameters from tool result
    // The iframe URL should be passed via toolresult
    const username = '${username}';
    const styleId = '${styleId}';

    // For now, construct a basic preview URL
    // In a full MCP Apps implementation, the App SDK would communicate
    // with the host to get the access token and other parameters
    const baseUrl = 'https://api.mapbox.com/styles/v1';

    // Note: This is a simplified version. Full MCP Apps would use
    // @modelcontextprotocol/ext-apps SDK for:
    // - Receiving tool results with preview URL
    // - Bidirectional communication with host
    // - Context updates

    document.addEventListener('DOMContentLoaded', () => {
      const frame = document.getElementById('preview-frame');
      const loading = document.getElementById('loading');

      // In production, this would come from the host via MCP Apps SDK
      // For now, show a message that the preview URL is needed
      loading.textContent = 'Preview requires access token from host';
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
