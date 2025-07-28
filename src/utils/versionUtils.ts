import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.resolve(dirname, '..', 'version.json');
    const data = readFileSync(filePath, 'utf-8');
    let info = JSON.parse(data) as VersionInfo;
    info['name'] = name;
    return info;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Failed to read version info: ${error}`);
    return {
      name: name,
      version: '0.0.0',
      sha: 'unknown',
      tag: 'unknown',
      branch: 'unknown'
    };
  }
}
