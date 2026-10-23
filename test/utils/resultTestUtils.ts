// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import type {
  CallToolResult,
  GetPromptResult,
  ReadResourceResult
} from '@modelcontextprotocol/server';

/**
 * The text of a tool result's content block. Throws if that block isn't
 * text, so a test fails on the wrong content type rather than on undefined.
 */
export function textOf(result: CallToolResult, index = 0): string {
  const block = result.content[index];
  if (block?.type !== 'text') {
    throw new Error(
      `content[${index}] is ${block?.type ?? 'missing'}, not text`
    );
  }
  return block.text;
}

/**
 * The text of a resource read's contents entry. Throws if it's a blob.
 */
export function resourceTextOf(result: ReadResourceResult, index = 0): string {
  const entry = result.contents[index];
  if (!entry || !('text' in entry)) {
    throw new Error(`contents[${index}] is not text`);
  }
  return entry.text;
}

/**
 * The text of a prompt message. Throws if the message content isn't text.
 */
export function promptTextOf(result: GetPromptResult, index = 0): string {
  const content = result.messages[index]?.content;
  if (content?.type !== 'text') {
    throw new Error(
      `messages[${index}] is ${content?.type ?? 'missing'}, not text`
    );
  }
  return content.text;
}
