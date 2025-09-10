import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  RetryPolicy,
  PolicyPipeline,
  UserAgentPolicy
} from '../../src/utils/fetchRequest.js';
import type { Mock } from 'vitest';

function createMockFetch(
  responses: Array<{ status: number; ok?: boolean }>
): typeof fetch {
  let call = 0;
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const res = responses[Math.min(call, responses.length - 1)];
    call++;
    return {
      ok: res.ok ?? res.status < 400,
      status: res.status,
      statusText: `Status ${res.status}`,
      json: async () => ({ status: res.status })
    } as Response;
  }) as typeof fetch;
}

describe('PolicyPipeline', () => {
  describe('usePolicy, removePolicy, and listPolicies', () => {
    it('adds policies with usePolicy', () => {
      const pipeline = new PolicyPipeline();
      const policy1 = new UserAgentPolicy('Agent1');
      const policy2 = new RetryPolicy();

      pipeline.usePolicy(policy1);
      pipeline.usePolicy(policy2);

      const policies = pipeline.listPolicies();
      expect(policies).toHaveLength(2);
      expect(policies[0]).toBe(policy1);
      expect(policies[1]).toBe(policy2);
    });

    it('removes policies with removePolicy', () => {
      const pipeline = new PolicyPipeline();
      const policy1 = new UserAgentPolicy('Agent1');
      const policy2 = new RetryPolicy();
      const policy3 = new UserAgentPolicy('Agent3');

      pipeline.usePolicy(policy1);
      pipeline.usePolicy(policy2);
      pipeline.usePolicy(policy3);

      pipeline.removePolicy(policy2);

      const policies = pipeline.listPolicies();
      expect(policies).toHaveLength(2);
      expect(policies[0]).toBe(policy1);
      expect(policies[1]).toBe(policy3);
    });

    it('removePolicy does nothing if policy not found', () => {
      const pipeline = new PolicyPipeline();
      const policy1 = new UserAgentPolicy('Agent1');
      const policy2 = new RetryPolicy();

      pipeline.usePolicy(policy1);

      pipeline.removePolicy(policy2); // Not in the list

      const policies = pipeline.listPolicies();
      expect(policies).toHaveLength(1);
      expect(policies[0]).toBe(policy1);
    });

    it('listPolicies returns empty array initially', () => {
      const pipeline = new PolicyPipeline();
      expect(pipeline.listPolicies()).toEqual([]);
    });

    it('listPolicies returns the policies array', () => {
      const pipeline = new PolicyPipeline();
      const policy = new UserAgentPolicy('Agent1');

      pipeline.usePolicy(policy);
      const policies1 = pipeline.listPolicies();
      const policies2 = pipeline.listPolicies();

      expect(policies1).toBe(policies2); // Same reference
      expect(policies1).toEqual(policies2); // Same content
      expect(policies1).toContain(policy);
    });
  });

  describe('RetryPolicy', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('retries on 500 and returns last response after max retries', async () => {
      const mockFetch = createMockFetch([
        { status: 500 },
        { status: 500 },
        { status: 500 },
        { status: 500 }
      ]);
      const pipeline = new PolicyPipeline(mockFetch);
      pipeline.usePolicy(new RetryPolicy(3, 1, 10)); // Use small delays for test speed

      const response = await pipeline.fetch('http://test', {});

      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(response.status).toBe(500);
    });

    it('retries on 429 and succeeds if later response is ok', async () => {
      const mockFetch = createMockFetch([
        { status: 429 },
        { status: 429 },
        { status: 200, ok: true }
      ]);
      const pipeline = new PolicyPipeline(mockFetch);
      pipeline.usePolicy(new RetryPolicy(3, 1, 10));

      const response = await pipeline.fetch('http://test', {});

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('does not retry on 400 errors', async () => {
      const mockFetch = createMockFetch([{ status: 400 }]);
      const pipeline = new PolicyPipeline(mockFetch);
      pipeline.usePolicy(new RetryPolicy(3, 1, 10));

      const response = await pipeline.fetch('http://test', {});

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(400);
    });

    it('returns immediately on first success', async () => {
      const mockFetch = createMockFetch([{ status: 200, ok: true }]);
      const pipeline = new PolicyPipeline(mockFetch);
      pipeline.usePolicy(new RetryPolicy(3, 1, 10));

      const response = await pipeline.fetch('http://test', {});

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
    });
  });

  describe('UserAgentPolicy', () => {
    it('sets the User-Agent header if not present', async () => {
      const mockFetch = vi.fn(
        async (input: string | URL | Request, init?: RequestInit) => {
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({}),
            headers: init?.headers
          } as Response;
        }
      ) as Mock;

      const pipeline = new PolicyPipeline(mockFetch as unknown as typeof fetch);
      pipeline.usePolicy(new UserAgentPolicy('TestAgent/1.0'));

      await pipeline.fetch('http://test', {});

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers['User-Agent']).toBe('TestAgent/1.0');
    });

    it('does not overwrite an existing User-Agent header', async () => {
      const mockFetch = vi.fn(
        async (input: string | URL | Request, init?: RequestInit) => {
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({}),
            headers: init?.headers
          } as Response;
        }
      ) as Mock;

      const pipeline = new PolicyPipeline(mockFetch as unknown as typeof fetch);
      pipeline.usePolicy(new UserAgentPolicy('TestAgent/1.0'));

      await pipeline.fetch('http://test', {
        headers: {
          'User-Agent': 'CustomAgent/2.0'
        }
      });

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(headers['User-Agent']).toBe('CustomAgent/2.0');
    });

    it('works with headers as Headers object', async () => {
      const mockFetch = vi.fn(
        async (_input: string | URL | Request, init?: RequestInit) => {
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({}),
            headers: init?.headers
          } as Response;
        }
      ) as Mock;

      const pipeline = new PolicyPipeline(mockFetch as unknown as typeof fetch);
      pipeline.usePolicy(new UserAgentPolicy('TestAgent/1.0'));

      const headers = new Headers();
      await pipeline.fetch('http://test', { headers });

      expect(headers.get('User-Agent')).toBe('TestAgent/1.0');
    });
  });

  describe('Policy ID functionality', () => {
    it('assigns unique IDs to policies when not provided', () => {
      const policy1 = new UserAgentPolicy('Agent1');
      const policy2 = new UserAgentPolicy('Agent2');
      const policy3 = new RetryPolicy();

      expect(policy1.id).toBeDefined();
      expect(policy2.id).toBeDefined();
      expect(policy3.id).toBeDefined();
      expect(policy1.id).not.toBe(policy2.id);
      expect(policy2.id).not.toBe(policy3.id);
    });

    it('uses custom ID when provided', () => {
      const customId = 'my-custom-policy';
      const policy = new UserAgentPolicy('Agent1', customId);

      expect(policy.id).toBe(customId);
    });

    it('removes policies by ID using removePolicy', () => {
      const pipeline = new PolicyPipeline();
      const policy1 = new UserAgentPolicy('Agent1', 'policy-1');
      const policy2 = new RetryPolicy(3, 200, 2000, 'policy-2');
      const policy3 = new UserAgentPolicy('Agent3', 'policy-3');

      pipeline.usePolicy(policy1);
      pipeline.usePolicy(policy2);
      pipeline.usePolicy(policy3);

      pipeline.removePolicy('policy-2'); // Remove by ID string

      const policies = pipeline.listPolicies();
      expect(policies).toHaveLength(2);
      expect(policies[0]).toBe(policy1);
      expect(policies[1]).toBe(policy3);
    });

    it('removePolicy supports both policy instance and ID string', () => {
      const pipeline = new PolicyPipeline();
      const policy1 = new UserAgentPolicy('Agent1', 'policy-1');
      const policy2 = new RetryPolicy(3, 200, 2000, 'policy-2');
      const policy3 = new UserAgentPolicy('Agent3', 'policy-3');
      const policy4 = new UserAgentPolicy('Agent4', 'policy-4');

      pipeline.usePolicy(policy1);
      pipeline.usePolicy(policy2);
      pipeline.usePolicy(policy3);
      pipeline.usePolicy(policy4);

      // Remove by policy instance
      pipeline.removePolicy(policy2);

      // Remove by ID string
      pipeline.removePolicy('policy-4');

      const policies = pipeline.listPolicies();
      expect(policies).toHaveLength(2);
      expect(policies[0]).toBe(policy1);
      expect(policies[1]).toBe(policy3);
    });

    it('finds policies by ID', () => {
      const pipeline = new PolicyPipeline();
      const policy1 = new UserAgentPolicy('Agent1', 'policy-1');
      const policy2 = new RetryPolicy(3, 200, 2000, 'policy-2');

      pipeline.usePolicy(policy1);
      pipeline.usePolicy(policy2);

      expect(pipeline.findPolicyById('policy-1')).toBe(policy1);
      expect(pipeline.findPolicyById('policy-2')).toBe(policy2);
      expect(pipeline.findPolicyById('non-existent')).toBeUndefined();
    });

    it('fromVersionInfo accepts optional ID parameter', () => {
      const versionInfo = {
        name: 'test-app',
        version: '1.0.0',
        sha: 'abc123',
        tag: 'v1.0.0',
        branch: 'main'
      };

      const policyWithoutId = UserAgentPolicy.fromVersionInfo(versionInfo);
      const policyWithId = UserAgentPolicy.fromVersionInfo(
        versionInfo,
        'custom-id'
      );

      expect(policyWithoutId.id).toBeDefined();
      expect(policyWithId.id).toBe('custom-id');
    });
  });
});
