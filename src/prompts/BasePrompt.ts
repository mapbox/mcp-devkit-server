// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  Prompt,
  PromptArgument,
  GetPromptResult,
  PromptMessage
} from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Base class for all MCP prompts in the DevKit server.
 * Prompts are templates that guide users in effectively using the server's capabilities.
 */
export abstract class BasePrompt {
  /**
   * The unique identifier for this prompt (used in prompts/get requests)
   */
  abstract readonly name: string;

  /**
   * Human-readable title for display in UIs
   */
  abstract readonly title?: string;

  /**
   * Description of what this prompt does
   */
  abstract readonly description?: string;

  /**
   * Arguments that can be provided to customize the prompt
   */
  abstract readonly arguments?: readonly PromptArgument[];

  /**
   * Generate the prompt messages based on provided arguments.
   * This method is called when a client requests prompts/get.
   *
   * @param args - The arguments provided by the client
   * @returns Array of prompt messages to send to the LLM
   */
  protected abstract generateMessages(
    args?: Record<string, string>
  ): PromptMessage[];

  /**
   * Convert this prompt to the MCP Prompt format for prompts/list
   */
  toPromptDefinition(): Prompt {
    return {
      name: this.name,
      title: this.title,
      description: this.description,
      arguments: this.arguments as PromptArgument[] | undefined
    };
  }

  /**
   * Handle a prompts/get request for this prompt
   */
  handleGetPrompt(args?: Record<string, string>): GetPromptResult {
    // Validate required arguments
    if (this.arguments) {
      for (const arg of this.arguments) {
        if (arg.required && (!args || !args[arg.name])) {
          throw new Error(
            `Missing required argument: ${arg.name}. ${arg.description || ''}`
          );
        }
      }
    }

    return {
      description: this.description,
      messages: this.generateMessages(args)
    };
  }

  /**
   * Install this prompt to an MCP server.
   * This is called during server initialization.
   */
  installTo(_server: McpServer): void {
    // Prompts are registered via the prompt registry, not individually
    // This method exists for consistency with tools/resources but doesn't need implementation
  }
}
