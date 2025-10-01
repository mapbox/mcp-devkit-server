import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface VersionInfo {
  name: string;
  version: string;
  sha: string;
  tag: string;
  branch: string;
}

export function getVersionInfo(): VersionInfo {
  const name = 'Mapbox Developer MCP server';
  try {
    const filePath = path.resolve(__dirname, '..', 'version.json');
    const data = readFileSync(filePath, 'utf-8');
    const info = JSON.parse(data) as VersionInfo;
    info.name = name;
    return info;
  } catch {
    return {
      name: name,
      version: '0.0.0',
      sha: 'unknown',
      tag: 'unknown',
      branch: 'unknown'
    };
  }
}
