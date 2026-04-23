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

import { runVerifyPr, buildComment } from './verify-pr.js';

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

  it('excludes non-instrumentable lines (imports) from coverage count', async () => {
    // patch adds line 1 (import, not in statementMap), line 2 (covered), line 4 (covered)
    // line 1 is not in statementMap → excluded from count entirely
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
    expect(result.totalModifiedLines).toBe(2); // line 1 excluded, lines 2 and 4 counted
    expect(result.coveredModifiedLines).toBe(2);
  });

  it('threshold boundary: pass at exact threshold', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(HALF_MERGED) }));

    const result = await runVerifyPr(42, { ...COMMON_OPTS, threshold: 0.5 });

    expect(result.status).toBe('pass');
    expect(result.coveredRatio).toBe(0.5);
  });
});

const BASE_RESULT = {
  prNumber: 42,
  commitSha: 'abc1234567890',
  status: 'pass' as const,
  threshold: 0.8,
  coveredRatio: 1,
  totalModifiedLines: 2,
  coveredModifiedLines: 2,
  uncoveredFiles: [],
};

describe('buildComment', () => {
  it('omits session section when merged is null', () => {
    const comment = buildComment(BASE_RESULT, 'owner/repo', null);
    expect(comment).not.toContain('Sessions');
  });

  it('includes session count and testers from merged data', () => {
    const merged = {
      commitSha: 'abc1234567890',
      mergedAt: '2026-04-23T10:30:00Z',
      sessionIds: ['s1', 's2'],
      coverage: {},
      contributors: {
        'src/app.ts': { 1: ['alice', 'bob'], 2: ['alice'] },
      },
    };
    const comment = buildComment(BASE_RESULT, 'owner/repo', merged);
    expect(comment).toContain('2 sessions');
    expect(comment).toContain('alice');
    expect(comment).toContain('bob');
    expect(comment).toContain('2026-04-23 10:30 UTC');
  });

  it('shows singular "session" when there is only one', () => {
    const merged = {
      commitSha: 'abc1234567890',
      mergedAt: '2026-04-23T10:30:00Z',
      sessionIds: ['s1'],
      coverage: {},
      contributors: { 'src/app.ts': { 1: ['alice'] } },
    };
    const comment = buildComment(BASE_RESULT, 'owner/repo', merged);
    expect(comment).toContain('1 session ·');
    expect(comment).not.toContain('1 sessions');
  });

  it('deduplicates testers across files and lines', () => {
    const merged = {
      commitSha: 'abc1234567890',
      mergedAt: '2026-04-23T10:30:00Z',
      sessionIds: ['s1'],
      coverage: {},
      contributors: {
        'src/a.ts': { 1: ['alice'], 2: ['alice', 'bob'] },
        'src/b.ts': { 5: ['bob', 'carol'] },
      },
    };
    const comment = buildComment(BASE_RESULT, 'owner/repo', merged);
    const matches = comment.match(/alice/g) ?? [];
    expect(matches.length).toBe(2); // once in summary, once in table
  });
});
