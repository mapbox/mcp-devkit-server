// Copyright (c) Mapbox, Inc.
// Licensed under the MIT License.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createToolSpan,
  getTracer,
  setClientInfo
} from '../../src/utils/tracing.js';

// Mock the OpenTelemetry modules to avoid actual tracing in tests
vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn().mockReturnValue({
      startSpan: vi.fn().mockReturnValue({
        setAttributes: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn()
      })
    })
  },
  SpanStatusCode: {
    OK: 1,
    ERROR: 2
  },
  SpanKind: {
    INTERNAL: 0,
    CLIENT: 3
  },
  diag: {
    setLogger: vi.fn()
  },
  DiagLogLevel: {
    NONE: 0,
    ERROR: 30,
    WARN: 50,
    INFO: 60,
    DEBUG: 70,
    VERBOSE: 80
  }
}));

describe('tracing utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setClientInfo(undefined);
  });

  describe('createToolSpan', () => {
    it('creates a tool span with basic attributes and no client info by default', () => {
      const tracer = getTracer();
      const mockSpan = {
        setAttributes: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn()
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(tracer.startSpan).mockReturnValue(mockSpan as any);

      createToolSpan('test_tool', 1024);

      expect(tracer.startSpan).toHaveBeenCalledWith('tool.test_tool', {
        kind: expect.any(Number),
        attributes: {
          'tool.name': 'test_tool',
          'tool.input.size': 1024,
          'operation.type': 'tool_execution'
        }
      });
    });

    it('includes the connected client name/version once set via setClientInfo', () => {
      const tracer = getTracer();
      const mockSpan = {
        setAttributes: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn()
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(tracer.startSpan).mockReturnValue(mockSpan as any);

      setClientInfo({ name: 'claude-ai', version: '1.0.0' });
      createToolSpan('test_tool', 1024);

      expect(tracer.startSpan).toHaveBeenCalledWith('tool.test_tool', {
        kind: expect.any(Number),
        attributes: {
          'tool.name': 'test_tool',
          'tool.input.size': 1024,
          'operation.type': 'tool_execution',
          'mcp.client.name': 'claude-ai',
          'mcp.client.version': '1.0.0'
        }
      });
    });
  });
});
