// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import {
  McpServer,
  RegisteredTool,
  CallToolResult,
  ToolAnnotations,
  ServerContext
} from '@modelcontextprotocol/server';
import { z, ZodTypeAny } from 'zod';
import type { ToolExecutionContext } from '../utils/tracing.js';
import { lenientOutputSchema } from './lenientOutputSchema.js';

export abstract class BaseTool<
  InputSchema extends ZodTypeAny,
  OutputSchema extends ZodTypeAny = ZodTypeAny
> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly annotations: ToolAnnotations;

  readonly inputSchema: InputSchema;
  readonly outputSchema?: OutputSchema;
  readonly meta?: {
    ui?: {
      resourceUri?: string;
      csp?: {
        connectDomains?: string[];
        resourceDomains?: string[];
        frameDomains?: string[];
      };
    };
  };
  protected server: McpServer | null = null;

  constructor(params: {
    inputSchema: InputSchema;
    outputSchema?: OutputSchema;
  }) {
    this.inputSchema = params.inputSchema;
    this.outputSchema = params.outputSchema;
  }

  /**
   * Tool logic to be implemented by subclasses.
   */
  async run(rawInput: unknown, extra?: ServerContext): Promise<CallToolResult> {
    try {
      const input = this.inputSchema.parse(rawInput);
      const accessToken =
        extra?.http?.authInfo?.token || process.env.MAPBOX_ACCESS_TOKEN;
      return this.execute(input, accessToken);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text', text: (error as Error).message }]
      };
    }
  }

  protected abstract execute(
    inputSchema: z.infer<InputSchema>,
    accessToken?: string,
    context?: ToolExecutionContext
  ): Promise<CallToolResult>;

  /**
   * Installs the tool to the given MCP server.
   */
  installTo(server: McpServer): RegisteredTool {
    this.server = server;

    const config: {
      title?: string;
      description?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      outputSchema?: any;
      annotations?: ToolAnnotations;
      _meta?: {
        ui?: {
          resourceUri?: string;
          csp?: {
            connectDomains?: string[];
            resourceDomains?: string[];
            frameDomains?: string[];
          };
        };
      };
    } = {
      title: this.annotations.title,
      description: this.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: (this.inputSchema as unknown as z.ZodObject<any>).shape,
      annotations: this.annotations
    };

    // Add outputSchema if provided
    if (this.outputSchema) {
      // tools/list publishes the real schema; validation only warns. See
      // lenientOutputSchema.ts.
      config.outputSchema = lenientOutputSchema(this.outputSchema, this.name);
    }

    // Add _meta for MCP Apps support if provided (includes CSP configuration)
    if (this.meta) {
      config._meta = this.meta;
    }

    return server.registerTool(
      this.name,
      config,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (args: any, ctx: ServerContext) => {
        const result = await this.run(args, ctx);
        // McpServer fails a call to a tool with an output schema that returns
        // no structuredContent, before validation can let it through. Send an
        // empty object rather than turn a usable text answer into an error.
        if (
          this.outputSchema &&
          !result.isError &&
          result.structuredContent === undefined
        ) {
          console.warn(
            `Output validation warning: tool ${this.name} has an output schema but returned no structured content`
          );
          return { ...result, structuredContent: {} };
        }
        return result;
      }
    );
  }

  /**
   * Helper method to send logging messages
   */
  protected log(
    level: 'debug' | 'info' | 'warning' | 'error',
    data: string | Record<string, unknown>
  ): void {
    if (this.server?.server) {
      this.server.server.sendLoggingMessage({ level, data });
    }
  }
}
