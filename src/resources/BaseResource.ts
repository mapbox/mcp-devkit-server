// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  McpServer,
  ReadResourceResult,
  ServerContext
} from '@modelcontextprotocol/server';

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
    extra: ServerContext
  ): Promise<ReadResourceResult>;
}
