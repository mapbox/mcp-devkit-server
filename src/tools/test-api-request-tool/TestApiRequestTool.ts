import { z } from 'zod';
import { MapboxApiBasedTool } from '../MapboxApiBasedTool.js';
import type { HttpRequest } from '../../utils/types.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolExecutionContext } from '../../utils/tracing.js';
import { TestApiRequestInputSchema } from './TestApiRequestTool.input.schema.js';
import {
  TestApiRequestOutputSchema,
  type TestApiRequestOutput
} from './TestApiRequestTool.output.schema.js';
import { MAPBOX_API_ENDPOINTS } from '../../constants/mapboxApiEndpoints.js';

/**
 * TestApiRequestTool - Make actual Mapbox API requests and generate code examples
 *
 * This tool executes real HTTP requests to Mapbox APIs and optionally generates
 * code snippets showing how to replicate the call in curl, JavaScript, and Python.
 * Unlike the validator tool which only checks request structure, this tool makes
 * actual API calls and returns real responses.
 *
 * @requires MAPBOX_ACCESS_TOKEN - Valid Mapbox access token with appropriate scopes
 *
 * @example
 * ```typescript
 * const tool = new TestApiRequestTool({ httpRequest });
 * const result = await tool.run({
 *   api: 'geocoding',
 *   operation: 'forward-geocode',
 *   parameters: {
 *     path: { mode: 'mapbox.places', query: 'San Francisco' }
 *   }
 * });
 * ```
 *
 * @see {@link https://docs.mapbox.com/api/} Mapbox API Documentation
 */
export class TestApiRequestTool extends MapboxApiBasedTool<
  typeof TestApiRequestInputSchema,
  typeof TestApiRequestOutputSchema
> {
  readonly name = 'test_api_request_tool';
  readonly description =
    'Execute actual Mapbox API requests and generate code examples. Makes real HTTP calls to test endpoints and returns actual responses, with optional code generation for curl, JavaScript, and Python showing how to replicate the call.';
  readonly annotations = {
    title: 'Test API Request',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  };

  constructor({ httpRequest }: { httpRequest: HttpRequest }) {
    super({
      inputSchema: TestApiRequestInputSchema,
      outputSchema: TestApiRequestOutputSchema,
      httpRequest
    });
  }

  /**
   * Execute the tool logic
   * @param input - Validated input from TestApiRequestInputSchema
   * @param accessToken - Mapbox access token
   * @param context - Tool execution context for tracing
   * @returns CallToolResult with structured output
   */
  protected async execute(
    input: z.infer<typeof TestApiRequestInputSchema>,
    accessToken: string,
    _context: ToolExecutionContext
  ): Promise<CallToolResult> {
    const startTime = Date.now();

    try {
      // Find the API endpoint definition
      const apiDefinition = MAPBOX_API_ENDPOINTS.find(
        (api) => api.api.toLowerCase() === input.api.toLowerCase()
      );

      if (!apiDefinition) {
        const availableApis = MAPBOX_API_ENDPOINTS.map((api) => api.api).join(
          ', '
        );
        return {
          content: [
            {
              type: 'text',
              text: `API "${input.api}" not found. Available APIs: ${availableApis}`
            }
          ],
          isError: true
        };
      }

      const operation = apiDefinition.operations.find(
        (op) => op.operationId.toLowerCase() === input.operation.toLowerCase()
      );

      if (!operation) {
        const availableOps = apiDefinition.operations
          .map((op) => op.operationId)
          .join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `Operation "${input.operation}" not found in ${input.api} API. Available operations: ${availableOps}`
            }
          ],
          isError: true
        };
      }

      // Build the URL
      const { url, queryParams } = this.buildUrl(
        operation.endpoint,
        input.parameters.path || {},
        input.parameters.query || {},
        accessToken
      );

      // Prepare request options
      const requestOptions: RequestInit = {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // Add body for POST/PUT/PATCH requests
      if (
        input.parameters.body &&
        ['POST', 'PUT', 'PATCH'].includes(operation.method)
      ) {
        requestOptions.body = JSON.stringify(input.parameters.body);
      }

      // Make the actual HTTP request
      const response = await this.httpRequest(url, requestOptions);
      const executionTime = Date.now() - startTime;

      // Parse response
      let responseData: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Build the result
      const result: TestApiRequestOutput = {
        success: response.ok,
        statusCode: response.status,
        request: {
          method: operation.method,
          url: url,
          headers: requestOptions.headers as Record<string, string>
        },
        response: {
          data: responseData,
          headers: this.extractRelevantHeaders(response),
          error: !response.ok
            ? `HTTP ${response.status}: ${response.statusText}`
            : undefined
        },
        executionTime
      };

      // Generate code snippets if requested
      if (input.generateCode) {
        result.codeSnippets = this.generateCodeSnippets(
          operation.method,
          url,
          queryParams,
          input.parameters.body,
          input.codeLanguages || ['curl', 'javascript', 'python']
        );
      }

      // Format text output
      const text = this.formatTextOutput(result, operation);

      return {
        content: [{ type: 'text', text }],
        structuredContent: result,
        isError: !response.ok
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const executionTime = Date.now() - startTime;
      this.log('error', `${this.name}: ${errorMessage}`);

      const result: TestApiRequestOutput = {
        success: false,
        statusCode: 0,
        request: {
          method: 'GET',
          url: ''
        },
        response: {
          error: errorMessage
        },
        executionTime
      };

      return {
        content: [
          { type: 'text', text: `Error executing API request: ${errorMessage}` }
        ],
        structuredContent: result,
        isError: true
      };
    }
  }

  /**
   * Build the full URL from endpoint template and parameters
   */
  private buildUrl(
    endpointTemplate: string,
    pathParams: Record<string, any>,
    queryParams: Record<string, any>,
    accessToken: string
  ): { url: string; queryParams: Record<string, any> } {
    // Replace path parameters in template
    let endpoint = endpointTemplate;
    for (const [key, value] of Object.entries(pathParams)) {
      endpoint = endpoint.replace(
        `{${key}}`,
        encodeURIComponent(String(value))
      );
    }

    // Build full URL
    const baseUrl = MapboxApiBasedTool.mapboxApiEndpoint.replace(/\/$/, '');
    let url = `${baseUrl}${endpoint}`;

    // Add query parameters
    const allQueryParams = { ...queryParams, access_token: accessToken };
    const queryString = Object.entries(allQueryParams)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
      .join('&');

    if (queryString) {
      url += `?${queryString}`;
    }

    return { url, queryParams: allQueryParams };
  }

  /**
   * Extract relevant response headers
   */
  private extractRelevantHeaders(response: Response): Record<string, string> {
    const relevantHeaders = [
      'content-type',
      'x-rate-limit-interval',
      'x-rate-limit-limit',
      'x-rate-limit-reset',
      'cache-control'
    ];

    const headers: Record<string, string> = {};
    for (const header of relevantHeaders) {
      const value = response.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }
    return headers;
  }

  /**
   * Generate code snippets for various languages
   */
  private generateCodeSnippets(
    method: string,
    url: string,
    queryParams: Record<string, any>,
    body: Record<string, any> | undefined,
    languages: Array<'curl' | 'javascript' | 'python'>
  ): Array<{
    language: 'curl' | 'javascript' | 'python';
    code: string;
    description?: string;
  }> {
    const snippets: Array<{
      language: 'curl' | 'javascript' | 'python';
      code: string;
      description?: string;
    }> = [];

    for (const lang of languages) {
      if (lang === 'curl') {
        snippets.push({
          language: 'curl',
          code: this.generateCurlSnippet(method, url, body),
          description: 'Execute this API call using curl from the command line'
        });
      } else if (lang === 'javascript') {
        snippets.push({
          language: 'javascript',
          code: this.generateJavaScriptSnippet(method, url, queryParams, body),
          description: 'Execute this API call using JavaScript fetch API'
        });
      } else if (lang === 'python') {
        snippets.push({
          language: 'python',
          code: this.generatePythonSnippet(method, url, queryParams, body),
          description: 'Execute this API call using Python requests library'
        });
      }
    }

    return snippets;
  }

  /**
   * Generate curl command snippet
   */
  private generateCurlSnippet(
    method: string,
    url: string,
    body?: Record<string, any>
  ): string {
    let curl = `curl -X ${method}`;

    if (body) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body, null, 2)}'`;
    }

    curl += ` \\\n  "${url}"`;
    return curl;
  }

  /**
   * Generate JavaScript fetch snippet
   */
  private generateJavaScriptSnippet(
    method: string,
    url: string,
    queryParams: Record<string, any>,
    body?: Record<string, any>
  ): string {
    const urlWithoutToken = url.replace(
      /access_token=[^&]+/,
      'access_token=YOUR_ACCESS_TOKEN'
    );

    let code = `const response = await fetch('${urlWithoutToken}', {\n`;
    code += `  method: '${method}'`;

    if (body) {
      code += `,\n  headers: {\n    'Content-Type': 'application/json'\n  }`;
      code += `,\n  body: JSON.stringify(${JSON.stringify(body, null, 2)})`;
    }

    code += `\n});\n\nconst data = await response.json();\nconsole.log(data);`;
    return code;
  }

  /**
   * Generate Python requests snippet
   */
  private generatePythonSnippet(
    method: string,
    url: string,
    queryParams: Record<string, any>,
    body?: Record<string, any>
  ): string {
    const urlWithoutToken = url.replace(
      /access_token=[^&]+/,
      'access_token=YOUR_ACCESS_TOKEN'
    );

    let code = `import requests\n\n`;
    code += `response = requests.${method.toLowerCase()}(\n`;
    code += `    '${urlWithoutToken}'`;

    if (body) {
      code += `,\n    json=${JSON.stringify(body, null, 2)}`;
    }

    code += `\n)\n\ndata = response.json()\nprint(data)`;
    return code;
  }

  /**
   * Format the text output
   */
  private formatTextOutput(
    result: TestApiRequestOutput,
    operation: any
  ): string {
    let text = `# API Request Result\n\n`;
    text += `**Status:** ${result.success ? '✓ Success' : '✗ Failed'} (${result.statusCode})\n`;
    text += `**Operation:** ${operation.name}\n`;
    text += `**Method:** ${result.request.method}\n`;
    text += `**URL:** ${result.request.url}\n`;
    text += `**Execution Time:** ${result.executionTime}ms\n\n`;

    if (result.response.error) {
      text += `## Error\n\n\`\`\`\n${result.response.error}\n\`\`\`\n\n`;
    }

    if (result.response.data) {
      text += `## Response Data\n\n\`\`\`json\n${JSON.stringify(result.response.data, null, 2)}\n\`\`\`\n\n`;
    }

    if (
      result.response.headers &&
      Object.keys(result.response.headers).length > 0
    ) {
      text += `## Response Headers\n\n`;
      for (const [key, value] of Object.entries(result.response.headers)) {
        text += `- **${key}:** ${value}\n`;
      }
      text += `\n`;
    }

    if (result.codeSnippets && result.codeSnippets.length > 0) {
      text += `## Code Examples\n\n`;
      for (const snippet of result.codeSnippets) {
        text += `### ${snippet.language.toUpperCase()}\n\n`;
        if (snippet.description) {
          text += `${snippet.description}\n\n`;
        }
        text += `\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n\n`;
      }
    }

    return text;
  }
}
