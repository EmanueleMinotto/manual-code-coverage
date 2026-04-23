import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    pulls: {
      get: vi.fn().mockResolvedValue({ data: { head: { sha: 'sha-test-123' } } }),
      listFiles: vi.fn().mockResolvedValue({
        data: [
          {
            filename: 'src/app.ts',
            status: 'modified',
            patch: '@@ -1,3 +1,4 @@\n line1\n+added line 2\n line3\n+added line 4',
          },
        ],
      }),
    },
  })),
}));

import { runVerifyPr } from './verify-pr.js';

const COMMIT_SHA = 'sha-test-123';

const FULL_MERGED = {
  commitSha: COMMIT_SHA,
  mergedAt: '2024-01-01T00:00:00Z',
  sessionIds: ['s1'],
  coverage: {
    'src/app.ts': {
      path: 'src/app.ts',
      statementMap: {
        '0': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
        '1': { start: { line: 4, column: 0 }, end: { line: 4, column: 10 } },
      },
      s: { '0': 3, '1': 1 },
      fnMap: {},
      f: {},
      branchMap: {},
      b: {},
    },
  },
  contributors: {},
};

const PARTIAL_MERGED = {
  ...FULL_MERGED,
  coverage: {
    'src/app.ts': {
      ...FULL_MERGED.coverage['src/app.ts'],
      s: { '0': 3, '1': 0 },
    },
  },
};

const HALF_MERGED = {
  ...FULL_MERGED,
  coverage: {
    'src/app.ts': {
      ...FULL_MERGED.coverage['src/app.ts'],
      s: { '0': 1, '1': 0 },
    },
  },
};

const COMMON_OPTS = { endpoint: 'http://localhost:3000', repo: 'owner/repo' };

afterEach(() => {
  vi.clearAllMocks();
});

describe('runVerifyPr', () => {
  it('returns pass when all modified lines are covered', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(FULL_MERGED) }));

    const result = await runVerifyPr(42, { ...COMMON_OPTS, threshold: 1.0 });

    expect(result.status).toBe('pass');
    expect(result.coveredModifiedLines).toBe(2);
    expect(result.totalModifiedLines).toBe(2);
    expect(result.coveredRatio).toBe(1);
  });

  it('returns fail when a line is not covered', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(PARTIAL_MERGED) }));

    const result = await runVerifyPr(42, { ...COMMON_OPTS, threshold: 1.0 });

    expect(result.status).toBe('fail');
    expect(result.coveredModifiedLines).toBe(1);
    expect(result.uncoveredFiles[0]?.uncoveredLines).toContain(4);
  });

  it('returns no-coverage when server returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const result = await runVerifyPr(42, COMMON_OPTS);

    expect(result.status).toBe('no-coverage');
  });

  it('counts lines not in statementMap as covered when file has coverage data', async () => {
    // patch adds line 1 (import, not in statementMap), line 2 (covered), line 4 (covered)
    // line 1 is an import — module loaded, so it ran → covered
    const { Octokit } = await import('@octokit/rest');
    vi.mocked(Octokit).mockImplementationOnce(() => ({
      pulls: {
        get: vi.fn().mockResolvedValue({ data: { head: { sha: COMMIT_SHA } } }),
        listFiles: vi.fn().mockResolvedValue({
          data: [
            {
              filename: 'src/app.ts',
              status: 'modified',
              patch: '@@ -0,0 +1,4 @@\n+import foo from \'bar\';\n+added line 2\n line3\n+added line 4',
            },
          ],
        }),
      },
    }) as never);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(FULL_MERGED) }));

    const result = await runVerifyPr(42, { ...COMMON_OPTS, threshold: 1.0 });

    expect(result.status).toBe('pass');
    expect(result.totalModifiedLines).toBe(3); // line 1 counts as covered
    expect(result.coveredModifiedLines).toBe(3);
  });

  it('threshold boundary: pass at exact threshold', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(HALF_MERGED) }));

    const result = await runVerifyPr(42, { ...COMMON_OPTS, threshold: 0.5 });

    expect(result.status).toBe('pass');
    expect(result.coveredRatio).toBe(0.5);
  });
});
