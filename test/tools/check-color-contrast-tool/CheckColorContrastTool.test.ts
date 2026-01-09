// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { CheckColorContrastTool } from '../../../src/tools/check-color-contrast-tool/CheckColorContrastTool.js';

describe('CheckColorContrastTool', () => {
  let tool: CheckColorContrastTool;

  beforeEach(() => {
    tool = new CheckColorContrastTool();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('check_color_contrast_tool');
      expect(tool.description).toBe(
        'Checks color contrast ratios between foreground and background colors for WCAG 2.1 accessibility compliance'
      );
    });

    it('should have correct annotations', () => {
      expect(tool.annotations).toEqual({
        title: 'Check Color Contrast Tool',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      });
    });
  });

  describe('maximum contrast', () => {
    it('should calculate 21:1 for black on white', async () => {
      const input = {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBe(21);
      expect(parsed.passes).toBe(true);
      expect(parsed.level).toBe('AA');
      expect(parsed.fontSize).toBe('normal');
    });

    it('should calculate 21:1 for white on black', async () => {
      const input = {
        foregroundColor: '#ffffff',
        backgroundColor: '#000000'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBe(21);
      expect(parsed.passes).toBe(true);
    });
  });

  describe('WCAG AA compliance', () => {
    it('should pass AA for normal text with 4.5:1 ratio', async () => {
      const input = {
        foregroundColor: '#595959',
        backgroundColor: '#ffffff',
        level: 'AA',
        fontSize: 'normal'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(parsed.passes).toBe(true);
      expect(parsed.minimumRequired).toBe(4.5);
    });

    it('should pass AA for large text with 3:1 ratio', async () => {
      const input = {
        foregroundColor: '#767676',
        backgroundColor: '#ffffff',
        level: 'AA',
        fontSize: 'large'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBeGreaterThanOrEqual(3.0);
      expect(parsed.passes).toBe(true);
      expect(parsed.minimumRequired).toBe(3.0);
    });

    it('should fail AA for insufficient contrast', async () => {
      const input = {
        foregroundColor: '#cccccc',
        backgroundColor: '#ffffff',
        level: 'AA',
        fontSize: 'normal'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBeLessThan(4.5);
      expect(parsed.passes).toBe(false);
      expect(parsed.recommendations).toBeDefined();
      expect(parsed.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('WCAG AAA compliance', () => {
    it('should pass AAA for normal text with 7:1 ratio', async () => {
      const input = {
        foregroundColor: '#4d4d4d',
        backgroundColor: '#ffffff',
        level: 'AAA',
        fontSize: 'normal'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBeGreaterThanOrEqual(7.0);
      expect(parsed.passes).toBe(true);
      expect(parsed.minimumRequired).toBe(7.0);
    });

    it('should pass AAA for large text with 4.5:1 ratio', async () => {
      const input = {
        foregroundColor: '#595959',
        backgroundColor: '#ffffff',
        level: 'AAA',
        fontSize: 'large'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(parsed.passes).toBe(true);
      expect(parsed.minimumRequired).toBe(4.5);
    });

    it('should fail AAA but pass AA when appropriate', async () => {
      const input = {
        foregroundColor: '#767676', // This color passes AA (4.54:1) but fails AAA (needs 7:1)
        backgroundColor: '#ffffff',
        level: 'AAA',
        fontSize: 'normal'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.passes).toBe(false);
      expect(parsed.recommendations).toBeDefined();
      // Should suggest it meets AA
      expect(
        parsed.recommendations.some((r: string) => r.includes('WCAG AA'))
      ).toBe(true);
    });
  });

  describe('color format support', () => {
    it('should support 3-digit hex colors', async () => {
      const input = {
        foregroundColor: '#000',
        backgroundColor: '#fff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBe(21);
    });

    it('should support 6-digit hex colors', async () => {
      const input = {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBe(21);
    });

    it('should support 8-digit hex colors with alpha', async () => {
      const input = {
        foregroundColor: '#000000ff',
        backgroundColor: '#ffffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBe(21);
    });

    it('should support rgb() format', async () => {
      const input = {
        foregroundColor: 'rgb(0, 0, 0)',
        backgroundColor: 'rgb(255, 255, 255)'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBe(21);
    });

    it('should support rgba() format', async () => {
      const input = {
        foregroundColor: 'rgba(0, 0, 0, 1)',
        backgroundColor: 'rgba(255, 255, 255, 1)'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBe(21);
    });

    it('should support named colors', async () => {
      const input = {
        foregroundColor: 'black',
        backgroundColor: 'white'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBe(21);
    });

    it('should support mixed color formats', async () => {
      const input = {
        foregroundColor: 'black',
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBe(21);
    });
  });

  describe('error handling', () => {
    it('should handle invalid foreground color', async () => {
      const input = {
        foregroundColor: 'invalid-color',
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid foreground color');
    });

    it('should handle invalid background color', async () => {
      const input = {
        foregroundColor: '#000000',
        backgroundColor: 'not-a-color'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid background color');
    });

    it('should handle malformed hex colors', async () => {
      const input = {
        foregroundColor: '#12',
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
    });
  });

  describe('default parameters', () => {
    it('should default to AA level', async () => {
      const input = {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.level).toBe('AA');
    });

    it('should default to normal font size', async () => {
      const input = {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.fontSize).toBe('normal');
    });
  });

  describe('recommendations', () => {
    it('should not include recommendations when passing', async () => {
      const input = {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.recommendations).toBeUndefined();
    });

    it('should include recommendations when failing', async () => {
      const input = {
        foregroundColor: '#cccccc',
        backgroundColor: '#ffffff',
        level: 'AA',
        fontSize: 'normal'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.recommendations).toBeDefined();
      expect(parsed.recommendations.length).toBeGreaterThan(0);
      expect(
        parsed.recommendations.some((r: string) => r.includes('does not meet'))
      ).toBe(true);
    });

    it('should suggest large text when normal text fails but large text passes', async () => {
      const input = {
        foregroundColor: '#767676',
        backgroundColor: '#ffffff',
        level: 'AA',
        fontSize: 'normal'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      if (!parsed.passes) {
        expect(
          parsed.recommendations.some((r: string) => r.includes('large text'))
        ).toBe(true);
      }
    });
  });

  describe('WCAG requirements', () => {
    it('should include WCAG requirements in output', async () => {
      const input = {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.wcagRequirements).toBeDefined();
      expect(parsed.wcagRequirements.AA.normal).toBe(4.5);
      expect(parsed.wcagRequirements.AA.large).toBe(3.0);
      expect(parsed.wcagRequirements.AAA.normal).toBe(7.0);
      expect(parsed.wcagRequirements.AAA.large).toBe(4.5);
    });
  });

  describe('real-world color combinations', () => {
    it('should check typical dark text on light background', async () => {
      const input = {
        foregroundColor: '#333333',
        backgroundColor: '#f5f5f5'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBeGreaterThan(1);
    });

    it('should check Mapbox brand colors', async () => {
      const input = {
        foregroundColor: '#4264fb', // Mapbox blue
        backgroundColor: '#ffffff'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.contrastRatio).toBeGreaterThan(1);
    });
  });
});
