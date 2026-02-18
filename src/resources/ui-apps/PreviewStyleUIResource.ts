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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #1a1a2e;
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
      color: #aaa;
      text-align: center;
      font-size: 16px;
    }
    #error {
      padding: 20px;
      color: #ff6b6b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <button id="fullscreen-btn">⛶ Fullscreen</button>
  </div>
  <div id="loading">Loading style preview...</div>
  <iframe id="preview-iframe"></iframe>
  <div id="error" style="display:none"></div>

  <script>
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

    // Full MCP Apps handshake: send ui/initialize, then send ui/notifications/initialized
    // after the host responds. Per spec, the host MUST NOT send tool-input or tool-result
    // until it receives ui/notifications/initialized.
    // Errors are silently ignored for hosts that don't use this handshake (e.g. Claude Desktop).
    sendRequest('ui/initialize', {
      protocolVersion: '2026-01-26',
      appCapabilities: {},
      clientInfo: { name: 'Mapbox Style Preview', version: '1.0.0' }
    }).then(() => {
      sendNotification('ui/notifications/initialized', {});
    }).catch(() => {});

    function handleToolResult(result) {
      const textContent = result.content?.find(c => c.type === 'text');

      if (textContent?.text) {
        const url = textContent.text;

        if (url.includes('api.mapbox.com/styles/') && url.includes('.html')) {
          iframe.src = url;
          iframe.style.display = 'block';
          loading.style.display = 'none';
          iframe.addEventListener('load', requestSizeToFit, { once: true });
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
