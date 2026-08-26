// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { LoggingMessageNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * Spawns the *actual built server* (dist/esm/index.js) as a real child
 * process and drives it over real stdio with a real MCP client. Startup used
 * to send several `notifications/message` logging calls (.env status,
 * tracing status, a debug env dump) before `server.connect(transport)` ran
 * -- a real client can never receive a notification sent before the
 * transport it's listening on is connected, so those messages were silently
 * dropped every time. Only a test that crosses the real process/transport
 * boundary can catch a regression back to that ordering; asserting against
 * the return value of some internal function can't, since nothing here is
 * about return values.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = join(__dirname, '..', '..', 'dist', 'esm', 'index.js');

const DUMMY_TOKEN = 'sk.eyJ1IjoidGVzdC11c2VyIn0.signature';

describe.skipIf(!existsSync(SERVER_ENTRY))(
  'startup logging (real server process, real MCP protocol)',
  () => {
    it('delivers startup logging messages to a client connected before they are sent', async () => {
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [SERVER_ENTRY],
        env: {
          MAPBOX_ACCESS_TOKEN: DUMMY_TOKEN,
          PATH: process.env.PATH ?? ''
        }
      });
      const client = new Client({
        name: 'logging-order-integration-test',
        version: '1.0.0'
      });

      const received: unknown[] = [];
      client.setNotificationHandler(
        LoggingMessageNotificationSchema,
        async (notification) => {
          received.push(notification.params);
        }
      );

      try {
        await client.connect(transport);
        // Startup logging happens asynchronously right after connect;
        // give it a moment to arrive rather than racing it.
        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(received.length).toBeGreaterThan(0);
      } finally {
        await client.close().catch(() => {
          // Already closed or the process exited on its own.
        });
      }
    });
  }
);
