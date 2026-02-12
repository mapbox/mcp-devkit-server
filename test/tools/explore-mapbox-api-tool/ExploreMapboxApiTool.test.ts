import { describe, it, expect } from 'vitest';
import { ExploreMapboxApiTool } from '../../../src/tools/explore-mapbox-api-tool/ExploreMapboxApiTool.js';

describe('ExploreMapboxApiTool', () => {
  const tool = new ExploreMapboxApiTool();

  describe('listAllApis', () => {
    it('should list all available APIs when no input provided', async () => {
      const result = await tool.execute({});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Mapbox APIs');
      expect(result.content[0].text).toContain('geocoding');
      expect(result.content[0].text).toContain('styles');
      expect(result.content[0].text).toContain('tokens');
      expect(result.content[0].text).toContain('static-images');
      expect(result.content[0].text).toContain('directions');
      expect(result.content[0].text).toContain('tilequery');
      expect(result.content[0].text).toContain('feedback');

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent!.apis).toBeDefined();
      expect(result.structuredContent!.apis!.length).toBe(7);
      expect(result.structuredContent!.apis![0]).toHaveProperty('api');
      expect(result.structuredContent!.apis![0]).toHaveProperty('category');
      expect(result.structuredContent!.apis![0]).toHaveProperty('description');
      expect(result.structuredContent!.apis![0]).toHaveProperty('docsUrl');
      expect(result.structuredContent!.apis![0]).toHaveProperty(
        'operationCount'
      );
    });
  });

  describe('listApiOperations', () => {
    it('should list operations for geocoding API', async () => {
      const result = await tool.execute({ api: 'geocoding' });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('geocoding API');
      expect(result.content[0].text).toContain('Forward Geocoding');
      expect(result.content[0].text).toContain('Reverse Geocoding');
      expect(result.content[0].text).toContain('forward-geocode');
      expect(result.content[0].text).toContain('reverse-geocode');

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent!.operations).toBeDefined();
      expect(result.structuredContent!.operations!.length).toBe(2);
      expect(result.structuredContent!.operations![0]).toHaveProperty(
        'operationId'
      );
      expect(result.structuredContent!.operations![0]).toHaveProperty('name');
      expect(result.structuredContent!.operations![0]).toHaveProperty('method');
      expect(result.structuredContent!.operations![0]).toHaveProperty(
        'endpoint'
      );
    });

    it('should list operations for styles API', async () => {
      const result = await tool.execute({ api: 'styles' });

      expect(result.content[0].text).toContain('styles API');
      expect(result.content[0].text).toContain('Create Style');
      expect(result.content[0].text).toContain('Retrieve Style');
      expect(result.content[0].text).toContain('Update Style');
      expect(result.content[0].text).toContain('Delete Style');
      expect(result.content[0].text).toContain('List Styles');

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent!.operations).toBeDefined();
      expect(result.structuredContent!.operations!.length).toBe(5);
    });

    it('should handle case-insensitive API names', async () => {
      const result = await tool.execute({ api: 'GEOCODING' });

      expect(result.content[0].text).toContain('geocoding API');
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent!.operations).toBeDefined();
    });

    it('should return error for invalid API', async () => {
      const result = await tool.execute({ api: 'invalid-api' });

      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('not found');
      expect(result.content[0].text).toContain('Available APIs');
    });
  });

  describe('getOperationDetails', () => {
    it('should get details for forward-geocode operation', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode'
      });

      expect(result.content[0].text).toContain('Forward Geocoding');
      expect(result.content[0].text).toContain('HTTP Request');
      expect(result.content[0].text).toContain('GET');
      expect(result.content[0].text).toContain(
        '/geocoding/v5/{mode}/{query}.json'
      );
      expect(result.content[0].text).toContain('Path Parameters');
      expect(result.content[0].text).toContain('Query Parameters');
      expect(result.content[0].text).toContain('Authentication');
      expect(result.content[0].text).toContain('Required Scopes');
      expect(result.content[0].text).toContain('Rate Limits');

      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent!.operationDetails).toBeDefined();
      expect(result.structuredContent!.operationDetails!.operationId).toBe(
        'forward-geocode'
      );
      expect(result.structuredContent!.operationDetails!.method).toBe('GET');
      expect(
        result.structuredContent!.operationDetails!.requiredScopes
      ).toContain('geocoding:read');
    });

    it('should include examples when details=true', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode',
        details: true
      });

      expect(result.content[0].text).toContain('Example Request');
      expect(result.content[0].text).toContain('Example Response');
      expect(result.content[0].text).toContain('api.mapbox.com');
    });

    it('should not include examples when details=false', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode',
        details: false
      });

      expect(result.content[0].text).not.toContain('Example Request');
      expect(result.content[0].text).not.toContain('Example Response');
      expect(result.content[0].text).toContain('Add `{ details: true }`');
    });

    it('should handle case-insensitive operation names', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'FORWARD-GEOCODE'
      });

      expect(result.content[0].text).toContain('Forward Geocoding');
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent!.operationDetails).toBeDefined();
    });

    it('should return error for invalid operation', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'invalid-operation'
      });

      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('not found');
      expect(result.content[0].text).toContain('Available operations');
    });
  });

  describe('output schema validation', () => {
    it('should validate output for listing all APIs', async () => {
      const result = await tool.execute({});
      expect(result.structuredContent).toBeDefined();
      const validation = tool.outputSchema!.safeParse(result.structuredContent);

      expect(validation.success).toBe(true);
    });

    it('should validate output for listing operations', async () => {
      const result = await tool.execute({ api: 'geocoding' });
      expect(result.structuredContent).toBeDefined();
      const validation = tool.outputSchema!.safeParse(result.structuredContent);

      expect(validation.success).toBe(true);
    });

    it('should validate output for operation details', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode'
      });
      expect(result.structuredContent).toBeDefined();
      const validation = tool.outputSchema!.safeParse(result.structuredContent);

      expect(validation.success).toBe(true);
    });

    it('should validate output for operation details with examples', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode',
        details: true
      });
      expect(result.structuredContent).toBeDefined();
      const validation = tool.outputSchema!.safeParse(result.structuredContent);

      expect(validation.success).toBe(true);
    });
  });

  describe('API coverage', () => {
    it('should include all 7 priority APIs', async () => {
      const result = await tool.execute({});
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent!.apis).toBeDefined();
      const apis = result.structuredContent!.apis!.map((api) => api.api);

      expect(apis).toContain('geocoding');
      expect(apis).toContain('styles');
      expect(apis).toContain('tokens');
      expect(apis).toContain('static-images');
      expect(apis).toContain('directions');
      expect(apis).toContain('tilequery');
      expect(apis).toContain('feedback');
      expect(apis).toHaveLength(7);
    });

    it('should include operations for all APIs', async () => {
      const apis = [
        'geocoding',
        'styles',
        'tokens',
        'static-images',
        'directions',
        'tilequery',
        'feedback'
      ];

      for (const api of apis) {
        const result = await tool.execute({ api });
        expect(result.structuredContent).toBeDefined();
        expect(result.structuredContent!.operations).toBeDefined();
        expect(result.structuredContent!.operations!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('parameter formatting', () => {
    it('should format required and optional parameters correctly', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode'
      });

      const text = result.content[0].text;

      // Required parameters should show ✅
      expect(text).toContain('✅ Yes');
      // Optional parameters should show ❌
      expect(text).toContain('❌ No');
      // Should show parameter types
      expect(text).toContain('`string`');
      expect(text).toContain('`boolean`');
      expect(text).toContain('`number`');
    });

    it('should show enum values for parameters with enums', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode'
      });

      const text = result.content[0].text;

      // Should show enum options
      expect(text).toContain('Options:');
      expect(text).toContain('mapbox.places');
    });

    it('should show default values for parameters', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode'
      });

      const text = result.content[0].text;

      // Should show defaults
      expect(text).toContain('default:');
    });
  });

  describe('rate limits', () => {
    it('should display rate limit information', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode'
      });

      const text = result.content[0].text;

      expect(text).toContain('Rate Limits');
      expect(text).toContain('600 requests per minute');
      expect(text).toContain('Free tier: 100,000 requests/month');
    });
  });

  describe('authentication scopes', () => {
    it('should display required scopes for each operation', async () => {
      const result = await tool.execute({
        api: 'geocoding',
        operation: 'forward-geocode'
      });

      const text = result.content[0].text;

      expect(text).toContain('Authentication');
      expect(text).toContain('Required Scopes');
      expect(text).toContain('geocoding:read');
      expect(text).toContain('styles:read');
    });
  });
});
