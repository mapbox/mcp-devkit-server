import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BoundingBoxTool } from './tools/bounding-box-tool/BoundingBoxTool.js';
import { CountryBoundingBoxTool } from './tools/bounding-box-tool/CountryBoundingBoxTool.js';
import { CoordinateConversionTool } from './tools/coordinate-conversion-tool/CoordinateConversionTool.js';
import { CreateStyleTool } from './tools/create-style-tool/CreateStyleTool.js';
import { CreateTokenTool } from './tools/create-token-tool/CreateTokenTool.js';
import { DeleteStyleTool } from './tools/delete-style-tool/DeleteStyleTool.js';
import { GeojsonPreviewTool } from './tools/geojson-preview-tool/GeojsonPreviewTool.js';
import { ListStylesTool } from './tools/list-styles-tool/ListStylesTool.js';
import { ListTokensTool } from './tools/list-tokens-tool/ListTokensTool.js';
import { PreviewStyleTool } from './tools/preview-style-tool/PreviewStyleTool.js';
import { RetrieveStyleTool } from './tools/retrieve-style-tool/RetrieveStyleTool.js';
import { UpdateStyleTool } from './tools/update-style-tool/UpdateStyleTool.js';
import { patchGlobalFetch } from './utils/requestUtils.js';
import { getVersionInfo } from './utils/versionUtils.js';

// Get version info and patch fetch
const versionInfo = getVersionInfo();
patchGlobalFetch(versionInfo);

// Create an MCP server
const server = new McpServer(
  {
    name: versionInfo.name,
    version: versionInfo.version
  },
  {
    capabilities: {
      logging: {},
      tools: {}
    }
  }
);

// INSERT NEW TOOL IMPORT HERE

// Register tools
// INSERT NEW TOOL REGISTRATION HERE
new ListStylesTool().installTo(server);
new CreateStyleTool().installTo(server);
new RetrieveStyleTool().installTo(server);
new UpdateStyleTool().installTo(server);
new DeleteStyleTool().installTo(server);
new PreviewStyleTool().installTo(server);
new GeojsonPreviewTool().installTo(server);
new CreateTokenTool().installTo(server);
new ListTokensTool().installTo(server);
new BoundingBoxTool().installTo(server);
new CountryBoundingBoxTool().installTo(server);
new CoordinateConversionTool().installTo(server);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
