'use client';

import { useState } from 'react';

interface MCPResourceProps {
  resource: {
    type: string;
    uri?: string;
    title?: string;
    mimeType?: string;
  };
}

export function MCPResource({ resource }: MCPResourceProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Handle different resource types
  if (resource.type === 'ui-resource') {
    // MCP-UI resources (maps, visualizations)
    return (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div
          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {resource.title || 'Map Visualization'}
            </span>
            {resource.mimeType && (
              <span className="text-xs text-gray-500">
                ({resource.mimeType})
              </span>
            )}
          </div>
          <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        {isExpanded && resource.uri && (
          <div className="relative w-full" style={{ paddingBottom: '75%' }}>
            <iframe
              src={resource.uri}
              className="absolute top-0 left-0 w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title={resource.title || 'Map Visualization'}
            />
          </div>
        )}
      </div>
    );
  }

  // Handle regular URLs (external resources)
  if (resource.uri && resource.uri.startsWith('http')) {
    // Check if it's an image
    if (
      resource.mimeType?.startsWith('image/') ||
      resource.uri.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    ) {
      return (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-2 bg-gray-50 dark:bg-gray-800">
            <a
              href={resource.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {resource.title || 'View Image'}
            </a>
          </div>
          <div className="bg-white dark:bg-gray-900 p-2">
            <img
              src={resource.uri}
              alt={resource.title || 'Resource image'}
              className="w-full h-auto rounded"
            />
          </div>
        </div>
      );
    }

    // Regular link
    return (
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
        <a
          href={resource.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-2"
        >
          <span>🔗</span>
          <span>{resource.title || resource.uri}</span>
        </a>
      </div>
    );
  }

  // Fallback for unknown resource types
  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {resource.title || 'Resource'}
      </p>
      {resource.uri && (
        <p className="text-xs text-gray-500 mt-1 break-all">{resource.uri}</p>
      )}
    </div>
  );
}
