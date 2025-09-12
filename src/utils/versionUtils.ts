import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.resolve(dirname, '..', 'version.json');
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
