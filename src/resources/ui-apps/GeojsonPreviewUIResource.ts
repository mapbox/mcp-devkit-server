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
import {
  getUserNameFromToken,
  mapboxApiEndpoint
} from '../../utils/jwtUtils.js';

const MAPBOX_GL_VERSION = '3.12.0';

// GL JS requires a public (pk.*) token. We create a short-lived one from the
// sk.* server token and cache it until it's close to expiry.
interface CachedToken {
  token: string;
  expiresAt: number; // ms since epoch
}
let cachedPublicToken: CachedToken | null = null;

async function getPublicToken(skToken: string): Promise<string> {
  const now = Date.now();
  // Re-use cached token if it has more than 5 minutes left
  if (cachedPublicToken && cachedPublicToken.expiresAt - now > 5 * 60 * 1000) {
    return cachedPublicToken.token;
  }

  const username = getUserNameFromToken(skToken);
  const expires = new Date(now + 60 * 60 * 1000).toISOString(); // 1 hour
  const url = `${mapboxApiEndpoint()}tokens/v2/${username}?access_token=${skToken}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      note: 'GeoJSON Preview (auto-generated, expires in 1h)',
      scopes: ['styles:tiles', 'styles:read', 'fonts:read'],
      expires
    })
  });

  if (!response.ok) {
    throw new Error(`Token API ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { token: string };
  cachedPublicToken = { token: data.token, expiresAt: now + 60 * 60 * 1000 };
  return data.token;
}

/**
 * Serves UI App HTML for GeoJSON Preview using Mapbox GL JS directly.
 * Renders GeoJSON inline — no inner iframe needed, so frame-src CSP is not an issue.
 * Implements MCP Apps pattern with ui:// scheme.
 */
export class GeojsonPreviewUIResource extends BaseResource {
  readonly name = 'GeoJSON Preview UI';
  readonly uri = 'ui://mapbox/geojson-preview/index.html';
  readonly description =
    'Interactive UI for previewing GeoJSON data rendered inline with Mapbox GL JS (MCP Apps)';
  readonly mimeType = RESOURCE_MIME_TYPE;

  public async readCallback(
    _uri: URL,
    _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ): Promise<ReadResourceResult> {
    // GL JS requires a public (pk.*) token. Create a short-lived one on the
    // customer's account using their sk.* token so we're not exposing any
    // Mapbox-owned credentials. Falls back gracefully if no sk.* is configured.
    const skToken =
      (_extra.authInfo?.token as string | undefined) ||
      process.env.MAPBOX_ACCESS_TOKEN ||
      '';
    let accessToken = '';
    if (skToken.startsWith('sk.')) {
      try {
        accessToken = await getPublicToken(skToken);
      } catch {
        // Non-fatal — map won't render but the link button still works
      }
    } else if (skToken.startsWith('pk.')) {
      accessToken = skToken; // Already a public token
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeoJSON Preview</title>
  <link href="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #map { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    #loading {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #666; font-size: 16px; z-index: 10; pointer-events: none;
    }
    #error {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #d32f2f; background: #ffebee; border-radius: 8px;
      padding: 20px; max-width: 400px; text-align: center; z-index: 10;
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
  <div id="loading">Loading GeoJSON preview...</div>
  <div id="error" style="display:none"></div>
  <button id="open-btn">↗ Open in browser</button>
  <button id="fullscreen-btn" title="Toggle fullscreen">⛶</button>

  <script>
    var TOKEN = '${accessToken}';
    var map = null;
    var mapLoaded = false;
    var pendingGeoJSON = null;
    var currentPreviewUrl = '';
    var currentDisplayMode = 'inline';
    var canFullscreen = false;

    var loadingEl = document.getElementById('loading');
    var errorEl = document.getElementById('error');
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
          canFullscreen = true;
          fullscreenBtn.classList.add('visible');
        }
      }
    });

    sendRequest('ui/initialize', {
      protocolVersion: '2026-01-26',
      appCapabilities: {},
      clientInfo: { name: 'GeoJSON Preview', version: '1.0.0' }
    }).then(function() {
      sendNotification('ui/notifications/initialized', {});
    }, function() {
      sendNotification('ui/notifications/initialized', {});
    });

    // ---------------------------------------------------------------------------
    // Map initialisation
    // ---------------------------------------------------------------------------

    function getGeojsonBounds(geojson) {
      var minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      function extendCoord(c) {
        if (c[0] < minLng) minLng = c[0];
        if (c[1] < minLat) minLat = c[1];
        if (c[0] > maxLng) maxLng = c[0];
        if (c[1] > maxLat) maxLat = c[1];
      }
      function processGeom(g) {
        if (!g) return;
        var t = g.type, c = g.coordinates;
        if (t === 'Point') { extendCoord(c); }
        else if (t === 'MultiPoint' || t === 'LineString') { c.forEach(extendCoord); }
        else if (t === 'MultiLineString' || t === 'Polygon') { c.forEach(function(r) { r.forEach(extendCoord); }); }
        else if (t === 'MultiPolygon') { c.forEach(function(p) { p.forEach(function(r) { r.forEach(extendCoord); }); }); }
        else if (t === 'GeometryCollection') { g.geometries.forEach(processGeom); }
      }
      var fc = geojson.type === 'FeatureCollection' ? geojson.features
             : geojson.type === 'Feature' ? [geojson] : [{ geometry: geojson }];
      fc.forEach(function(f) { processGeom(f.geometry || f); });
      if (!isFinite(minLng)) return null;
      return [[minLng, minLat], [maxLng, maxLat]];
    }

    function addGeoJSONToMap(geojson) {
      ['geojson-fill', 'geojson-line', 'geojson-points'].forEach(function(id) {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource('geojson')) map.removeSource('geojson');

      map.addSource('geojson', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'geojson-fill', type: 'fill', source: 'geojson',
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': '#3fb1ce', 'fill-opacity': 0.35 }
      });
      map.addLayer({
        id: 'geojson-line', type: 'line', source: 'geojson',
        filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
        paint: { 'line-color': '#3fb1ce', 'line-width': 2 }
      });
      map.addLayer({
        id: 'geojson-points', type: 'circle', source: 'geojson',
        filter: ['==', '$type', 'Point'],
        paint: { 'circle-color': '#3fb1ce', 'circle-radius': 6,
                 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' }
      });

      var bounds = getGeojsonBounds(geojson);
      if (bounds) {
        if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]) {
          map.flyTo({ center: bounds[0], zoom: 13 });
        } else {
          map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
        }
      }
    }

    if (TOKEN && typeof mapboxgl !== 'undefined') {
      mapboxgl.accessToken = TOKEN;
      map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [0, 20],
        zoom: 1.5
      });
      map.addControl(new mapboxgl.NavigationControl(), 'top-left');
      map.on('load', function() {
        mapLoaded = true;
        loadingEl.style.display = 'none';
        requestSizeToFit();
        if (pendingGeoJSON) {
          addGeoJSONToMap(pendingGeoJSON);
          pendingGeoJSON = null;
        }
      });
    } else {
      // No token or GL JS failed to load — wait for tool result to show link
      loadingEl.textContent = 'Waiting for GeoJSON data...';
    }

    // ---------------------------------------------------------------------------
    // Tool result handler
    // ---------------------------------------------------------------------------

    function handleToolResult(result) {
      const textContent = result.content?.find(c => c.type === 'text');
      if (!textContent?.text) {
        loadingEl.style.display = 'none';
        errorEl.textContent = 'No data found in tool result';
        errorEl.style.display = 'block';
        return;
      }

      const url = textContent.text;
      currentPreviewUrl = url;
      openBtn.style.display = 'block';

      // Parse GeoJSON from the geojson.io/next URL
      try {
        const dataParam = new URL(url).searchParams.get('data');
        if (!dataParam || !dataParam.startsWith('data:application/json,')) throw new Error('Unexpected URL format');
        const geojson = JSON.parse(decodeURIComponent(dataParam.replace('data:application/json,', '')));

        if (map) {
          if (mapLoaded) {
            addGeoJSONToMap(geojson);
            loadingEl.style.display = 'none';
          } else {
            pendingGeoJSON = geojson;
          }
        } else {
          // No GL map (no token) — just show the link button
          loadingEl.style.display = 'none';
        }
      } catch (e) {
        loadingEl.style.display = 'none';
        errorEl.textContent = 'Could not parse GeoJSON from tool result';
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
                connectDomains: [
                  'https://*.mapbox.com',
                  'https://events.mapbox.com'
                ],
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
