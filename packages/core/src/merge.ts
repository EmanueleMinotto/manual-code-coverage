import { createCoverageMap } from 'istanbul-lib-coverage';

import type { RawCoverageMap, Session, ContributorsMap } from './types.js';

export function mergeCoverage(base: RawCoverageMap, delta: RawCoverageMap): RawCoverageMap {
  const map = createCoverageMap(JSON.parse(JSON.stringify(base)) as RawCoverageMap);
  map.merge(delta);
  return map.toJSON();
}

export function mergeCoverageMaps(maps: readonly RawCoverageMap[]): RawCoverageMap {
  const map = createCoverageMap({});
  for (const m of maps) {
    map.merge(m);
  }
  return map.toJSON();
}

export function buildContributorsMap(sessions: readonly Session[]): ContributorsMap {
  const result: Record<string, Record<number, Set<string>>> = {};

  for (const session of sessions) {
    for (const [filePath, fileCoverage] of Object.entries(session.coverage)) {
      if (!result[filePath]) {
        result[filePath] = {};
      }
      const fileContributors = result[filePath]!;
      const fc = createCoverageMap({ [filePath]: fileCoverage }).fileCoverageFor(filePath);

      for (const [stmtId, hitCount] of Object.entries(fc.s)) {
        if (hitCount === 0) continue;
        const loc = fc.statementMap[stmtId];
        if (!loc) continue;

        for (let line = loc.start.line; line <= loc.end.line; line++) {
          if (!fileContributors[line]) {
            fileContributors[line] = new Set();
          }
          fileContributors[line]!.add(session.tester);
        }
      }
    }
  }

  const serialized: ContributorsMap = {};
  for (const [filePath, lineMap] of Object.entries(result)) {
    serialized[filePath] = {};
    for (const [line, testers] of Object.entries(lineMap)) {
      serialized[filePath]![Number(line)] = [...testers].sort();
    }
  }
  return serialized;
}
