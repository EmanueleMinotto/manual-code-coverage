import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  StorageProvider,
  Session,
  CoverageDelta,
  MergedCoverage,
  RawCoverageMap,
} from '@manual-code-coverage/core';
import { mergeCoverage } from '@manual-code-coverage/core';
import PQueue from 'p-queue';

interface PrIndex {
  [prNumber: string]: string;
}

interface SessionFile {
  id: string;
  commitSha: string;
  tester: string;
  createdAt: string;
  lastUpdatedAt: string;
  coverage: RawCoverageMap;
  lastAppliedSequence: number;
}

export class FilesystemProvider implements StorageProvider {
  private readonly dataDir: string;
  private readonly commitQueues = new Map<string, PQueue>();
  private readonly sessionQueues = new Map<string, PQueue>();

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  private commitQueue(commitSha: string): PQueue {
    let q = this.commitQueues.get(commitSha);
    if (!q) {
      q = new PQueue({ concurrency: 1 });
      this.commitQueues.set(commitSha, q);
    }
    return q;
  }

  private sessionQueue(sessionId: string): PQueue {
    let q = this.sessionQueues.get(sessionId);
    if (!q) {
      q = new PQueue({ concurrency: 1 });
      this.sessionQueues.set(sessionId, q);
    }
    return q;
  }

  private sessionPath(sessionId: string, commitSha: string): string {
    return join(this.dataDir, 'commits', commitSha, 'sessions', `${sessionId}.json`);
  }

  private mergedPath(commitSha: string): string {
    return join(this.dataDir, 'commits', commitSha, 'merged.json');
  }

  private prIndexPath(): string {
    return join(this.dataDir, 'index', 'pr-to-commit.json');
  }

  private async ensureDir(filePath: string): Promise<void> {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    await mkdir(dir, { recursive: true });
  }

  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async writeJson(filePath: string, data: unknown): Promise<void> {
    await this.ensureDir(filePath);
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  async createSession(session: Session): Promise<void> {
    const path = this.sessionPath(session.id, session.commitSha);
    const file: SessionFile = {
      id: session.id,
      commitSha: session.commitSha,
      tester: session.tester,
      createdAt: session.createdAt,
      lastUpdatedAt: session.lastUpdatedAt,
      coverage: session.coverage,
      lastAppliedSequence: session.lastAppliedSequence,
    };
    await this.writeJson(path, file);
  }

  async getSession(id: string): Promise<Session | null> {
    const commitsDir = join(this.dataDir, 'commits');
    const possiblePaths = await this.findSessionFile(commitsDir, id);
    if (!possiblePaths) return null;

    const file = await this.readJson<SessionFile>(possiblePaths);
    if (!file) return null;

    return {
      id: file.id,
      commitSha: file.commitSha,
      tester: file.tester,
      createdAt: file.createdAt,
      lastUpdatedAt: file.lastUpdatedAt,
      coverage: file.coverage,
      lastAppliedSequence: file.lastAppliedSequence,
    };
  }

  private async findSessionFile(commitsDir: string, sessionId: string): Promise<string | null> {
    const { readdir } = await import('node:fs/promises');
    let commits: string[];
    try {
      commits = await readdir(commitsDir);
    } catch {
      return null;
    }

    for (const commit of commits) {
      const path = join(commitsDir, commit, 'sessions', `${sessionId}.json`);
      const data = await this.readJson<SessionFile>(path);
      if (data) return path;
    }
    return null;
  }

  async updateSessionCoverage(
    id: string,
    delta: CoverageDelta,
  ): Promise<{ alreadyApplied: boolean }> {
    const result = await this.sessionQueue(id).add(async () => {
      const session = await this.getSession(id);
      if (!session) return false;

      if (delta.sequenceNumber <= session.lastAppliedSequence) {
        return true;
      }

      const path = this.sessionPath(id, session.commitSha);
      const updatedCoverage = mergeCoverage(session.coverage, delta.changes);
      const updated: SessionFile = {
        id: session.id,
        commitSha: session.commitSha,
        tester: session.tester,
        createdAt: session.createdAt,
        lastUpdatedAt: new Date().toISOString(),
        coverage: updatedCoverage,
        lastAppliedSequence: delta.sequenceNumber,
      };
      await this.writeJson(path, updated);
      return false;
    });
    return { alreadyApplied: result ?? false };
  }

  async getMergedCoverage(commitSha: string): Promise<MergedCoverage | null> {
    const resolved = await this.resolveCommitSha(commitSha);
    return this.readJson<MergedCoverage>(this.mergedPath(resolved));
  }

  async setMergedCoverage(coverage: MergedCoverage): Promise<void> {
    await this.commitQueue(coverage.commitSha).add(async () => {
      await this.writeJson(this.mergedPath(coverage.commitSha), coverage);
    });
  }

  async invalidateMergedCoverage(commitSha: string): Promise<void> {
    await this.commitQueue(commitSha).add(async () => {
      const { rm } = await import('node:fs/promises');
      try {
        await rm(this.mergedPath(commitSha));
      } catch {
        // already absent — fine
      }
    });
  }

  private async resolveCommitSha(commitSha: string): Promise<string> {
    const { readdir } = await import('node:fs/promises');
    const commitsDir = join(this.dataDir, 'commits');
    let entries: string[];
    try {
      entries = await readdir(commitsDir);
    } catch {
      return commitSha;
    }
    if (entries.includes(commitSha)) return commitSha;
    const match = entries.find(
      (e) => e.startsWith(commitSha) || commitSha.startsWith(e),
    );
    return match ?? commitSha;
  }

  async listSessionsForCommit(commitSha: string): Promise<readonly Session[]> {
    const { readdir } = await import('node:fs/promises');
    const resolved = await this.resolveCommitSha(commitSha);
    const sessionsDir = join(this.dataDir, 'commits', resolved, 'sessions');
    let files: string[];
    try {
      files = await readdir(sessionsDir);
    } catch {
      return [];
    }

    const sessions: Session[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const data = await this.readJson<SessionFile>(join(sessionsDir, file));
      if (data) {
        sessions.push({
          id: data.id,
          commitSha: data.commitSha,
          tester: data.tester,
          createdAt: data.createdAt,
          lastUpdatedAt: data.lastUpdatedAt,
          coverage: data.coverage,
          lastAppliedSequence: data.lastAppliedSequence,
        });
      }
    }
    return sessions;
  }

  async mapPrToCommit(prNumber: number, commitSha: string): Promise<void> {
    const path = this.prIndexPath();
    const index = (await this.readJson<PrIndex>(path)) ?? {};
    index[String(prNumber)] = commitSha;
    await this.writeJson(path, index);
  }

  async getCommitForPr(prNumber: number): Promise<string | null> {
    const path = this.prIndexPath();
    const index = await this.readJson<PrIndex>(path);
    if (!index) return null;
    return index[String(prNumber)] ?? null;
  }
}
