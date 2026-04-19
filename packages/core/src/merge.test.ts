import { describe, it, expect } from 'vitest';

import { buildContributorsMap, mergeCoverage, mergeCoverageMaps } from './merge.js';
import type { RawCoverageMap, Session } from './types.js';

// Istanbul uses 0-based statement IDs; line numbers are 1-based
// stmtId '0' → line 1, '1' → line 2, '2' → line 3
const makeFileCoverage = (hits: Record<string, number>) => ({
  path: '/src/app.ts',
  statementMap: Object.fromEntries(
    Object.keys(hits).map((k) => [
      k,
      {
        start: { line: Number(k) + 1, column: 0 },
        end: { line: Number(k) + 1, column: 10 },
      },
    ]),
  ),
  s: { ...hits },
  fnMap: {},
  f: {},
  branchMap: {},
  b: {},
});

const map1: RawCoverageMap = {
  '/src/app.ts': makeFileCoverage({ '0': 1, '1': 0, '2': 2 }),
};

const map2: RawCoverageMap = {
  '/src/app.ts': makeFileCoverage({ '0': 0, '1': 3, '2': 1 }),
};

describe('mergeCoverage', () => {
  it('accumulates counters from base and delta', () => {
    const result = mergeCoverage(map1, map2);
    expect(result['/src/app.ts']?.s).toEqual({ '0': 1, '1': 3, '2': 3 });
  });

  it('does not mutate the base map', () => {
    mergeCoverage(map1, map2);
    expect(map1['/src/app.ts']?.s['1']).toBe(0);
  });
});

describe('mergeCoverageMaps', () => {
  it('merges multiple maps', () => {
    const result = mergeCoverageMaps([map1, map2]);
    expect(result['/src/app.ts']?.s).toEqual({ '0': 1, '1': 3, '2': 3 });
  });

  it('returns empty map for empty input', () => {
    const result = mergeCoverageMaps([]);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('buildContributorsMap', () => {
  // stmtId '0' → line 1, stmtId '1' → line 2
  const session1: Session = {
    id: 's1',
    commitSha: 'abc',
    tester: 'alice',
    createdAt: '2024-01-01T00:00:00Z',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    coverage: { '/src/app.ts': makeFileCoverage({ '0': 2, '1': 0 }) },
    lastAppliedSequence: 1,
  };

  const session2: Session = {
    id: 's2',
    commitSha: 'abc',
    tester: 'bob',
    createdAt: '2024-01-01T00:00:00Z',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    coverage: { '/src/app.ts': makeFileCoverage({ '0': 1, '1': 3 }) },
    lastAppliedSequence: 1,
  };

  it('lists both testers for a line both covered', () => {
    const map = buildContributorsMap([session1, session2]);
    expect(map['/src/app.ts']?.[1]).toEqual(['alice', 'bob']);
  });

  it('does not include a tester for a line they did not cover', () => {
    const map = buildContributorsMap([session1, session2]);
    expect(map['/src/app.ts']?.[2]).toEqual(['bob']);
  });

  it('deduplicates the same tester appearing in multiple sessions', () => {
    const session3: Session = { ...session1, id: 's3' };
    const map = buildContributorsMap([session1, session3]);
    expect(map['/src/app.ts']?.[1]).toEqual(['alice']);
  });

  it('returns sorted tester arrays', () => {
    const map = buildContributorsMap([session2, session1]);
    expect(map['/src/app.ts']?.[1]).toEqual(['alice', 'bob']);
  });
});
