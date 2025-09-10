import { describe, it, expect, beforeEach } from 'vitest';
import { CountryBoundingBoxTool } from '../../../src/tools/bounding-box-tool/CountryBoundingBoxTool.js';

type TextContent = { type: 'text'; text: string };

describe('CountryBoundingBoxTool', () => {
  let tool: CountryBoundingBoxTool;

  beforeEach(() => {
    tool = new CountryBoundingBoxTool();
  });

  describe('execute', () => {
    it('should return bounding box for valid country code - China (CN)', async () => {
      const result = await tool.run({ iso_3166_1: 'CN' });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      const bbox = JSON.parse(textContent.text);
      expect(bbox).toEqual([73.599819, 21.144707, 134.762115, 53.424591]);
    });

    it('should return bounding box for valid country code - United States (US)', async () => {
      const result = await tool.run({ iso_3166_1: 'US' });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      const bbox = JSON.parse(textContent.text);
      expect(bbox).toEqual([-168.069693, 25.133463, -67.292669, 71.284212]);
    });

    it('should return bounding box for valid country code - UAE (AE)', async () => {
      const result = await tool.run({ iso_3166_1: 'AE' });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      const bbox = JSON.parse(textContent.text);
      expect(bbox).toEqual([51.590737, 22.705773, 56.376954, 26.050548]);
    });

    it('should handle lowercase country codes', async () => {
      const result = await tool.run({ iso_3166_1: 'cn' });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      const bbox = JSON.parse(textContent.text);
      expect(bbox).toEqual([73.599819, 21.144707, 134.762115, 53.424591]);
    });

    it('should handle mixed case country codes', async () => {
      const result = await tool.run({ iso_3166_1: 'uS' });

      expect(result.isError).toBe(false);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const textContent = result.content[0] as TextContent;
      const bbox = JSON.parse(textContent.text);
      expect(bbox).toEqual([-168.069693, 25.133463, -67.292669, 71.284212]);
    });

    it('should return error for invalid country code', async () => {
      const result = await tool.run({ iso_3166_1: 'XX' });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      const errorText = (result.content[0] as TextContent).text;
      expect(errorText).toContain('Country code "XX" not found');
      expect(errorText).toContain('Please use a valid ISO 3166-1 country code');
    });

    it('should return error for empty country code', async () => {
      const result = await tool.run({ iso_3166_1: '' });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should return error for country code that is too long', async () => {
      const result = await tool.run({ iso_3166_1: 'CHINA' });

      expect(result.isError).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should handle 3-letter country codes that exist in data', async () => {
      // Check if there are any 3-letter codes in the data
      const supportedCountries = tool.getSupportedCountries();
      const threeLetterCodes = supportedCountries.filter(
        (code) => code.length === 3
      );

      if (threeLetterCodes.length > 0) {
        const result = await tool.run({ iso_3166_1: threeLetterCodes[0] });
        expect(result.isError).toBe(false);
        expect(result.content[0]).toHaveProperty('type', 'text');
      }
    });
  });

  describe('getSupportedCountries', () => {
    it('should return array of supported country codes', () => {
      const countries = tool.getSupportedCountries();

      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
      expect(countries).toContain('CN');
      expect(countries).toContain('US');
      expect(countries).toContain('AE');
    });

    it('should return sorted array', () => {
      const countries = tool.getSupportedCountries();
      const sortedCountries = [...countries].sort();

      expect(countries).toEqual(sortedCountries);
    });

    it('should contain known country codes', () => {
      const countries = tool.getSupportedCountries();

      // Test for a few known codes
      expect(countries).toContain('BR'); // Brazil
      expect(countries).toContain('DE'); // Germany
      expect(countries).toContain('JP'); // Japan
    });
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('country_bounding_box_tool');
      expect(tool.description).toBe(
        'Gets bounding box for a country by its ISO 3166-1 country code, returns as [minX, minY, maxX, maxY].'
      );
    });

    it('should have correct input schema', async () => {
      const { CountryBoundingBoxSchema } = await import(
        '../../../src/tools/bounding-box-tool/CountryBoundingBoxTool.schema.js'
      );
      expect(CountryBoundingBoxSchema).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle special country codes that might exist in data', async () => {
      const supportedCountries = tool.getSupportedCountries();

      // Test any special codes that start with D0 (if they exist)
      const specialCodes = supportedCountries.filter((code) =>
        code.startsWith('D0')
      );

      if (specialCodes.length > 0) {
        const testCode = specialCodes[0];
        const result = await tool.run({ iso_3166_1: testCode });

        expect(result.isError).toBe(false);

        if (!result.isError) {
          expect(result.content[0]).toHaveProperty('type', 'text');
          const textContent = result.content[0] as TextContent;
          const bbox = JSON.parse(textContent.text);
          expect(Array.isArray(bbox)).toBe(true);
          expect(bbox).toHaveLength(4);
        }
      }
    });
  });
});
