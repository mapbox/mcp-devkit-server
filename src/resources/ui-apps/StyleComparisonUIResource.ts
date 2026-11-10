// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  ReadResourceResult,
  ServerContext
} from '@modelcontextprotocol/server';
import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { BaseResource } from '../BaseResource.js';

const MAPBOX_GL_VERSION = '3.12.0';
const COMPARE_VERSION = '0.4.0';

/**
 * Serves UI App HTML for Mapbox Style Comparison using mapbox-gl-compare.
 * Renders two synced GL maps with a draggable reveal slider inline —
 * no inner iframe needed, so frame-src CSP is not an issue.
 * Reads the styles, token and initial position from the tool result's
 * structuredContent; it does not depend on any hosted comparison page.
 * Implements MCP Apps pattern with ui:// scheme.
 */
export class StyleComparisonUIResource extends BaseResource {
  readonly name = 'Mapbox Style Comparison UI';
  readonly uri = 'ui://mapbox/style-comparison/index.html';
  readonly description =
    'Interactive UI for comparing two Mapbox styles with a draggable slider (MCP Apps)';
  readonly mimeType = RESOURCE_MIME_TYPE;

  public async readCallback(
    _uri: URL,
    _extra: ServerContext
  ): Promise<ReadResourceResult> {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mapbox Style Comparison</title>
  <link href="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css" rel="stylesheet">
  <link href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-compare/v${COMPARE_VERSION}/mapbox-gl-compare.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js"></script>
  <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-compare/v${COMPARE_VERSION}/mapbox-gl-compare.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #comparison-container { position: relative; width: 100%; height: 100%; }
    .map { position: absolute; top: 0; bottom: 0; width: 100%; }
    #loading {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #aaa; font-size: 16px; z-index: 10; pointer-events: none;
    }
    #error {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #ff6b6b; background: rgba(0,0,0,0.7); border-radius: 8px;
      padding: 20px; max-width: 400px; text-align: center; z-index: 10;
    }
    .style-label {
      position: absolute; bottom: 30px; z-index: 10;
      background: rgba(0,0,0,0.55); color: #fff;
      padding: 5px 14px; border-radius: 12px;
      font-size: 13px; font-weight: 500;
      max-width: 35%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      display: none;
    }
    #before-label { left: 12px; }
    #after-label { right: 12px; }
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
  <div id="comparison-container">
    <div id="before" class="map"></div>
    <div id="after" class="map"></div>
  </div>
  <div id="loading">Loading style comparison...</div>
  <div id="error" style="display:none"></div>
  <div id="before-label" class="style-label"></div>
  <div id="after-label" class="style-label"></div>
  <button id="fullscreen-btn" title="Toggle fullscreen">⛶</button>

  <script>
    var beforeMap = null;
    var afterMap = null;
    var compare = null;
    var currentDisplayMode = 'inline';
    var STYLE_ID_PATTERN = /^[a-zA-Z0-9_-]+[/][a-zA-Z0-9_-]+$/;

    var loadingEl = document.getElementById('loading');
    var errorEl = document.getElementById('error');
    var beforeLabel = document.getElementById('before-label');
    var afterLabel = document.getElementById('after-label');
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

    function showError(message) {
      loadingEl.style.display = 'none';
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }

    fullscreenBtn.addEventListener('click', function() {
      var newMode = currentDisplayMode === 'fullscreen' ? 'inline' : 'fullscreen';
      sendRequest('ui/request-display-mode', { mode: newMode }).then(function(result) {
        currentDisplayMode = (result && result.mode) ? result.mode : newMode;
        fullscreenBtn.textContent = currentDisplayMode === 'fullscreen' ? '⊟' : '⛶';
        if (beforeMap) setTimeout(function() { beforeMap.resize(); afterMap.resize(); }, 100);
        if (currentDisplayMode === 'inline') requestSizeToFit();
      }).catch(function() {});
    });

    window.addEventListener('message', function(event) {
      if (event.source !== window.parent) return;
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
          if (beforeMap) setTimeout(function() { beforeMap.resize(); afterMap.resize(); }, 100);
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
      clientInfo: { name: 'Mapbox Style Comparison', version: '1.0.0' }
    }).then(function() {
      sendNotification('ui/notifications/initialized', {});
    }, function() {
      sendNotification('ui/notifications/initialized', {});
    });

    // Turns a GL JS error event into a message naming the side that failed.
    function describeStyleError(side, styleId, e) {
      var status = e && e.error && e.error.status;
      var message = 'Failed to load the "' + side + '" style (' + styleId + ').';
      if (status === 404) return message + ' The style was not found. Make sure it exists and is accessible with this token.';
      if (status === 401) return message + ' Authentication failed. Check that the access token is valid.';
      if (status === 403) return message + ' Access denied. The token may not have permission to read this style.';
      var detail = e && e.error && e.error.message;
      if (detail) return message + ' ' + String(detail).slice(0, 120);
      return message;
    }

    function handleToolResult(result) {
      if (beforeMap) return;

      var data = result && result.structuredContent;
      if (!data || typeof data.accessToken !== 'string' ||
          !STYLE_ID_PATTERN.test(data.before) || !STYLE_ID_PATTERN.test(data.after)) {
        showError('No style comparison found in tool result');
        return;
      }

      if (typeof mapboxgl === 'undefined' || typeof mapboxgl.Compare === 'undefined') {
        showError('Could not load Mapbox GL JS');
        return;
      }

      var center = [0, 20];
      var zoom = 1.5;
      if (data.center && data.center.length === 2 && typeof data.zoom === 'number') {
        center = [data.center[0], data.center[1]];
        zoom = data.zoom;
      }

      try {
        mapboxgl.accessToken = data.accessToken;

        // fresh=true bypasses the style CDN cache so recent edits show up.
        beforeMap = new mapboxgl.Map({
          container: 'before',
          style: 'mapbox://styles/' + data.before + '?fresh=true',
          center: center,
          zoom: zoom
        });

        afterMap = new mapboxgl.Map({
          container: 'after',
          style: 'mapbox://styles/' + data.after + '?fresh=true',
          center: center,
          zoom: zoom
        });

        var loaded = { before: false, after: false };
        var loadedCount = 0;
        var failed = false;

        function onStyleLoad(map, side, labelEl, styleId) {
          loaded[side] = true;
          var style = map.getStyle();
          labelEl.textContent = style && style.name ? style.name + ' (' + styleId + ')' : styleId;
          labelEl.title = labelEl.textContent;
          labelEl.style.display = 'block';
          loadedCount++;
          if (loadedCount === 2 && !failed) {
            loadingEl.style.display = 'none';
            compare = new mapboxgl.Compare(beforeMap, afterMap, '#comparison-container', {
              mousemove: false,
              orientation: 'vertical'
            });
            requestSizeToFit();
          }
        }

        // Only errors before a style has loaded are fatal; later ones (a
        // missing tile, say) leave the comparison usable.
        function onError(side, styleId, e) {
          if (failed || loaded[side]) return;
          failed = true;
          showError(describeStyleError(side, styleId, e));
        }

        beforeMap.on('style.load', function() { onStyleLoad(beforeMap, 'before', beforeLabel, data.before); });
        afterMap.on('style.load', function() { onStyleLoad(afterMap, 'after', afterLabel, data.after); });
        beforeMap.on('error', function(e) { onError('before', data.before, e); });
        afterMap.on('error', function(e) { onError('after', data.after, e); });
      } catch (e) {
        showError('Could not load style comparison');
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
