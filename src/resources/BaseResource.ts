// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ReadResourceResult,
  ServerNotification,
  ServerRequest
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Base class for MCP resources
 */
export abstract class BaseResource {
  abstract readonly name: string;
  abstract readonly uri: string;
  abstract readonly description: string;
  abstract readonly mimeType: string;

  /**
   * Install this resource to the MCP server
   */
  installTo(server: McpServer): void {
    server.registerResource(
      this.name,
      this.uri,
      {
        description: this.description,
        mimeType: this.mimeType
      },
      this.readCallback.bind(this)
    );
  }

  /**
   * Callback to read the resource content
   */
  public abstract readCallback(
    uri: URL,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ): Promise<ReadResourceResult>;
}
