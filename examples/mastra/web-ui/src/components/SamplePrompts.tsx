'use client';

interface SamplePromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const samplePrompts = [
  {
    category: 'Style Creation',
    prompts: [
      'Create a Warsaw night mode style with amber-colored landmarks representing Polish heritage',
      'Design a light map style for a Kraków restaurant app that emphasizes Old Town historic buildings',
      'Make a minimalist style for a Polish real estate app focused on Tricity area'
    ]
  },
  {
    category: 'Style Comparison',
    prompts: [
      "Compare mapbox/light-v11 and mapbox/dark-v11 styles in Warsaw's Old Town",
      'Show me the difference between streets-v12 and outdoors-v12 around Wawel Castle in Kraków',
      'Compare satellite-v9 with streets-v12 at the Baltic coast in Gdańsk'
    ]
  },
  {
    category: 'GeoJSON & Maps',
    prompts: [
      'Show me a map with markers at Palace of Culture and Science and Royal Castle in Warsaw',
      'Preview a route from Warsaw to Kraków on a map',
      'Create a GeoJSON polygon for Łazienki Park in Warsaw and show it on a map'
    ]
  },
  {
    category: 'Utilities',
    prompts: [
      'Get the bounding box for Poland',
      'Convert latitude 52.2297, longitude 21.0122 (Warsaw) to tile coordinates at zoom 12',
      'Create a public access token for my Polish tourism website with read-only permissions'
    ]
  }
];

export function SamplePrompts({ onSelectPrompt }: SamplePromptsProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          Welcome to Mapbox MCP DevKit Chat
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Try one of these sample prompts to get started:
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {samplePrompts.map((section) => (
          <div
            key={section.category}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900"
          >
            <h3 className="font-semibold text-sm uppercase text-gray-500 dark:text-gray-400 mb-3">
              {section.category}
            </h3>
            <div className="space-y-2">
              {section.prompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSelectPrompt(prompt)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-transparent hover:border-blue-300 dark:hover:border-blue-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Or ask your own question about map styles, GeoJSON visualization, or
          geospatial tools
        </p>
      </div>
    </div>
  );
}
