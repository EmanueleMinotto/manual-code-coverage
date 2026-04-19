import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { runReport } from './report.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mcc-cli-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true });
  vi.restoreAllMocks();
});

const MOCK_MERGED = {
  commitSha: 'abc123',
  mergedAt: '2024-01-01T00:00:00Z',
  sessionIds: ['s1'],
  coverage: {
    '/src/app.ts': {
      path: '/src/app.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      s: { '0': 5 },
      fnMap: {},
      f: {},
      branchMap: {},
      b: {},
    },
  },
  contributors: {},
};

describe('runReport', () => {
  it('writes index.html to the output directory', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_MERGED,
      }),
    );

    const outputDir = join(tmpDir, 'report');
    await runReport('abc123', { endpoint: 'http://localhost:3000', output: outputDir });

    expect(existsSync(join(outputDir, 'index.html'))).toBe(true);
  });

  it('exits with non-zero code on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(
      runReport('unknown', { endpoint: 'http://localhost:3000', output: tmpDir }),
    ).rejects.toThrow('process.exit called');

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
