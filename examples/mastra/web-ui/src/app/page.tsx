'use client';

import { Chat } from '@/components/Chat';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="w-full h-screen flex flex-col">
        <header className="border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold">Mapbox MCP DevKit</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Powered by Mastra + MCP-UI
            </p>
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <Chat />
        </div>
      </div>
    </main>
  );
}
