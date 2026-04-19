import { Octokit } from '@octokit/rest';

import type { MergedCoverage, UncoveredFile, VerificationResult } from '@manual-code-coverage/core';
import { loadMccConfig } from '@manual-code-coverage/core';

import { parseChangedFiles } from '../diff-parser.js';

export interface VerifyPrOptions {
  endpoint?: string;
  threshold?: number;
  repo?: string;
  token?: string;
  allowNoCoverage?: boolean;
}

export async function runVerifyPr(
  prNumber: number,
  opts: VerifyPrOptions = {},
): Promise<VerificationResult> {
  const config = loadMccConfig(process.cwd());
  const endpoint = opts.endpoint ?? config.endpoint;
  const threshold = opts.threshold ?? config.threshold;
  const repoSlug = opts.repo ?? config.repo ?? process.env['GITHUB_REPOSITORY'] ?? '';
  const token = opts.token ?? process.env['GITHUB_TOKEN'];

  if (!repoSlug) {
    console.error('Error: --repo or GITHUB_REPOSITORY env var required');
    process.exit(1);
  }

  const [owner, repo] = repoSlug.split('/') as [string, string];

  const octokit = new Octokit({ auth: token });

  const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
  const commitSha = pr.head.sha;

  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const changedFiles = parseChangedFiles(files as Parameters<typeof parseChangedFiles>[0]);

  const coverageRes = await fetch(`${endpoint}/reports/${commitSha}`);
  if (!coverageRes.ok) {
    const result: VerificationResult = {
      prNumber,
      commitSha,
      status: 'no-coverage',
      threshold,
      coveredRatio: 0,
      totalModifiedLines: changedFiles.reduce((sum, f) => sum + f.addedLines.length, 0),
      coveredModifiedLines: 0,
      uncoveredFiles: changedFiles.map((f) => ({ path: f.path, uncoveredLines: f.addedLines })),
    };
    return result;
  }

  const merged: MergedCoverage = (await coverageRes.json()) as MergedCoverage;

  let totalModifiedLines = 0;
  let coveredModifiedLines = 0;
  const uncoveredFiles: UncoveredFile[] = [];

  for (const { path, addedLines } of changedFiles) {
    const fileCov = merged.coverage[path];
    const uncoveredLines: number[] = [];

    for (const line of addedLines) {
      totalModifiedLines++;

      if (!fileCov) {
        uncoveredLines.push(line);
        continue;
      }

      const isCovered = isLineCovered(fileCov, line);
      if (isCovered) {
        coveredModifiedLines++;
      } else {
        uncoveredLines.push(line);
      }
    }

    if (uncoveredLines.length > 0) {
      uncoveredFiles.push({ path, uncoveredLines });
    }
  }

  const coveredRatio = totalModifiedLines === 0 ? 1 : coveredModifiedLines / totalModifiedLines;
  const status = coveredRatio >= threshold ? 'pass' : 'fail';

  return {
    prNumber,
    commitSha,
    status,
    threshold,
    coveredRatio,
    totalModifiedLines,
    coveredModifiedLines,
    uncoveredFiles,
  };
}

function isLineCovered(
  fileCov: { statementMap?: Record<string, { start: { line: number }; end: { line: number } }>; s?: Record<string, number> },
  line: number,
): boolean {
  if (!fileCov.statementMap || !fileCov.s) return false;

  for (const [stmtId, loc] of Object.entries(fileCov.statementMap)) {
    if (loc.start.line <= line && line <= loc.end.line) {
      const hits = fileCov.s[stmtId] ?? 0;
      if (hits > 0) return true;
    }
  }
  return false;
}
