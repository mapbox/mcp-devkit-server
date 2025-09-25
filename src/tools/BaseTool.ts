import {
  McpServer,
  RegisteredTool
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z, ZodTypeAny } from 'zod';

const ContentItemSchema = z.union([
  z.object({
    type: z.literal('text'),
    text: z.string()
  }),
  z.object({
    type: z.literal('image'),
    data: z.string(),
    mimeType: z.string()
  })
]);

export const OutputSchema = z.object({
  content: z.array(ContentItemSchema),
  isError: z.boolean().default(false)
});

export type ContentItem = z.infer<typeof ContentItemSchema>;
export type ToolOutput = z.infer<typeof OutputSchema>;

export abstract class BaseTool<InputSchema extends ZodTypeAny> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly annotations: ToolAnnotations;

  readonly inputSchema: InputSchema;
  protected server: McpServer | null = null;

  constructor(params: { inputSchema: InputSchema }) {
    this.inputSchema = params.inputSchema;
  }

  /**
   * Validates and runs the tool logic.
   */
  async run(
    rawInput: unknown,
    extra?: RequestHandlerExtra<any, any>
  ): Promise<z.infer<typeof OutputSchema>> {
    try {
      const input = this.inputSchema.parse(rawInput);
      const accessToken =
        extra?.authInfo?.token || process.env.MAPBOX_ACCESS_TOKEN;
      const result = await this.execute(input, accessToken);

      // Check if result is already a content object (image or text)
      if (
        result &&
        typeof result === 'object' &&
        'type' in result &&
        (result.type === 'image' || result.type === 'text')
      ) {
        return {
          content: [result as ContentItem],
          isError: false
        };
      }

      // Otherwise return as text
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.log(
        'error',
        `${this.name}: Error during execution: ${errorMessage}`
      );

      return {
        content: [
          {
            type: 'text',
            text: errorMessage || 'Internal error has occurred.'
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Tool logic to be implemented by subclasses.
   */
  protected abstract execute(
    _input: z.infer<InputSchema>,
    accessToken?: string
  ): Promise<ContentItem | unknown>;

  /**
   * Installs the tool to the given MCP server.
   */
  installTo(server: McpServer): RegisteredTool {
    this.server = server;

    return server.registerTool(
      this.name,
      {
        description: this.description,
        inputSchema: (
          this.inputSchema as unknown as z.ZodObject<
            Record<string, z.ZodTypeAny>
          >
        ).shape,
        annotations: this.annotations
      },
      (args: any, extra: any) => this.run(args, extra)
    );
  }

  /**
   * Helper method to send logging messages
   */
  protected log(
    level: 'debug' | 'info' | 'warning' | 'error',
    data: string | Record<string, unknown>
  ): void {
    if (this.server) {
      this.server.server.sendLoggingMessage({ level, data });
    }
  }
}
