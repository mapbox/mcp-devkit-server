import { NextRequest, NextResponse } from 'next/server';
import { createMapboxAgent } from '@/lib/mastra';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes timeout

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // Create the agent with MCP tools
    const agent = await createMapboxAgent();

    // Collect UI resources from tool results
    const uiResources: any[] = [];

    // Generate response using the agent
    // Pass messages as string array (just the content of each message)
    const response = await agent.generate(lastMessage, {
      maxSteps: 3, // Limit tool call iterations to prevent loops
      onStepFinish: ({ toolResults }) => {
        // Extract MCP-UI resources from tool results
        if (toolResults) {
          toolResults.forEach((toolResult) => {
            // Content is inside payload.result.content
            const result = toolResult.payload?.result as
              | { content?: any[] }
              | undefined;
            const content = result?.content;

            // Look for MCP-UI resources in the content array
            if (content && Array.isArray(content)) {
              content.forEach((contentItem: any) => {
                // MCP returns resources with type='resource' and nested resource object
                if (contentItem.type === 'resource' && contentItem.resource) {
                  uiResources.push(contentItem.resource);
                }
              });
            }
          });
        }
      }
    });

    // Format resources for the frontend
    const formattedResources = uiResources.map((resource) => {
      // MCP-UI resources have URIs starting with ui://
      // For Mapbox, the actual URL is in the 'text' field
      if (resource.uri?.startsWith('ui://mapbox/')) {
        return {
          type: 'ui-resource',
          // Use the text field which contains the actual URL with token
          uri: resource.text || resource.uri,
          title: resource.title || 'Style Preview',
          mimeType: resource.mimeType
        };
      }
      // Fallback for other resources
      return {
        type: 'resource',
        uri: resource.uri,
        title: resource.title
      };
    });

    return NextResponse.json({
      message: response.text || 'No response generated',
      resources: formattedResources
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
