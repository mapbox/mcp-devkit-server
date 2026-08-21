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
import { mintScopedPreviewToken } from '../../utils/mintScopedPreviewToken.js';

const MAPBOX_GL_VERSION = '3.12.0';

/**
 * Serves the UI App HTML shared by `geojson_preview_tool` and
 * `preview_style_tool` — one Mapbox GL JS map that either draws a GeoJSON
 * overlay on the default Standard style, or swaps to an arbitrary preview
 * style, depending on which tool's result arrives. Renders inline — no
 * inner iframe needed, so frame-src CSP is not an issue.
 *
 * Previously two nearly-identical resources (GeojsonPreviewUIResource,
 * PreviewStyleUIResource) each hand-wrote the same MCP-Apps postMessage
 * handshake, fullscreen/open-link controls, and resize handling. Merged
 * here since the only real difference between them was what they drew on
 * the map once data arrived, not how the map/iframe worked.
 *
 * `style_comparison_tool`'s dual-map swipe UI (StyleComparisonUIResource)
 * is a genuinely different UI shape — two synced map instances under a
 * compare slider, not "one map, different content" — and stays separate.
 */
export class MapPreviewUIResource extends BaseResource {
  readonly name = 'Mapbox Map Preview UI';
  readonly uri = 'ui://mapbox/map-preview/index.html';
  readonly description =
    'Interactive UI for previewing GeoJSON data or Mapbox styles rendered inline with Mapbox GL JS (MCP Apps)';
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
        accessToken = await mintScopedPreviewToken(fetch, skToken, {
          note: 'Map Preview (auto-generated, expires in 1h)',
          scopes: ['styles:tiles', 'styles:read', 'fonts:read']
        });
      } catch {
        // Non-fatal — map won't render until a style-preview result
        // supplies its own token, but the link button still works.
      }
    } else if (skToken.startsWith('pk.')) {
      accessToken = skToken; // Already a public token
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Map Preview</title>
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
  <div id="loading">Loading preview...</div>
  <div id="error" style="display:none"></div>
  <div id="style-name"></div>
  <button id="open-btn">↗ Open in browser</button>
  <button id="fullscreen-btn" title="Toggle fullscreen">⛶</button>

  <script>
    var TOKEN = '${accessToken}';
    var map = null;
    var mapLoaded = false;
    var pendingGeoJSON = null;
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
      clientInfo: { name: 'Mapbox Map Preview', version: '1.0.0' }
    }).then(function() {
      sendNotification('ui/notifications/initialized', {});
    }, function() {
      sendNotification('ui/notifications/initialized', {});
    });

    // ---------------------------------------------------------------------------
    // GeoJSON overlay helpers (used once we know we're in GeoJSON-preview mode)
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
        slot: 'top',
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': '#3fb1ce', 'fill-opacity': 0.35 }
      });
      map.addLayer({
        id: 'geojson-line', type: 'line', source: 'geojson',
        slot: 'top',
        filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
        paint: { 'line-color': '#3fb1ce', 'line-width': 2 }
      });
      map.addLayer({
        id: 'geojson-points', type: 'circle', source: 'geojson',
        slot: 'top',
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

    // ---------------------------------------------------------------------------
    // Style-preview helper (used once we know we're in style-preview mode)
    // ---------------------------------------------------------------------------

    function onStyleLoaded() {
      loadingEl.style.display = 'none';
      var style = map.getStyle();
      if (style && style.name) {
        styleNameEl.textContent = style.name;
        styleNameEl.style.display = 'block';
      }
      requestSizeToFit();
    }

    function showStylePreview(targetStyle, urlToken) {
      mapboxgl.accessToken = urlToken;
      if (map) {
        // A map already exists (GeoJSON-preview's eager bootstrap below) —
        // swap its style in place rather than creating a second instance.
        map.once('style.load', onStyleLoaded);
        map.setStyle(targetStyle);
      } else {
        map = new mapboxgl.Map({
          container: 'map',
          style: targetStyle,
          center: [0, 20],
          zoom: 1.5
        });
        map.addControl(new mapboxgl.NavigationControl(), 'top-left');
        map.on('style.load', onStyleLoaded);
      }
    }

    // ---------------------------------------------------------------------------
    // Eager map bootstrap — draws the default Standard style immediately so a
    // GeoJSON overlay has something to render onto as soon as it arrives.
    // Style-preview mode doesn't need this (it supplies its own style/token),
    // but eagerly creating it here does no harm: showStylePreview() above
    // reuses this instance via setStyle() instead of creating a second one.
    // ---------------------------------------------------------------------------

    if (TOKEN && typeof mapboxgl !== 'undefined') {
      mapboxgl.accessToken = TOKEN;
      map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/standard',
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
      // (or, for style-preview mode, to supply its own token and build the map).
      loadingEl.textContent = 'Waiting for preview data...';
    }

    // ---------------------------------------------------------------------------
    // Tool result handler — dispatches on the URL shape returned by whichever
    // tool fed this resource: geojson_preview_tool (a geojson.io URL carrying
    // GeoJSON in its data= param) or preview_style_tool (a Styles API
    // .html preview URL carrying its own access_token).
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

      if (typeof mapboxgl === 'undefined') {
        loadingEl.style.display = 'none';
        return;
      }

      let parsed;
      try {
        parsed = new URL(url);
      } catch (e) {
        loadingEl.style.display = 'none';
        errorEl.textContent = 'Could not parse tool result URL';
        errorEl.style.display = 'block';
        return;
      }

      const styleMatch = parsed.pathname.match(/\\/styles\\/v1\\/([^\\/]+)\\/([^.]+)\\.html/);
      const urlToken = parsed.searchParams.get('access_token');

      if (styleMatch && urlToken) {
        // Style-preview mode
        const username = styleMatch[1];
        const styleId = styleMatch[2];
        try {
          showStylePreview('mapbox://styles/' + username + '/' + styleId, urlToken);
        } catch (e) {
          loadingEl.style.display = 'none';
          errorEl.textContent = 'Could not load style';
          errorEl.style.display = 'block';
        }
        return;
      }

      // GeoJSON-preview mode
      try {
        const dataParam = parsed.searchParams.get('data');
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
