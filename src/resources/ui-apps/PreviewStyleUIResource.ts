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
 * Serves UI App HTML for Mapbox Style Preview
 * Implements MCP Apps pattern with ui:// scheme
 */
export class PreviewStyleUIResource extends BaseResource {
  readonly name = 'Mapbox Style Preview UI';
  readonly uri = 'ui://mapbox/preview-style/index.html';
  readonly description =
    'Interactive UI for previewing Mapbox styles (MCP Apps)';
  readonly mimeType = RESOURCE_MIME_TYPE;

  public async readCallback(
    _uri: URL,
    _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ): Promise<ReadResourceResult> {
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
    #preview-iframe {
      width: 100%;
      height: 100vh;
      border: none;
      display: none;
    }
    #loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #666;
    }
    #error {
      padding: 20px;
      color: #cc0000;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="loading">Loading style preview...</div>
  <iframe id="preview-iframe"></iframe>
  <div id="error" style="display:none"></div>

  <script type="module">
    const iframe = document.getElementById('preview-iframe');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    let messageId = 0;
    const pendingRequests = new Map();

    function sendRequest(method, params = {}) {
      const id = ++messageId;
      const message = { jsonrpc: '2.0', id, method, params };
      window.parent.postMessage(message, '*');
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
      });
    }

    function sendNotification(method, params = {}) {
      const message = { jsonrpc: '2.0', method, params };
      window.parent.postMessage(message, '*');
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      console.log('Received message:', JSON.stringify(message, null, 2));

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

      if (message.method === 'ui/notifications/tool-result') {
        if (message.params) {
          handleToolResult(message.params);
        }
      }
    });

    async function handleToolResult(result) {
      console.log('Tool result received:', result);

      const textContent = result.content?.find(c => c.type === 'text');

      if (textContent && textContent.text) {
        const url = textContent.text;
        console.log('Received preview URL:', url);

        if (url.includes('api.mapbox.com/styles/') && url.includes('.html')) {
          iframe.src = url;
          iframe.style.display = 'block';
          loading.style.display = 'none';
        } else {
          loading.style.display = 'none';
          errorDiv.textContent = 'Invalid preview URL format';
          errorDiv.style.display = 'block';
        }
      } else {
        loading.style.display = 'none';
        errorDiv.textContent = 'No URL found in tool result';
        errorDiv.style.display = 'block';
      }
    }

    async function init() {
      try {
        console.log('Connecting to MCP host...');

        const result = await sendRequest('ui/initialize', {
          protocolVersion: '2026-01-26',
          appCapabilities: {},
          appInfo: {
            name: 'Mapbox Style Preview',
            version: '1.0.0'
          }
        });

        console.log('Initialize result:', result);
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
                connectDomains: ['https://*.mapbox.com'],
                resourceDomains: ['https://*.mapbox.com'],
                frameDomains: ['https://api.mapbox.com']
              }
            }
          }
        }
      ]
    };
  }
}
