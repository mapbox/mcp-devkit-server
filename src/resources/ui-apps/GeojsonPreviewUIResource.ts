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
    'Interactive UI for previewing GeoJSON data using geojson.io/next (MCP Apps)';
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
  <title>GeoJSON Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
    }
    #toolbar {
      display: none;
      align-items: center;
      justify-content: flex-end;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.7);
      gap: 8px;
    }
    #toolbar.visible { display: flex; }
    #fullscreen-btn {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #fff;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    #fullscreen-btn:hover { background: rgba(255, 255, 255, 0.25); }
    #preview-iframe {
      width: 100%;
      height: calc(100vh - 0px);
      border: none;
      display: none;
    }
    #preview-iframe.with-toolbar { height: calc(100vh - 36px); }
    #loading {
      padding: 40px;
      color: #666;
      text-align: center;
      font-size: 16px;
    }
    #error {
      padding: 20px;
      color: #d32f2f;
      text-align: center;
      background: #ffebee;
      border-radius: 8px;
      max-width: 600px;
      margin: 20px auto;
    }
    #error a {
      display: block;
      margin-top: 10px;
      color: #1976d2;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <button id="fullscreen-btn">⛶ Fullscreen</button>
  </div>
  <div id="loading">Loading GeoJSON preview...</div>
  <iframe id="preview-iframe" allow="geolocation"></iframe>
  <div id="error" style="display:none"></div>

  <script type="module">
    const iframe = document.getElementById('preview-iframe');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const toolbar = document.getElementById('toolbar');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    let currentDisplayMode = 'inline';
    let canFullscreen = false;

    let messageId = 0;
    const pendingRequests = new Map();

    function sendRequest(method, params = {}) {
      const id = ++messageId;
      window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
      });
    }

    function sendNotification(method, params = {}) {
      window.parent.postMessage({ jsonrpc: '2.0', method, params }, '*');
    }

    function requestSizeToFit() {
      if (currentDisplayMode !== 'inline') return;
      const toolbarHeight = canFullscreen ? toolbar.offsetHeight : 0;
      sendNotification('ui/notifications/size-changed', { height: 700 + toolbarHeight });
    }

    function updateFullscreenButton() {
      fullscreenBtn.textContent =
        currentDisplayMode === 'fullscreen' ? '⊟ Exit Fullscreen' : '⛶ Fullscreen';
    }

    async function toggleFullscreen() {
      const newMode = currentDisplayMode === 'fullscreen' ? 'inline' : 'fullscreen';
      try {
        const result = await sendRequest('ui/request-display-mode', { mode: newMode });
        currentDisplayMode = result?.mode ?? newMode;
        updateFullscreenButton();
        if (currentDisplayMode === 'inline') requestSizeToFit();
      } catch (e) {
        // Host may not support fullscreen; ignore
      }
    }

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      if (message.id !== undefined && pendingRequests.has(message.id)) {
        const { resolve, reject } = pendingRequests.get(message.id);
        pendingRequests.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }

      if (message.method === 'ui/notifications/tool-result') {
        if (message.params) handleToolResult(message.params);
      }

      if (message.method === 'ui/notifications/host-context-changed') {
        const ctx = message.params;
        if (ctx?.displayMode) {
          currentDisplayMode = ctx.displayMode;
          updateFullscreenButton();
          if (currentDisplayMode === 'inline' && iframe.style.display !== 'none') {
            requestSizeToFit();
          }
        }
        if (ctx?.capabilities?.supportedDisplayModes?.includes('fullscreen')) {
          canFullscreen = true;
          toolbar.classList.add('visible');
          iframe.classList.add('with-toolbar');
        }
      }
    });

    function handleToolResult(result) {
      const textContent = result.content?.find(c => c.type === 'text');

      if (textContent?.text) {
        const url = textContent.text;

        if (url.includes('geojson.io/next')) {
          iframe.src = url;
          iframe.style.display = 'block';
          loading.style.display = 'none';
          iframe.addEventListener('load', requestSizeToFit, { once: true });
        } else {
          loading.style.display = 'none';
          errorDiv.innerHTML = 'Unsupported URL format. <a href="' + url + '" target="_blank">' + url + '</a>';
          errorDiv.style.display = 'block';
        }
      } else {
        loading.style.display = 'none';
        errorDiv.textContent = 'No URL found in tool result';
        errorDiv.style.display = 'block';
      }
    }
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
                frameDomains: ['https://geojson.io'],
                resourceDomains: [
                  'https://fonts.gstatic.com',
                  'https://fonts.googleapis.com'
                ]
              },
              preferredSize: {
                width: 1200,
                height: 700
              }
            }
          }
        }
      ]
    };
  }
}
