import { z } from 'zod';
import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ValidateApiRequestInputSchema } from './ValidateApiRequestTool.input.schema.js';
import {
  ValidateApiRequestOutputSchema,
  type ValidateApiRequestOutput
} from './ValidateApiRequestTool.output.schema.js';
import {
  MAPBOX_API_ENDPOINTS,
  type Parameter
} from '../../constants/mapboxApiEndpoints.js';

/**
 * ValidateApiRequestTool - Validates API requests against Mapbox API endpoint definitions
 *
 * Performs comprehensive validation of API requests including:
 * - Required parameter checking
 * - Parameter type validation
 * - Enum constraint validation
 * - Token scope verification
 * - Missing/extra parameter detection
 *
 * Uses the curated endpoint definitions from mapboxApiEndpoints.ts to ensure
 * requests conform to API specifications before making actual calls.
 */
export class ValidateApiRequestTool extends BaseTool<
  typeof ValidateApiRequestInputSchema,
  typeof ValidateApiRequestOutputSchema
> {
  readonly name = 'validate_api_request_tool';
  readonly description =
    'Validate Mapbox API requests against endpoint definitions. Checks required parameters, types, enum constraints, and token scopes. Returns detailed validation results with specific error messages for each issue found.';
  readonly annotations = {
    title: 'Validate API Request',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  };

  constructor() {
    super({
      inputSchema: ValidateApiRequestInputSchema,
      outputSchema: ValidateApiRequestOutputSchema
    });
  }

  protected async execute(
    input: z.infer<typeof ValidateApiRequestInputSchema>
  ): Promise<CallToolResult> {
    try {
      // Find the API endpoint definition
      const apiEndpoint = MAPBOX_API_ENDPOINTS.find(
        (endpoint) => endpoint.api.toLowerCase() === input.api.toLowerCase()
      );

      if (!apiEndpoint) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ API "${input.api}" not found. Use explore_mapbox_api_tool to see available APIs.`
            }
          ],
          isError: true
        };
      }

      // Find the operation
      const operation = apiEndpoint.operations.find(
        (op) => op.operationId.toLowerCase() === input.operation.toLowerCase()
      );

      if (!operation) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Operation "${input.operation}" not found in ${apiEndpoint.api} API. Use explore_mapbox_api_tool to see available operations.`
            }
          ],
          isError: true
        };
      }

      // Perform validation
      const issues: Array<{
        type: 'error' | 'warning';
        field: string;
        message: string;
        expected?: string;
        received?: any;
      }> = [];

      // Validate path parameters
      const pathValidation = this.validateParameters(
        'path',
        operation.pathParameters || [],
        input.parameters.path || {},
        issues
      );

      // Validate query parameters
      const queryValidation = this.validateParameters(
        'query',
        operation.queryParameters || [],
        input.parameters.query || {},
        issues
      );

      // Validate body parameters
      const bodyValidation = this.validateParameters(
        'body',
        operation.bodyParameters || [],
        input.parameters.body || {},
        issues
      );

      // Validate token scopes
      let scopeValidation;
      if (input.tokenScopes) {
        scopeValidation = this.validateScopes(
          operation.requiredScopes,
          input.tokenScopes,
          issues
        );
      }

      const isValid = issues.filter((i) => i.type === 'error').length === 0;

      // Build validation result
      const result: ValidateApiRequestOutput = {
        valid: isValid,
        operation: {
          api: apiEndpoint.api,
          operation: operation.operationId,
          method: operation.method,
          endpoint: operation.endpoint
        },
        issues,
        parameters: {
          ...(pathValidation && { path: pathValidation }),
          ...(queryValidation && { query: queryValidation }),
          ...(bodyValidation && { body: bodyValidation })
        },
        ...(scopeValidation && { scopes: scopeValidation })
      };

      // Format as markdown
      const text = this.formatValidationResult(result);

      return {
        content: [{ type: 'text', text }],
        structuredContent: result,
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
   * Validate parameters against endpoint definition
   */
  private validateParameters(
    paramType: string,
    definition: Parameter[],
    provided: Record<string, any>,
    issues: Array<{
      type: 'error' | 'warning';
      field: string;
      message: string;
      expected?: string;
      received?: any;
    }>
  ) {
    const providedKeys = Object.keys(provided);
    const requiredParams = definition.filter((p) => p.required);
    const optionalParams = definition.filter((p) => !p.required);
    const allDefinedKeys = definition.map((p) => p.name);

    const missing = requiredParams
      .filter((p) => !providedKeys.includes(p.name))
      .map((p) => p.name);

    const extra = providedKeys.filter((k) => !allDefinedKeys.includes(k));

    // Check missing required parameters
    missing.forEach((paramName) => {
      const param = definition.find((p) => p.name === paramName)!;
      issues.push({
        type: 'error',
        field: `${paramType}.${paramName}`,
        message: `Required parameter missing`,
        expected: param.type,
        received: undefined
      });
    });

    // Check extra parameters
    extra.forEach((paramName) => {
      issues.push({
        type: 'warning',
        field: `${paramType}.${paramName}`,
        message: `Unknown parameter (not in API definition)`,
        received: provided[paramName]
      });
    });

    // Validate provided parameters
    providedKeys.forEach((key) => {
      const param = definition.find((p) => p.name === key);
      if (!param) return; // Already flagged as extra

      const value = provided[key];

      // Type validation
      const typeValid = this.validateType(value, param.type);
      if (!typeValid) {
        issues.push({
          type: 'error',
          field: `${paramType}.${key}`,
          message: `Invalid type`,
          expected: param.type,
          received: typeof value
        });
      }

      // Enum validation
      if (param.enum && param.enum.length > 0) {
        if (!param.enum.includes(String(value))) {
          issues.push({
            type: 'error',
            field: `${paramType}.${key}`,
            message: `Value not in allowed enum`,
            expected: param.enum.join(', '),
            received: value
          });
        }
      }
    });

    return {
      provided: providedKeys.length,
      required: requiredParams.length,
      optional: optionalParams.length,
      missing,
      extra
    };
  }

  /**
   * Validate a value against an expected type
   */
  private validateType(value: any, expectedType: string): boolean {
    const actualType = typeof value;
    const typeMap: Record<string, string[]> = {
      string: ['string'],
      number: ['number'],
      boolean: ['boolean'],
      array: ['object'], // Arrays are objects in JS
      object: ['object']
    };

    const validTypes = typeMap[expectedType.toLowerCase()] || [
      expectedType.toLowerCase()
    ];

    // Special handling for arrays
    if (expectedType.toLowerCase() === 'array') {
      return Array.isArray(value);
    }

    return validTypes.includes(actualType);
  }

  /**
   * Validate token scopes
   */
  private validateScopes(
    requiredScopes: string[],
    providedScopes: string[],
    issues: Array<{
      type: 'error' | 'warning';
      field: string;
      message: string;
      expected?: string;
      received?: any;
    }>
  ) {
    const missing = requiredScopes.filter(
      (scope) => !providedScopes.includes(scope)
    );

    missing.forEach((scope) => {
      issues.push({
        type: 'error',
        field: 'token.scopes',
        message: `Missing required scope: ${scope}`,
        expected: requiredScopes.join(', '),
        received: providedScopes.join(', ')
      });
    });

    return {
      hasRequired: missing.length === 0,
      required: requiredScopes,
      provided: providedScopes,
      missing
    };
  }

  /**
   * Format validation result as markdown
   */
  private formatValidationResult(result: ValidateApiRequestOutput): string {
    let text = '';

    if (result.valid) {
      text += '✅ **Validation Passed**\n\n';
      text += `The request is valid for **${result.operation.method} ${result.operation.endpoint}**\n\n`;
    } else {
      text += '❌ **Validation Failed**\n\n';
      text += `Found ${result.issues.filter((i) => i.type === 'error').length} error(s) and ${result.issues.filter((i) => i.type === 'warning').length} warning(s)\n\n`;
    }

    text += `## Operation Details\n\n`;
    text += `- **API:** ${result.operation.api}\n`;
    text += `- **Operation:** ${result.operation.operation}\n`;
    text += `- **Method:** ${result.operation.method}\n`;
    text += `- **Endpoint:** ${result.operation.endpoint}\n\n`;

    // Parameter summary
    text += `## Parameter Summary\n\n`;

    if (result.parameters.path) {
      text += `### Path Parameters\n`;
      text += `- Provided: ${result.parameters.path.provided}\n`;
      text += `- Required: ${result.parameters.path.required}\n`;
      text += `- Missing: ${result.parameters.path.missing.length > 0 ? result.parameters.path.missing.join(', ') : 'None'}\n\n`;
    }

    if (result.parameters.query) {
      text += `### Query Parameters\n`;
      text += `- Provided: ${result.parameters.query.provided}\n`;
      text += `- Required: ${result.parameters.query.required}\n`;
      text += `- Missing: ${result.parameters.query.missing.length > 0 ? result.parameters.query.missing.join(', ') : 'None'}\n\n`;
    }

    if (result.parameters.body) {
      text += `### Body Parameters\n`;
      text += `- Provided: ${result.parameters.body.provided}\n`;
      text += `- Required: ${result.parameters.body.required}\n`;
      text += `- Missing: ${result.parameters.body.missing.length > 0 ? result.parameters.body.missing.join(', ') : 'None'}\n\n`;
    }

    // Scope validation
    if (result.scopes) {
      text += `## Token Scopes\n\n`;
      if (result.scopes.hasRequired) {
        text += `✅ Token has all required scopes\n\n`;
      } else {
        text += `❌ Token missing required scopes: ${result.scopes.missing?.join(', ')}\n\n`;
      }
    }

    // Issues
    if (result.issues.length > 0) {
      text += `## Issues\n\n`;

      const errors = result.issues.filter((i) => i.type === 'error');
      const warnings = result.issues.filter((i) => i.type === 'warning');

      if (errors.length > 0) {
        text += `### Errors (${errors.length})\n\n`;
        errors.forEach((issue, idx) => {
          text += `${idx + 1}. **${issue.field}**: ${issue.message}\n`;
          if (issue.expected) {
            text += `   - Expected: ${issue.expected}\n`;
          }
          if (issue.received !== undefined) {
            text += `   - Received: ${JSON.stringify(issue.received)}\n`;
          }
          text += '\n';
        });
      }

      if (warnings.length > 0) {
        text += `### Warnings (${warnings.length})\n\n`;
        warnings.forEach((issue, idx) => {
          text += `${idx + 1}. **${issue.field}**: ${issue.message}\n`;
          if (issue.received !== undefined) {
            text += `   - Received: ${JSON.stringify(issue.received)}\n`;
          }
          text += '\n';
        });
      }
    }

    if (result.valid) {
      text += '\n✅ Request is ready to be sent to the Mapbox API\n';
    } else {
      text += '\n❌ Fix the errors above before sending the request\n';
    }

    return text;
  }
}
