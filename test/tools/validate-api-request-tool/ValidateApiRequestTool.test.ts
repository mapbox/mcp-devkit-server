// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidateApiRequestTool } from '../../../src/tools/validate-api-request-tool/ValidateApiRequestTool.js';

describe('ValidateApiRequestTool', () => {
  let tool: ValidateApiRequestTool;

  beforeEach(() => {
    tool = new ValidateApiRequestTool();
  });

  describe('metadata', () => {
    it('should have correct tool metadata', () => {
      expect(tool.name).toBe('validate_api_request_tool');
      expect(tool.description).toContain('Validate Mapbox API requests');
      expect(tool.annotations).toBeDefined();
      expect(tool.annotations.title).toBe('Validate API Request');
    });
  });

  describe('valid requests', () => {
    it('should validate a complete valid geocoding request', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'San Francisco'
          },
          query: {
            access_token: 'pk.test'
          }
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅');
      expect(result.content[0].text).toContain('Validation Passed');
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.valid).toBe(true);
    });

    it('should validate request with optional parameters', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'San Francisco'
          },
          query: {
            access_token: 'pk.test',
            limit: 5,
            autocomplete: true
          }
        }
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(true);
    });
  });

  describe('missing required parameters', () => {
    it('should detect missing required path parameters', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places'
            // missing 'query'
          },
          query: {
            access_token: 'pk.test'
          }
        }
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(false);
      expect(result.structuredContent.issues).toHaveLength(1);
      expect(result.structuredContent.issues[0]).toMatchObject({
        type: 'error',
        field: 'path.query',
        message: 'Required parameter missing'
      });
    });

    it('should detect missing required query parameters', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'test'
          }
          // missing query.access_token
        }
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(false);
      const accessTokenIssue = result.structuredContent.issues.find(
        (i) => i.field === 'query.access_token'
      );
      expect(accessTokenIssue).toBeDefined();
      expect(accessTokenIssue?.type).toBe('error');
    });
  });

  describe('type validation', () => {
    it('should detect type mismatches', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 123 // should be string
          },
          query: {
            access_token: 'pk.test',
            limit: 'not-a-number' // should be number
          }
        }
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(false);

      const queryTypeIssue = result.structuredContent.issues.find(
        (i) => i.field === 'path.query'
      );
      expect(queryTypeIssue).toBeDefined();
      expect(queryTypeIssue?.message).toContain('Invalid type');

      const limitTypeIssue = result.structuredContent.issues.find(
        (i) => i.field === 'query.limit'
      );
      expect(limitTypeIssue).toBeDefined();
      expect(limitTypeIssue?.message).toContain('Invalid type');
    });
  });

  describe('enum validation', () => {
    it('should detect invalid enum values', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'invalid-mode', // must be mapbox.places or mapbox.places-permanent
            query: 'test'
          },
          query: {
            access_token: 'pk.test'
          }
        }
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(false);

      const enumIssue = result.structuredContent.issues.find(
        (i) => i.field === 'path.mode'
      );
      expect(enumIssue).toBeDefined();
      expect(enumIssue?.message).toContain('not in allowed enum');
      expect(enumIssue?.expected).toContain('mapbox.places');
    });
  });

  describe('extra parameters', () => {
    it('should warn about unknown parameters', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'test'
          },
          query: {
            access_token: 'pk.test',
            unknownParam: 'value' // not in API definition
          }
        }
      });

      expect(result.isError).toBe(false);
      // Valid because warnings don't fail validation
      expect(result.structuredContent.valid).toBe(true);

      const warning = result.structuredContent.issues.find(
        (i) => i.field === 'query.unknownParam'
      );
      expect(warning).toBeDefined();
      expect(warning?.type).toBe('warning');
      expect(warning?.message).toContain('Unknown parameter');
    });
  });

  describe('token scope validation', () => {
    it('should validate token has required scopes', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'test'
          },
          query: {
            access_token: 'pk.test'
          }
        },
        tokenScopes: ['styles:read', 'geocoding:read'] // has required scopes
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(true);
      expect(result.structuredContent.scopes?.hasRequired).toBe(true);
      expect(result.content[0].text).toContain('Token has all required scopes');
    });

    it('should detect missing token scopes', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'test'
          },
          query: {
            access_token: 'pk.test'
          }
        },
        tokenScopes: ['styles:read'] // missing geocoding:read
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(false);
      expect(result.structuredContent.scopes?.hasRequired).toBe(false);
      expect(result.structuredContent.scopes?.missing).toContain(
        'geocoding:read'
      );

      const scopeIssue = result.structuredContent.issues.find(
        (i) => i.field === 'token.scopes'
      );
      expect(scopeIssue).toBeDefined();
      expect(scopeIssue?.type).toBe('error');
    });
  });

  describe('error handling', () => {
    it('should handle invalid API name', async () => {
      const result = await tool.run({
        api: 'invalid-api',
        operation: 'test',
        parameters: {}
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('not found');
    });

    it('should handle invalid operation name', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'invalid-operation',
        parameters: {}
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('parameter summary', () => {
    it('should provide parameter summary', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'test'
          },
          query: {
            access_token: 'pk.test',
            limit: 5
          }
        }
      });

      expect(result.structuredContent.parameters.path).toBeDefined();
      expect(result.structuredContent.parameters.path?.provided).toBe(2);
      expect(result.structuredContent.parameters.path?.required).toBe(2);
      expect(result.structuredContent.parameters.path?.missing).toHaveLength(0);

      expect(result.structuredContent.parameters.query).toBeDefined();
      expect(result.structuredContent.parameters.query?.provided).toBe(2);
    });
  });

  describe('styles API validation', () => {
    it('should validate styles create-style operation', async () => {
      const result = await tool.run({
        api: 'styles',
        operation: 'create-style',
        parameters: {
          path: {
            username: 'testuser'
          },
          query: {
            access_token: 'sk.test'
          },
          body: {
            name: 'My Style',
            version: 8,
            sources: {},
            layers: []
          }
        },
        tokenScopes: ['styles:write']
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(true);
      expect(result.structuredContent.operation.method).toBe('POST');
    });
  });

  describe('directions API validation', () => {
    it('should validate directions request', async () => {
      const result = await tool.run({
        api: 'directions',
        operation: 'directions',
        parameters: {
          path: {
            profile: 'driving',
            coordinates: '-122.42,37.78;-122.45,37.76'
          },
          query: {
            access_token: 'pk.test'
          }
        },
        tokenScopes: ['directions:read']
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(true);
    });

    it('should detect invalid routing profile', async () => {
      const result = await tool.run({
        api: 'directions',
        operation: 'directions',
        parameters: {
          path: {
            profile: 'flying', // invalid profile
            coordinates: '-122.42,37.78;-122.45,37.76'
          },
          query: {
            access_token: 'pk.test'
          }
        }
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.valid).toBe(false);

      const profileIssue = result.structuredContent.issues.find(
        (i) => i.field === 'path.profile'
      );
      expect(profileIssue).toBeDefined();
      expect(profileIssue?.message).toContain('not in allowed enum');
    });
  });

  describe('output schema validation', () => {
    it('should produce valid structured output', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'test'
          },
          query: {
            access_token: 'pk.test'
          }
        }
      });

      expect(result.structuredContent).toBeDefined();
      const validation = tool.outputSchema!.safeParse(result.structuredContent);
      expect(validation.success).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    it('should handle case-insensitive API names', async () => {
      const result = await tool.run({
        api: 'GEOCODING',
        operation: 'forward-geocode',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'test'
          },
          query: {
            access_token: 'pk.test'
          }
        }
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.operation.api).toBe('geocoding');
    });

    it('should handle case-insensitive operation names', async () => {
      const result = await tool.run({
        api: 'geocoding',
        operation: 'FORWARD-GEOCODE',
        parameters: {
          path: {
            mode: 'mapbox.places',
            query: 'test'
          },
          query: {
            access_token: 'pk.test'
          }
        }
      });

      expect(result.isError).toBe(false);
      expect(result.structuredContent.operation.operation).toBe(
        'forward-geocode'
      );
    });
  });
});
