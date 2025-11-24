#!/usr/bin/env node

import { CreateStyleTool } from './dist/esm/tools/create-style-tool/CreateStyleTool.js';

const tool = new CreateStyleTool({
  httpRequest: async (url, options) => {
    return await fetch(url, options);
  }
});

const testInput = {
  name: 'Test Dark Style',
  style: {
    version: 8,
    name: 'Test Dark Style',
    sources: {
      'mapbox-streets': {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8'
      }
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#1A1A2E'
        }
      }
    ]
  }
};

console.log(
  'Testing create_style_tool with input:',
  JSON.stringify(testInput, null, 2)
);

try {
  const result = await tool.run(testInput, process.env.MAPBOX_ACCESS_TOKEN);
  console.log('Success!', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', error);
}
