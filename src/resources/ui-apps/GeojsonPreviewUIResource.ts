// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ReadResourceResult,
  ServerNotification,
  ServerRequest
} from '@modelcontextprotocol/sdk/types.js';
import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { BaseResource } from '../BaseResource.js';

/**
 * Serves UI App HTML for GeoJSON Preview
 * Implements MCP Apps pattern with ui:// scheme
 */
export class GeojsonPreviewUIResource extends BaseResource {
  readonly name = 'GeoJSON Preview UI';
  readonly uri = 'ui://mapbox/geojson-preview/index.html';
  readonly description =
    'Interactive UI for previewing GeoJSON data (MCP Apps)';
  readonly mimeType = RESOURCE_MIME_TYPE;

  public async readCallback(
    _uri: URL,
    _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ): Promise<ReadResourceResult> {
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
      background: #000;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    #zoom-hint {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.9);
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      color: #333;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    #zoom-hint.show {
      opacity: 1;
    }
    #image-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    }
    #preview-image {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      display: none;
      cursor: zoom-in;
      transition: transform 0.2s;
    }
    #preview-image:hover {
      transform: scale(1.02);
    }
    #preview-image.zoomed {
      cursor: zoom-out;
      max-width: none;
      max-height: none;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #fff;
      font-size: 16px;
    }
    #error {
      padding: 20px;
      color: #ff6b6b;
      text-align: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      max-width: 600px;
      margin: 20px auto;
    }
  </style>
</head>
<body>
  <div id="loading">Loading GeoJSON preview...</div>
  <div id="image-container">
    <img id="preview-image" alt="GeoJSON Preview">
  </div>
  <div id="zoom-hint">Click to view full size</div>
  <div id="error" style="display:none"></div>

  <script type="module">
    // Minimal MCP Apps client implementation (inlined to avoid CSP issues)
    const image = document.getElementById('preview-image');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const zoomHint = document.getElementById('zoom-hint');

    let isZoomed = false;

    // Click to zoom image
    image.addEventListener('click', () => {
      isZoomed = !isZoomed;
      if (isZoomed) {
        image.classList.add('zoomed');
        zoomHint.textContent = 'Click to fit to window';
      } else {
        image.classList.remove('zoomed');
        zoomHint.textContent = 'Click to view full size';
      }
    });

    // Show hint on hover
    image.addEventListener('mouseenter', () => {
      zoomHint.classList.add('show');
    });

    image.addEventListener('mouseleave', () => {
      zoomHint.classList.remove('show');
    });

    let messageId = 0;
    const pendingRequests = new Map();

    // Send JSON-RPC request to host (expects response)
    function sendRequest(method, params = {}) {
      const id = ++messageId;
      const message = { jsonrpc: '2.0', id, method, params };
      window.parent.postMessage(message, '*');
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
      });
    }

    // Send JSON-RPC notification to host (no response expected)
    function sendNotification(method, params = {}) {
      const message = { jsonrpc: '2.0', method, params };
      window.parent.postMessage(message, '*');
    }

    // Handle messages from host
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      console.log('Received message:', JSON.stringify(message, null, 2));

      // Handle JSON-RPC responses
      if (message.id && pendingRequests.has(message.id)) {
        const { resolve, reject } = pendingRequests.get(message.id);
        pendingRequests.delete(message.id);
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
        return;
      }

      // Handle notifications (tool results)
      if (message.method === 'ui/notifications/tool-result') {
        if (message.params) {
          handleToolResult(message.params);
        }
      }
    });

    async function handleToolResult(result) {
      console.log('Tool result received:', result);

      // Find the text content which contains the preview URL
      const textContent = result.content?.find(c => c.type === 'text');

      if (textContent && textContent.text) {
        const url = textContent.text;
        console.log('Received URL:', url.substring(0, 100) + '...');

        // Check if it's a Mapbox Static Images URL
        if (url.includes('api.mapbox.com/styles/') && url.includes('/static/')) {
          loading.textContent = 'Fetching image from Mapbox...';

          try {
            // Fetch the image and convert to blob URL to work with CSP
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error('Failed to fetch image: ' + response.status);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Display the image using blob URL (allowed by CSP)
            image.src = blobUrl;
            image.style.display = 'block';
            loading.style.display = 'none';
          } catch (error) {
            loading.style.display = 'none';
            errorDiv.textContent = 'Failed to load image: ' + error.message;
            errorDiv.style.display = 'block';
          }
        } else if (url.includes('geojson.io')) {
          // geojson.io doesn't work in iframes due to CSP
          loading.style.display = 'none';
          errorDiv.textContent = 'Cannot display geojson.io in iframe due to CSP. Open the URL directly:';
          errorDiv.style.display = 'block';

          // Create a clickable link
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.textContent = url;
          link.style.display = 'block';
          link.style.marginTop = '10px';
          link.style.color = '#0066cc';
          link.style.wordBreak = 'break-all';
          errorDiv.appendChild(link);
        } else {
          // Unknown URL format
          loading.style.display = 'none';
          errorDiv.textContent = 'Unsupported URL format: ' + url.substring(0, 100);
          errorDiv.style.display = 'block';
        }
      } else {
        console.log('No text content found in tool result');
        loading.style.display = 'none';
        errorDiv.textContent = 'No URL found in tool result';
        errorDiv.style.display = 'block';
      }
    }

    // Initialize connection
    async function init() {
      try {
        console.log('Connecting to MCP host...');

        // Send initialize request according to MCP Apps protocol
        const result = await sendRequest('ui/initialize', {
          protocolVersion: '2026-01-26',
          appCapabilities: {},
          appInfo: {
            name: 'GeoJSON Preview',
            version: '1.0.0'
          }
        });

        console.log('Initialize result:', result);

        // Send initialized notification
        sendNotification('ui/notifications/initialized', {});

        console.log('Connected to MCP host');
      } catch (error) {
        console.error('Failed to connect:', error);
        loading.textContent = 'Failed to connect to MCP host: ' + error.message;
        loading.style.color = '#cc0000';
      }
    }

    init();
  </script>
</body>
</html>`;

    return {
      contents: [
        {
          uri: this.uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              csp: {
                connectDomains: ['https://api.mapbox.com'],
                resourceDomains: ['https://api.mapbox.com']
              },
              preferredSize: {
                width: 1200,
                height: 900
              }
            }
          }
        }
      ]
    };
  }
}
