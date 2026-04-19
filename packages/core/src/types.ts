import type { CoverageMapData } from 'istanbul-lib-coverage';

export type RawCoverageMap = CoverageMapData;

export interface Session {
  readonly id: string;
  readonly commitSha: string;
  readonly tester: string;
  readonly createdAt: string;
  readonly lastUpdatedAt: string;
  readonly coverage: RawCoverageMap;
  readonly lastAppliedSequence: number;
}

export interface CoverageDelta {
  readonly sessionId: string;
  readonly sequenceNumber: number;
  readonly capturedAt: string;
  readonly changes: RawCoverageMap;
}

export type ContributorsMap = Record<string, Record<number, readonly string[]>>;

export interface MergedCoverage {
  readonly commitSha: string;
  readonly mergedAt: string;
  readonly sessionIds: readonly string[];
  readonly coverage: RawCoverageMap;
  readonly contributors: ContributorsMap;
}

export type VerificationStatus = 'pass' | 'fail' | 'no-coverage';

export interface UncoveredFile {
  readonly path: string;
  readonly uncoveredLines: readonly number[];
}

export interface VerificationResult {
  readonly prNumber: number;
  readonly commitSha: string;
  readonly status: VerificationStatus;
  readonly threshold: number;
  readonly coveredRatio: number;
  readonly totalModifiedLines: number;
  readonly coveredModifiedLines: number;
  readonly uncoveredFiles: readonly UncoveredFile[];
}

export interface StorageProvider {
  createSession(session: Session): Promise<void>;
  getSession(id: string): Promise<Session | null>;
  updateSessionCoverage(
    id: string,
    delta: CoverageDelta,
  ): Promise<{ alreadyApplied: boolean }>;
  getMergedCoverage(commitSha: string): Promise<MergedCoverage | null>;
  setMergedCoverage(coverage: MergedCoverage): Promise<void>;
  invalidateMergedCoverage(commitSha: string): Promise<void>;
  listSessionsForCommit(commitSha: string): Promise<readonly Session[]>;
  mapPrToCommit(prNumber: number, commitSha: string): Promise<void>;
  getCommitForPr(prNumber: number): Promise<string | null>;
}

export interface MccConfig {
  readonly endpoint: string;
  readonly threshold: number;
  readonly flushIntervalMs: number;
  readonly repo: string | null;
}

export const MCC_CONFIG_DEFAULTS: Readonly<MccConfig> = {
  endpoint: 'http://localhost:3000',
  threshold: 1.0,
  flushIntervalMs: 30000,
  repo: null,
};
