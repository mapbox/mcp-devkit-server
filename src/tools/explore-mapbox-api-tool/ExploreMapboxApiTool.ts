import { BaseTool } from '../BaseTool.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  ExploreMapboxApiInputSchema,
  type ExploreMapboxApiInput
} from './ExploreMapboxApiTool.input.schema.js';
import { ExploreMapboxApiOutputSchema } from './ExploreMapboxApiTool.output.schema.js';
import {
  MAPBOX_API_ENDPOINTS,
  type MapboxApiEndpoint,
  type ApiOperation,
  type Parameter
} from '../../constants/mapboxApiEndpoints.js';

/**
 * Tool for exploring Mapbox API endpoints and operations.
 *
 * Provides structured, queryable information about Mapbox APIs including:
 * - Available APIs and their operations
 * - Endpoint URLs and HTTP methods
 * - Required parameters and their types
 * - Authentication scopes
 * - Rate limits
 * - Example requests and responses
 *
 * This complements search_mapbox_docs_tool by providing structured API reference
 * data instead of prose documentation.
 */
export class ExploreMapboxApiTool extends BaseTool<
  typeof ExploreMapboxApiInputSchema,
  typeof ExploreMapboxApiOutputSchema
> {
  name = 'explore_mapbox_api_tool' as const;
  description =
    'Explore Mapbox API endpoints, operations, parameters, and authentication requirements. Get structured information about available APIs, their operations, required parameters, token scopes, and rate limits. Use without parameters to list all APIs, with api parameter to list operations, or with api + operation to get full endpoint details.';

  annotations = {
    title: 'Explore Mapbox API'
  };

  constructor() {
    super({
      inputSchema: ExploreMapboxApiInputSchema,
      outputSchema: ExploreMapboxApiOutputSchema
    });
  }

  async execute(input: ExploreMapboxApiInput): Promise<CallToolResult> {
    // Case 1: List all available APIs
    if (!input.api) {
      return this.listAllApis();
    }

    // Find the requested API
    const apiEndpoint = MAPBOX_API_ENDPOINTS.find(
      (endpoint) => endpoint.api.toLowerCase() === input.api!.toLowerCase()
    );

    if (!apiEndpoint) {
      const availableApis = MAPBOX_API_ENDPOINTS.map((e) => e.api).join(', ');
      return {
        content: [
          {
            type: 'text',
            text: `❌ API "${input.api}" not found.\n\nAvailable APIs: ${availableApis}\n\nUse explore_mapbox_api_tool without parameters to see all APIs with descriptions.`
          }
        ]
      };
    }

    // Case 2: List operations for a specific API
    if (!input.operation) {
      return this.listApiOperations(apiEndpoint);
    }

    // Case 3: Get details for a specific operation
    const operation = apiEndpoint.operations.find(
      (op) => op.operationId.toLowerCase() === input.operation!.toLowerCase()
    );

    if (!operation) {
      const availableOps = apiEndpoint.operations
        .map((op) => op.operationId)
        .join(', ');
      return {
        content: [
          {
            type: 'text',
            text: `❌ Operation "${input.operation}" not found in ${apiEndpoint.api} API.\n\nAvailable operations: ${availableOps}`
          }
        ]
      };
    }

    return this.getOperationDetails(
      apiEndpoint,
      operation,
      input.details || false
    );
  }

  /**
   * List all available Mapbox APIs with summary information
   */
  private listAllApis(): CallToolResult {
    const apiSummaries = MAPBOX_API_ENDPOINTS.map((endpoint) => ({
      api: endpoint.api,
      category: endpoint.category,
      description: endpoint.description,
      docsUrl: endpoint.docsUrl,
      operationCount: endpoint.operations.length
    }));

    let text = '# Mapbox APIs\n\n';
    text += 'Available APIs for geospatial operations:\n\n';

    for (const api of apiSummaries) {
      text += `## ${api.api}\n`;
      text += `**Category:** ${api.category}\n`;
      text += `**Operations:** ${api.operationCount}\n`;
      text += `**Description:** ${api.description}\n`;
      text += `**Documentation:** ${api.docsUrl}\n\n`;
    }

    text += '\n---\n\n';
    text += '**Next steps:**\n';
    text +=
      '- Use `{ api: "api-name" }` to list operations for a specific API\n';
    text +=
      '- Use `{ api: "api-name", operation: "operation-id" }` for full endpoint details\n';
    text +=
      '- Add `{ details: true }` to include example requests and responses\n';

    return {
      content: [{ type: 'text', text }],
      structuredContent: {
        apis: apiSummaries
      }
    };
  }

  /**
   * List all operations for a specific API
   */
  private listApiOperations(apiEndpoint: MapboxApiEndpoint): CallToolResult {
    const operationSummaries = apiEndpoint.operations.map((op) => ({
      operationId: op.operationId,
      name: op.name,
      method: op.method,
      endpoint: op.endpoint,
      description: op.description
    }));

    let text = `# ${apiEndpoint.api} API\n\n`;
    text += `**Category:** ${apiEndpoint.category}\n`;
    text += `**Description:** ${apiEndpoint.description}\n`;
    text += `**Documentation:** ${apiEndpoint.docsUrl}\n\n`;
    text += `## Operations (${apiEndpoint.operations.length})\n\n`;

    for (const op of operationSummaries) {
      text += `### ${op.name}\n`;
      text += `**Operation ID:** \`${op.operationId}\`\n`;
      text += `**Method:** \`${op.method}\`\n`;
      text += `**Endpoint:** \`${op.endpoint}\`\n`;
      text += `**Description:** ${op.description}\n\n`;
    }

    text += '\n---\n\n';
    text += '**Next steps:**\n';
    text += `- Use \`{ api: "${apiEndpoint.api}", operation: "operation-id" }\` for full details\n`;
    text +=
      '- Add `{ details: true }` to include example requests and responses\n';

    return {
      content: [{ type: 'text', text }],
      structuredContent: {
        operations: operationSummaries
      }
    };
  }

  /**
   * Get full details for a specific operation
   */
  private getOperationDetails(
    apiEndpoint: MapboxApiEndpoint,
    operation: ApiOperation,
    includeDetails: boolean
  ): CallToolResult {
    let text = `# ${operation.name}\n\n`;
    text += `**API:** ${apiEndpoint.api}\n`;
    text += `**Operation ID:** \`${operation.operationId}\`\n`;
    text += `**Description:** ${operation.description}\n\n`;

    // HTTP Details
    text += `## HTTP Request\n\n`;
    text += `**Method:** \`${operation.method}\`\n`;
    text += `**Endpoint:** \`${operation.endpoint}\`\n`;
    text += `**Base URL:** \`https://api.mapbox.com\`\n\n`;

    // Parameters
    if (operation.pathParameters && operation.pathParameters.length > 0) {
      text += `### Path Parameters\n\n`;
      text += this.formatParameters(operation.pathParameters);
    }

    if (operation.queryParameters && operation.queryParameters.length > 0) {
      text += `### Query Parameters\n\n`;
      text += this.formatParameters(operation.queryParameters);
    }

    if (operation.bodyParameters && operation.bodyParameters.length > 0) {
      text += `### Body Parameters\n\n`;
      text += this.formatParameters(operation.bodyParameters);
    }

    // Authentication
    text += `## Authentication\n\n`;
    text += `**Required Scopes:** ${operation.requiredScopes.map((s) => `\`${s}\``).join(', ')}\n\n`;
    text +=
      'Your access token must have these scopes. Use `list_tokens_tool` to check token scopes.\n\n';

    // Rate Limits
    if (operation.rateLimit) {
      text += `## Rate Limits\n\n`;
      text += `**Limit:** ${operation.rateLimit.requests} requests per ${operation.rateLimit.period}\n`;
      if (operation.rateLimit.notes) {
        text += `**Notes:** ${operation.rateLimit.notes}\n`;
      }
      text += '\n';
    }

    // Examples (only if details=true)
    if (includeDetails) {
      if (operation.exampleRequest) {
        text += `## Example Request\n\n`;
        text += '```\n';
        text += operation.exampleRequest;
        text += '\n```\n\n';
      }

      if (operation.exampleResponse) {
        text += `## Example Response\n\n`;
        text += '```json\n';
        text += operation.exampleResponse;
        text += '\n```\n\n';
      }
    } else {
      text += '\n---\n\n';
      text +=
        '**Tip:** Add `{ details: true }` to see example request and response.\n';
    }

    // Documentation link
    text += `\n**Full Documentation:** ${apiEndpoint.docsUrl}\n`;

    return {
      content: [{ type: 'text', text }],
      structuredContent: {
        operationDetails: operation
      }
    };
  }

  /**
   * Format parameter list as markdown table
   */
  private formatParameters(parameters: Parameter[]): string {
    let text = '| Name | Type | Required | Description |\n';
    text += '|------|------|----------|-------------|\n';

    for (const param of parameters) {
      const name = `\`${param.name}\``;
      const type = `\`${param.type}\``;
      const required = param.required ? '✅ Yes' : '❌ No';
      let description = param.description;

      if (param.default !== undefined) {
        description += ` (default: \`${JSON.stringify(param.default)}\`)`;
      }

      if (param.enum && param.enum.length > 0) {
        description += ` Options: ${param.enum.map((e) => `\`${e}\``).join(', ')}`;
      }

      text += `| ${name} | ${type} | ${required} | ${description} |\n`;
    }

    text += '\n';
    return text;
  }
}
