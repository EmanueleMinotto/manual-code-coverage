import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { MergedCoverage } from '@manual-code-coverage/core';
import { loadMccConfig } from '@manual-code-coverage/core';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';


export interface ReportOptions {
  endpoint?: string;
  output?: string;
}

export async function runReport(commitSha: string, opts: ReportOptions = {}): Promise<void> {
  const config = loadMccConfig(process.cwd());
  const endpoint = opts.endpoint ?? config.endpoint;
  const outputDir = resolve(opts.output ?? './coverage-report');

  const res = await fetch(`${endpoint}/reports/${commitSha}`);
  if (!res.ok) {
    if (res.status === 404) {
      console.error(`Error: no coverage data found for commit ${commitSha}`);
      process.exit(1);
    }
    console.error(`Error: server returned ${res.status}`);
    process.exit(1);
  }

  const merged: MergedCoverage = (await res.json()) as MergedCoverage;
  const coverageMap = libCoverage.createCoverageMap(merged.coverage);

  await mkdir(outputDir, { recursive: true });

  const context = libReport.createContext({
    dir: outputDir,
    coverageMap,
  });

  const htmlReport = reports.create('html');
  htmlReport.execute(context);

  console.log(`Coverage report written to ${join(outputDir, 'index.html')}`);
}
