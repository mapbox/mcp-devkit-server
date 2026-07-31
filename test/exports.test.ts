// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect } from 'vitest';

describe('Public API exports', () => {
  describe('tools barrel', () => {
    it('exports getAllTools', async () => {
      const { getAllTools } = await import('../src/tools/index.js');
      expect(getAllTools).toBeDefined();
      expect(typeof getAllTools).toBe('function');
    });

    it('exports getCoreTools', async () => {
      const { getCoreTools } = await import('../src/tools/index.js');
      expect(getCoreTools).toBeDefined();
      expect(typeof getCoreTools).toBe('function');
    });

    it('exports getToolByName', async () => {
      const { getToolByName } = await import('../src/tools/index.js');
      expect(getToolByName).toBeDefined();
      expect(typeof getToolByName).toBe('function');
    });
  });

  describe('utils barrel', () => {
    it('exports getVersionInfo', async () => {
      const { getVersionInfo } = await import('../src/utils/index.js');
      expect(getVersionInfo).toBeDefined();
      expect(typeof getVersionInfo).toBe('function');
    });

    it('exports httpRequest', async () => {
      const { httpRequest } = await import('../src/utils/index.js');
      expect(httpRequest).toBeDefined();
      expect(typeof httpRequest).toBe('function');
    });
  });
});
