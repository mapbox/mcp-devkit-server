// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { z } from 'zod';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CheckColorContrastInputSchema } from './CheckColorContrastTool.input.schema.js';
import {
  CheckColorContrastOutputSchema,
  type CheckColorContrastOutput
} from './CheckColorContrastTool.output.schema.js';

/**
 * CheckColorContrastTool - Checks color contrast ratios for WCAG accessibility compliance
 *
 * Calculates the contrast ratio between two colors and validates against WCAG 2.1 standards.
 * Supports various color formats including hex, rgb, rgba, and CSS named colors.
 */
export class CheckColorContrastTool extends BaseTool<
  typeof CheckColorContrastInputSchema,
  typeof CheckColorContrastOutputSchema
> {
  readonly name = 'check_color_contrast_tool';
  readonly description =
    'Checks color contrast ratios between foreground and background colors for WCAG 2.1 accessibility compliance';
  readonly annotations = {
    title: 'Check Color Contrast Tool',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };

  // WCAG 2.1 contrast requirements
  private static readonly WCAG_REQUIREMENTS = {
    AA: {
      normal: 4.5,
      large: 3.0
    },
    AAA: {
      normal: 7.0,
      large: 4.5
    }
  };

  // Common CSS named colors
  private static readonly NAMED_COLORS: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#008000',
    blue: '#0000ff',
    yellow: '#ffff00',
    cyan: '#00ffff',
    magenta: '#ff00ff',
    silver: '#c0c0c0',
    gray: '#808080',
    grey: '#808080',
    maroon: '#800000',
    olive: '#808000',
    lime: '#00ff00',
    aqua: '#00ffff',
    teal: '#008080',
    navy: '#000080',
    fuchsia: '#ff00ff',
    purple: '#800080',
    orange: '#ffa500'
  };

  constructor() {
    super({
      inputSchema: CheckColorContrastInputSchema,
      outputSchema: CheckColorContrastOutputSchema
    });
  }

  protected async execute(
    input: z.infer<typeof CheckColorContrastInputSchema>
  ): Promise<CallToolResult> {
    try {
      const level = input.level || 'AA';
      const fontSize = input.fontSize || 'normal';

      // Parse colors
      const fgRgb = this.parseColor(input.foregroundColor);
      const bgRgb = this.parseColor(input.backgroundColor);

      if (!fgRgb) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Invalid foreground color format: ${input.foregroundColor}`
            }
          ],
          isError: true
        };
      }

      if (!bgRgb) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Invalid background color format: ${input.backgroundColor}`
            }
          ],
          isError: true
        };
      }

      // Calculate luminance for each color
      const fgLuminance = this.calculateLuminance(fgRgb);
      const bgLuminance = this.calculateLuminance(bgRgb);

      // Calculate contrast ratio
      const contrastRatio = this.calculateContrastRatio(
        fgLuminance,
        bgLuminance
      );

      // Get minimum required ratio
      const minimumRequired =
        CheckColorContrastTool.WCAG_REQUIREMENTS[level][fontSize];

      // Check if it passes
      const passes = contrastRatio >= minimumRequired;

      // Generate recommendations if it doesn't pass
      const recommendations: string[] = [];
      if (!passes) {
        const deficit = minimumRequired - contrastRatio;
        recommendations.push(
          `Current contrast ratio of ${contrastRatio.toFixed(2)}:1 does not meet ${level} requirements of ${minimumRequired}:1`
        );
        recommendations.push(
          `Need to improve contrast by ${deficit.toFixed(2)} to meet ${level} ${fontSize} text requirements`
        );

        if (fontSize === 'normal') {
          const largeFontRequired =
            CheckColorContrastTool.WCAG_REQUIREMENTS[level].large;
          if (contrastRatio >= largeFontRequired) {
            recommendations.push(
              `This combination meets ${level} requirements for large text (${largeFontRequired}:1)`
            );
          }
        }

        // Check if it meets lower levels
        if (level === 'AAA') {
          const aaRequired =
            CheckColorContrastTool.WCAG_REQUIREMENTS.AA[fontSize];
          if (contrastRatio >= aaRequired) {
            recommendations.push(
              `This combination meets WCAG AA requirements (${aaRequired}:1)`
            );
          }
        }

        recommendations.push(
          'Consider making the text darker or lighter, or adjusting the background color'
        );
      }

      const result: CheckColorContrastOutput = {
        contrastRatio: Math.round(contrastRatio * 100) / 100,
        passes,
        level,
        fontSize,
        minimumRequired,
        wcagRequirements: CheckColorContrastTool.WCAG_REQUIREMENTS,
        recommendations:
          recommendations.length > 0 ? recommendations : undefined
      };

      const validatedResult = CheckColorContrastOutputSchema.parse(result);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validatedResult, null, 2)
          }
        ],
        structuredContent: validatedResult,
        isError: false
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log('error', `${this.name}: ${errorMessage}`);

      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true
      };
    }
  }

  /**
   * Parse a CSS color string into RGB values
   */
  private parseColor(
    color: string
  ): { r: number; g: number; b: number } | null {
    const normalized = color.trim().toLowerCase();

    // Check for named colors
    if (CheckColorContrastTool.NAMED_COLORS[normalized]) {
      return this.parseColor(CheckColorContrastTool.NAMED_COLORS[normalized]);
    }

    // Hex format (#RGB or #RRGGBB or #RRGGBBAA)
    if (normalized.startsWith('#')) {
      const hex = normalized.slice(1);

      if (hex.length === 3) {
        // #RGB -> #RRGGBB
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return { r, g, b };
      } else if (hex.length === 6 || hex.length === 8) {
        // #RRGGBB or #RRGGBBAA
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b };
      }
    }

    // RGB format: rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = normalized.match(
      /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
    );
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      return { r, g, b };
    }

    return null;
  }

  /**
   * Calculate relative luminance according to WCAG 2.1
   * https://www.w3.org/WAI/GL/wiki/Relative_luminance
   */
  private calculateLuminance(rgb: { r: number; g: number; b: number }): number {
    // Convert to 0-1 range
    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;

    // Apply gamma correction
    const r =
      rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g =
      gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b =
      bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    // Calculate luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Calculate contrast ratio according to WCAG 2.1
   * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
   */
  private calculateContrastRatio(l1: number, l2: number): number {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
}
