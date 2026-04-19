import { Command } from 'commander';

import { runReport } from './commands/report.js';
import { runVerifyPr } from './commands/verify-pr.js';

const program = new Command();

program
  .name('mcc')
  .description('manual-code-coverage CLI')
  .version('0.1.0');

program
  .command('report <commit>')
  .description('Generate HTML coverage report for a commit')
  .option('-e, --endpoint <url>', 'MCC server endpoint')
  .option('-o, --output <dir>', 'Output directory', './coverage-report')
  .action(async (commit: string, opts: { endpoint?: string; output?: string }) => {
    await runReport(commit, opts);
  });

program
  .command('verify-pr <prNumber>')
  .description('Verify that a PR has been manually tested')
  .option('-e, --endpoint <url>', 'MCC server endpoint')
  .option('-t, --threshold <number>', 'Coverage threshold (0-1)', parseFloat)
  .option('-r, --repo <owner/repo>', 'GitHub repository')
  .option('--token <token>', 'GitHub token')
  .option('--allow-no-coverage', 'Exit 0 when no coverage data exists')
  .option('--json', 'Output JSON result')
  .action(
    async (
      prNumberStr: string,
      opts: {
        endpoint?: string;
        threshold?: number;
        repo?: string;
        token?: string;
        allowNoCoverage?: boolean;
        json?: boolean;
      },
    ) => {
      const prNumber = Number(prNumberStr);
      const result = await runVerifyPr(prNumber, opts);

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`PR #${result.prNumber} — ${result.status.toUpperCase()}`);
        console.log(
          `Covered ${result.coveredModifiedLines}/${result.totalModifiedLines} modified lines (${(result.coveredRatio * 100).toFixed(1)}% / threshold ${(result.threshold * 100).toFixed(1)}%)`,
        );
        if (result.uncoveredFiles.length > 0) {
          console.log('\nUncovered files:');
          for (const f of result.uncoveredFiles) {
            console.log(`  ${f.path}: lines ${f.uncoveredLines.join(', ')}`);
          }
        }
      }

      if (result.status === 'pass') process.exit(0);
      if (result.status === 'no-coverage' && opts.allowNoCoverage) process.exit(0);
      process.exit(1);
    },
  );

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
