import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Version Consistency', () => {
  it('should have matching versions in package.json and manifest.json', () => {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const manifestJsonPath = join(process.cwd(), 'manifest.json');

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const manifestJson = JSON.parse(readFileSync(manifestJsonPath, 'utf-8'));

    expect(manifestJson.version).toBe(packageJson.version);
  });
});
