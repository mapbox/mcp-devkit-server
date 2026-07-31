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

const MAPBOX_GL_VERSION = '3.12.0';

/**
 * Serves UI App HTML for Mapbox Style Preview using Mapbox GL JS directly.
 * Renders the style inline — no inner iframe needed, so frame-src CSP is not an issue.
 * The pk.* token is parsed from the tool result URL (supplied by the user to the tool).
 * Implements MCP Apps pattern with ui:// scheme.
 */
export class PreviewStyleUIResource extends BaseResource {
  readonly name = 'Mapbox Style Preview UI';
  readonly uri = 'ui://mapbox/preview-style/index.html';
  readonly description =
    'Interactive UI for previewing Mapbox styles rendered inline with Mapbox GL JS (MCP Apps)';
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
  <link href="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #map { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    #loading {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #aaa; font-size: 16px; z-index: 10; pointer-events: none;
    }
    #error {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #ff6b6b; background: rgba(0,0,0,0.7); border-radius: 8px;
      padding: 20px; max-width: 400px; text-align: center; z-index: 10;
    }
    #style-name {
      position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.55); color: #fff;
      padding: 5px 14px; border-radius: 12px;
      font-size: 13px; font-weight: 500;
      display: none; z-index: 10;
      white-space: nowrap; max-width: 70%; overflow: hidden; text-overflow: ellipsis;
    }
    #open-btn {
      position: absolute; bottom: 12px; right: 12px; z-index: 10;
      display: none;
      color: #fff; background: rgba(0,0,0,0.6);
      font-size: 13px; padding: 5px 12px;
      border: 1px solid rgba(255,255,255,0.4); border-radius: 4px;
      cursor: pointer; font-family: inherit;
    }
    #open-btn:hover { background: rgba(0,0,0,0.8); }
    #fullscreen-btn {
      position: absolute; top: 10px; right: 10px; z-index: 10;
      display: none;
      width: 36px; height: 36px; border: none; border-radius: 8px;
      background: rgba(255,255,255,0.92);
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      cursor: pointer; align-items: center; justify-content: center;
      font-size: 16px;
    }
    #fullscreen-btn.visible { display: flex; }
    #fullscreen-btn:hover { background: rgba(240,240,240,0.95); }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="loading">Loading style preview...</div>
  <div id="error" style="display:none"></div>
  <div id="style-name"></div>
  <button id="open-btn">↗ Open in browser</button>
  <button id="fullscreen-btn" title="Toggle fullscreen">⛶</button>

  <script>
    var map = null;
    var currentPreviewUrl = '';
    var currentDisplayMode = 'inline';

    var loadingEl = document.getElementById('loading');
    var errorEl = document.getElementById('error');
    var styleNameEl = document.getElementById('style-name');
    var openBtn = document.getElementById('open-btn');
    var fullscreenBtn = document.getElementById('fullscreen-btn');

    var messageId = 0;
    var pendingRequests = new Map();

    function sendRequest(method, params) {
      var id = ++messageId;
      window.parent.postMessage({ jsonrpc: '2.0', id: id, method: method, params: params || {} }, '*');
      return new Promise(function(resolve, reject) {
        pendingRequests.set(id, { resolve: resolve, reject: reject });
      });
    }

    function sendNotification(method, params) {
      window.parent.postMessage({ jsonrpc: '2.0', method: method, params: params || {} }, '*');
    }

    function requestSizeToFit() {
      if (currentDisplayMode !== 'inline') return;
      sendNotification('ui/notifications/size-changed', { height: 600 });
    }

    fullscreenBtn.addEventListener('click', function() {
      var newMode = currentDisplayMode === 'fullscreen' ? 'inline' : 'fullscreen';
      sendRequest('ui/request-display-mode', { mode: newMode }).then(function(result) {
        currentDisplayMode = (result && result.mode) ? result.mode : newMode;
        fullscreenBtn.textContent = currentDisplayMode === 'fullscreen' ? '⊟' : '⛶';
        if (map) setTimeout(function() { map.resize(); }, 100);
        if (currentDisplayMode === 'inline') requestSizeToFit();
      }).catch(function() {});
    });

    openBtn.addEventListener('click', function() {
      if (!currentPreviewUrl) return;
      sendRequest('ui/open-link', { url: currentPreviewUrl }).catch(function() {
        try {
          var ta = document.createElement('textarea');
          ta.value = currentPreviewUrl;
          ta.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          openBtn.textContent = '✓ URL copied';
          setTimeout(function() { openBtn.textContent = '↗ Open in browser'; }, 2000);
        } catch (err) {}
      });
    });

    window.addEventListener('message', function(event) {
      var message = event.data;
      if (!message || typeof message !== 'object') return;

      if (message.id !== undefined && pendingRequests.has(message.id)) {
        var handlers = pendingRequests.get(message.id);
        pendingRequests.delete(message.id);
        if (message.error) handlers.reject(new Error(message.error.message));
        else handlers.resolve(message.result);
        return;
      }

      if (message.method === 'ui/notifications/tool-result') {
        if (message.params) handleToolResult(message.params);
      }

      if (message.method === 'ui/notifications/host-context-changed') {
        var ctx = message.params;
        if (ctx && ctx.displayMode) {
          currentDisplayMode = ctx.displayMode;
          fullscreenBtn.textContent = currentDisplayMode === 'fullscreen' ? '⊟' : '⛶';
          if (map) setTimeout(function() { map.resize(); }, 100);
        }
        if (ctx && ctx.capabilities && ctx.capabilities.supportedDisplayModes &&
            ctx.capabilities.supportedDisplayModes.indexOf('fullscreen') !== -1) {
          fullscreenBtn.classList.add('visible');
        }
      }
    });

    sendRequest('ui/initialize', {
      protocolVersion: '2026-01-26',
      appCapabilities: {},
      clientInfo: { name: 'Mapbox Style Preview', version: '1.0.0' }
    }).then(function() {
      sendNotification('ui/notifications/initialized', {});
    }, function() {
      sendNotification('ui/notifications/initialized', {});
    });

    function handleToolResult(result) {
      const textContent = result.content?.find(c => c.type === 'text');
      if (!textContent?.text) {
        loadingEl.style.display = 'none';
        errorEl.textContent = 'No URL found in tool result';
        errorEl.style.display = 'block';
        return;
      }

      const url = textContent.text;
      currentPreviewUrl = url;
      openBtn.style.display = 'block';

      if (typeof mapboxgl === 'undefined') {
        loadingEl.style.display = 'none';
        return;
      }

      try {
        const parsed = new URL(url);
        const token = parsed.searchParams.get('access_token');
        const match = parsed.pathname.match(/\\/styles\\/v1\\/([^\\/]+)\\/([^.]+)\\.html/);
        if (!match || !token) throw new Error('Could not parse style URL');

        const username = match[1];
        const styleId = match[2];

        mapboxgl.accessToken = token;
        map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/' + username + '/' + styleId,
          center: [0, 20],
          zoom: 1.5
        });
        map.addControl(new mapboxgl.NavigationControl(), 'top-left');

        map.on('style.load', function() {
          loadingEl.style.display = 'none';
          var style = map.getStyle();
          if (style && style.name) {
            styleNameEl.textContent = style.name;
            styleNameEl.style.display = 'block';
          }
          requestSizeToFit();
        });
      } catch (e) {
        loadingEl.style.display = 'none';
        errorEl.textContent = 'Could not load style';
        errorEl.style.display = 'block';
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
                resourceDomains: ['https://api.mapbox.com'],
                workerDomains: ['blob:']
              },
              preferredSize: {
                width: 1000,
                height: 600
              }
            }
          }
        }
      ]
    };
  }
}
