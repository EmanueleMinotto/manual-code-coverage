type FileCoverage = {
  path?: string;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
  statementMap?: Record<string, unknown>;
  fnMap?: Record<string, unknown>;
  branchMap?: Record<string, unknown>;
  [key: string]: unknown;
};

type CoverageMap = Record<string, FileCoverage>;

export interface CoverageDeltaChanges {
  [filePath: string]: FileCoverage;
}

export function computeDelta(
  current: CoverageMap,
  previous: CoverageMap,
): CoverageDeltaChanges {
  const delta: CoverageDeltaChanges = {};

  for (const [file, curr] of Object.entries(current)) {
    if (file.includes('node_modules')) continue;

    const prev = previous[file];
    const fileDelta: FileCoverage = { s: {}, f: {}, b: {} };
    let hasChange = false;

    for (const [id, count] of Object.entries(curr.s)) {
      const prevCount = prev?.s[id] ?? 0;
      if (count !== prevCount) {
        fileDelta.s[id] = count - prevCount;
        hasChange = true;
      }
    }

    for (const [id, count] of Object.entries(curr.f)) {
      const prevCount = prev?.f[id] ?? 0;
      if (count !== prevCount) {
        fileDelta.f[id] = count - prevCount;
        hasChange = true;
      }
    }

    for (const [id, branches] of Object.entries(curr.b)) {
      const prevBranches = prev?.b[id] ?? branches.map(() => 0);
      const branchDelta = branches.map((c, i) => c - (prevBranches[i] ?? 0));
      if (branchDelta.some((d) => d !== 0)) {
        fileDelta.b[id] = branchDelta;
        hasChange = true;
      }
    }

    if (hasChange) {
      delta[file] = { ...curr, ...fileDelta };
    }
  }

  return delta;
}

export function isEmptyDelta(delta: CoverageDeltaChanges): boolean {
  return Object.keys(delta).length === 0;
}
