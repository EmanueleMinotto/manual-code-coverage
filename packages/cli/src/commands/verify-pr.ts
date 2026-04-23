
import type { MergedCoverage, UncoveredFile, VerificationResult } from '@manual-code-coverage/core';
import { loadMccConfig } from '@manual-code-coverage/core';
import { Octokit } from '@octokit/rest';

import { parseChangedFiles } from '../diff-parser.js';

export interface VerifyPrOptions {
  endpoint?: string;
  threshold?: number;
  repo?: string;
  token?: string;
  allowNoCoverage?: boolean;
  comment?: boolean;
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
    if (opts.comment) await postPrComment(octokit, owner, repo, prNumber, result, repoSlug);
    return result;
  }

  const merged: MergedCoverage = (await coverageRes.json()) as MergedCoverage;

  let totalModifiedLines = 0;
  let coveredModifiedLines = 0;
  const uncoveredFiles: UncoveredFile[] = [];

  const coverageEntries = Object.entries(merged.coverage);

  for (const { path, addedLines } of changedFiles) {
    const fileCov =
      merged.coverage[path] ??
      coverageEntries.find(([k]) => k.endsWith(`/${path}`))?.[1];
    const uncoveredLines: number[] = [];

    for (const line of addedLines) {
      if (!fileCov) {
        totalModifiedLines++;
        uncoveredLines.push(line);
        continue;
      }

      // Istanbul skips non-executable lines (import/export/type declarations, blank lines, etc.)
      // Lines absent from statementMap are not instrumentable — exclude from the count entirely.
      if (!isLineInstrumentable(fileCov, line)) continue;

      totalModifiedLines++;
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

  const result: VerificationResult = {
    prNumber,
    commitSha,
    status,
    threshold,
    coveredRatio,
    totalModifiedLines,
    coveredModifiedLines,
    uncoveredFiles,
  };

  if (opts.comment) await postPrComment(octokit, owner, repo, prNumber, result, repoSlug);

  return result;
}

function isLineInstrumentable(
  fileCov: { statementMap?: Record<string, { start: { line: number }; end: { line: number } }> },
  line: number,
): boolean {
  if (!fileCov.statementMap) return false;
  return Object.values(fileCov.statementMap).some(
    (loc) => loc.start.line <= line && line <= loc.end.line,
  );
}

function isLineCovered(
  fileCov: { statementMap?: Record<string, { start: { line: number }; end: { line: number } }>; s?: Record<string, number> },
  line: number,
): boolean {
  if (!fileCov.statementMap || !fileCov.s) return false;

  for (const [stmtId, loc] of Object.entries(fileCov.statementMap)) {
    if (loc.start.line <= line && line <= loc.end.line) {
      const hits = fileCov.s[stmtId] ?? 0;
      return hits > 0;
    }
  }

  return false;
}

function linesToRanges(lines: readonly number[]): string {
  if (lines.length === 0) return '';
  const sorted = [...lines].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0]!;
  let end = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]! === end + 1) {
      end = sorted[i]!;
    } else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`);
      start = end = sorted[i]!;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return ranges.join(', ');
}

function buildProgressBar(ratio: number, width = 20): string {
  const filled = Math.round(Math.max(0, Math.min(1, ratio)) * width);
  return '▓'.repeat(filled) + '░'.repeat(width - filled);
}

const COMMENT_MARKER = '<!-- mcc-verify-pr -->';

const STATUS_LABELS: Record<string, { icon: string; label: string }> = {
  pass: { icon: '✅', label: 'Passed' },
  fail: { icon: '❌', label: 'Failed' },
  'no-coverage': { icon: '⚠️', label: 'No coverage data' },
};

export function buildComment(result: VerificationResult, repoSlug: string): string {
  const { status, coveredRatio, threshold, coveredModifiedLines, totalModifiedLines, commitSha, uncoveredFiles } = result;
  const { icon, label } = STATUS_LABELS[status]!;
  const shortSha = commitSha.slice(0, 7);
  const commitLink = `[\`${shortSha}\`](https://github.com/${repoSlug}/commit/${commitSha})`;

  if (status === 'no-coverage') {
    return [
      COMMENT_MARKER,
      `## ${icon} Manual Code Coverage — ${label}`,
      '',
      'No coverage report found for this commit.',
      'Run the manual test session and upload coverage before merging.',
      '',
      `Commit: ${commitLink}`,
    ].join('\n');
  }

  const pct = (coveredRatio * 100).toFixed(1);
  const thr = (threshold * 100).toFixed(1);
  const thresholdMet = coveredRatio >= threshold;
  const bar = buildProgressBar(coveredRatio);

  const lines = [
    COMMENT_MARKER,
    `## ${icon} Manual Code Coverage — ${label}`,
    '',
    `${bar}  ${coveredModifiedLines} / ${totalModifiedLines} modified lines covered`,
    `Coverage **${pct}%** ${thresholdMet ? '≥' : '<'} threshold **${thr}%** ${thresholdMet ? '✅' : '❌'}`,
    '',
    `Commit: ${commitLink}`,
  ];

  if (uncoveredFiles.length > 0) {
    const totalUncovered = uncoveredFiles.reduce((sum, f) => sum + f.uncoveredLines.length, 0);
    lines.push('', `<details><summary>Uncovered lines (${totalUncovered})</summary>`, '', '| File | Lines |', '|------|-------|');
    for (const f of uncoveredFiles) {
      lines.push(`| \`${f.path}\` | ${linesToRanges(f.uncoveredLines)} |`);
    }
    lines.push('', '</details>');
  }

  return lines.join('\n');
}

async function postPrComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  result: VerificationResult,
  repoSlug: string,
): Promise<void> {
  const body = buildComment(result, repoSlug);

  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));

  if (existing) {
    await octokit.issues.updateComment({ owner, repo, comment_id: existing.id, body });
  } else {
    await octokit.issues.createComment({ owner, repo, issue_number: prNumber, body });
  }
}
