// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  PromptMessage,
  GetPromptResult
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Argument definition for a prompt
 */
export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

/**
 * Base class for all MCP prompts
 * Prompts represent multi-step workflows that guide AI agents through common tasks
 */
export abstract class BasePrompt {
  /**
   * Unique identifier for the prompt (snake_case)
   */
  abstract readonly name: string;

  /**
   * Human-readable description of what this prompt does
   */
  abstract readonly description: string;

  /**
   * Array of arguments this prompt accepts
   */
  abstract readonly arguments: ReadonlyArray<PromptArgument>;

  /**
   * Get prompt metadata for listing
   */
  getMetadata(): {
    name: string;
    description: string;
    arguments: ReadonlyArray<PromptArgument>;
  } {
    return {
      name: this.name,
      description: this.description,
      arguments: this.arguments
    };
  }

  /**
   * Generate the prompt messages with the provided arguments
   * @param args - Arguments provided by the user
   * @returns Array of messages for the LLM
   */
  abstract getMessages(args: Record<string, string>): PromptMessage[];

  /**
   * Execute the prompt with the provided arguments
   * @param args - Arguments provided by the user
   * @returns GetPromptResult with messages
   */
  execute(args: Record<string, string>): GetPromptResult {
    this.validateArguments(args);
    return {
      messages: this.getMessages(args)
    };
  }

  /**
   * Validate that required arguments are provided
   * @param args - Arguments to validate
   * @throws Error if required arguments are missing
   */
  protected validateArguments(args: Record<string, string>): void {
    const requiredArgs = this.arguments.filter((arg) => arg.required);
    const missingArgs = requiredArgs.filter((arg) => !args[arg.name]);

    if (missingArgs.length > 0) {
      throw new Error(
        `Missing required arguments: ${missingArgs.map((arg) => arg.name).join(', ')}`
      );
    }
  }
}
