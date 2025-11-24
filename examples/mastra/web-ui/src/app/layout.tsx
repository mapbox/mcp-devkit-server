import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mapbox MCP DevKit - Mastra Chat',
  description:
    'Interactive chat interface with map visualizations using Mastra and MCP-UI'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
