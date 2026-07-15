// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidateExpressionTool } from '../../../src/tools/validate-expression-tool/ValidateExpressionTool.js';

describe('ValidateExpressionTool', () => {
  let tool: ValidateExpressionTool;

  beforeEach(() => {
    tool = new ValidateExpressionTool();
  });

  describe('tool metadata', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('validate_expression_tool');
      expect(tool.description).toBe(
        'Validates Mapbox style expressions for syntax, operators, and argument correctness'
      );
    });

    it('should have correct annotations', () => {
      expect(tool.annotations).toEqual({
        title: 'Validate Expression Tool',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      });
    });
  });

  describe('literal expressions', () => {
    it('should validate literal string', async () => {
      const input = {
        expression: JSON.stringify('test')
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.metadata.expressionType).toBe('literal');
    });

    it('should validate literal number', async () => {
      const input = {
        expression: 42
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
    });

    it('should validate literal boolean', async () => {
      const input = {
        expression: true
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });
  });

  describe('valid expressions', () => {
    it('should validate get expression', async () => {
      const input = {
        expression: ['get', 'name']
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.metadata.expressionType).toBe('get');
    });

    it('should validate case expression', async () => {
      const input = {
        expression: [
          'case',
          ['>', ['get', 'population'], 100000],
          'red',
          'blue'
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
    });

    it('should validate match expression', async () => {
      const input = {
        expression: [
          'match',
          ['get', 'type'],
          'park',
          'green',
          'water',
          'blue',
          'gray'
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
    });

    it('should validate step expression', async () => {
      const input = {
        expression: ['step', ['zoom'], 1, 10, 5, 20, 10]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });

    it('should validate math expression', async () => {
      const input = {
        expression: ['+', ['get', 'value1'], ['get', 'value2']]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });

    it('should validate string expression', async () => {
      const input = {
        expression: ['concat', 'Hello ', ['get', 'name']]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });

    it('should validate color expression', async () => {
      const input = {
        expression: ['rgb', 255, 0, 0]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });

    it('should validate comparison expression', async () => {
      const input = {
        expression: ['>', ['get', 'value'], 100]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });

    it('should accept JSON string input', async () => {
      const input = {
        expression: JSON.stringify(['get', 'name'])
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });
  });

  describe('invalid expressions', () => {
    it('should detect empty array', async () => {
      const input = {
        expression: []
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain(
        'Expression array cannot be empty'
      );
    });

    it('should detect non-string operator', async () => {
      const input = {
        expression: [123, 'value']
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain(
        'Expression operator must be a string'
      );
    });

    it('should detect unknown operator', async () => {
      const input = {
        expression: ['unknown_operator', 'value']
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain('Unknown expression operator');
    });

    it('should detect too few arguments', async () => {
      const input = {
        expression: ['get']
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain('Expected arguments of type');
    });

    it('should detect too many arguments', async () => {
      const input = {
        expression: ['pi', 1, 2, 3]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(parsed.errors[0].message).toContain('Expected arguments of type');
    });
  });

  describe('regression: issue #123 - zoom expression placement', () => {
    it('should accept a top-level zoom interpolation (previously a false positive)', async () => {
      const input = {
        expression: [
          'interpolate',
          ['linear'],
          ['zoom'],
          4,
          0.4,
          6,
          0.28,
          8,
          0
        ],
        context: 'paint'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
    });

    it('should reject zoom interpolations nested inside a case (previously a false negative)', async () => {
      const input = {
        expression: [
          'case',
          ['==', ['get', 'inside'], true],
          ['interpolate', ['linear'], ['zoom'], 4, 0.4, 6, 0.28, 8, 0],
          ['interpolate', ['linear'], ['zoom'], 4, 0.2, 6, 0.14, 8, 0]
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(
        parsed.errors.some((e: any) =>
          e.message.includes(
            '"zoom" expression may only be used as input to a top-level'
          )
        )
      ).toBe(true);
    });
  });

  describe('deeply nested (adversarial) expressions', () => {
    it('should reject an expression exceeding the max nesting depth instead of recursing unbounded', async () => {
      let expression: any = ['get', 'value'];
      for (let i = 0; i < 5000; i++) {
        expression = ['+', expression, 1];
      }

      const start = Date.now();
      const result = await tool.run({ expression });
      expect(Date.now() - start).toBeLessThan(1000);

      expect(result.isError).toBe(false);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(
        parsed.errors.some((e: any) =>
          e.message.includes('exceeds maximum nesting depth')
        )
      ).toBe(true);
    });

    it('should reject a wide (shallow but huge) expression instead of exhausting memory', async () => {
      // Depth stays ~1 here - this is the vector the depth cap alone does not catch.
      const expression: any = ['match', ['get', 'x']];
      for (let i = 0; i < 20_000; i++) {
        expression.push(i, 'red');
      }
      expression.push('blue');

      const start = Date.now();
      const result = await tool.run({ expression });
      expect(Date.now() - start).toBeLessThan(1000);

      expect(result.isError).toBe(false);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(false);
      expect(
        parsed.errors.some((e: any) =>
          e.message.includes('exceeds maximum size')
        )
      ).toBe(true);
    });

    it('should reject a JSON string expression exceeding the maximum length', async () => {
      const expression = JSON.stringify(['get', 'x'.repeat(300_000)]);

      const result = await tool.run({ expression });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('exceeds maximum length');
    });
  });

  describe('nested expressions', () => {
    it('should validate nested expressions', async () => {
      const input = {
        expression: [
          '+',
          ['*', 2, ['get', 'value1']],
          ['/', ['get', 'value2'], 2]
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.metadata.depth).toBeGreaterThan(0);
    });

    it('should warn about deeply nested expressions', async () => {
      // Create a deeply nested expression (depth > 10)
      let expression: any = ['get', 'value'];
      for (let i = 0; i < 12; i++) {
        expression = ['+', expression, 1];
      }

      const input = { expression };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
      expect(parsed.warnings.length).toBeGreaterThan(0);
      expect(
        parsed.warnings.some((w: any) => w.message.includes('deeply nested'))
      ).toBe(true);
    });

    it('should validate complex nested case expression', async () => {
      const input = {
        expression: [
          'case',
          ['==', ['get', 'type'], 'residential'],
          ['case', ['>', ['get', 'population'], 1000], 'red', 'orange'],
          ['==', ['get', 'type'], 'commercial'],
          'blue',
          'gray'
        ]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.valid).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle invalid JSON string', async () => {
      const input = {
        expression: '{invalid json'
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error parsing expression');
    });
  });

  describe('metadata', () => {
    it('should return expression metadata', async () => {
      const input = {
        expression: ['get', 'name']
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.expressionType).toBe('get');
      expect(parsed.metadata.returnType).toBe('any');
      expect(parsed.metadata.depth).toBeDefined();
    });

    it('should return correct depth for nested expressions', async () => {
      const input = {
        expression: ['+', ['+', 1, 2], ['+', 3, 4]]
      };

      const result = await tool.run(input);
      expect(result.isError).toBe(false);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.metadata.depth).toBe(1);
    });
  });
});
