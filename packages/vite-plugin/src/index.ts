import { execSync } from 'node:child_process';

import { transformSync } from '@babel/core';
import type { Plugin } from 'vite';

export interface MccPluginOptions {
  include?: string[];
  exclude?: string[];
  force?: boolean;
}

function detectCommitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

export function mccPlugin(opts: MccPluginOptions = {}): Plugin {
  const {
    include = [],
    exclude = [],
    force = false,
  } = opts;

  const commitSha = process.env['MCC_COMMIT'] || detectCommitSha();
  const tester = process.env['MCC_TESTER'] ?? '';
  const endpoint = process.env['MCC_ENDPOINT'] ?? 'http://localhost:3000';
  const enabled = process.env['MCC_COVERAGE'] === 'true';

  return {
    name: 'mcc',

    configResolved(config) {
      if (!enabled) return;

      if (!force && config.command !== 'build') {
        throw new Error(
          'MCC: instrumentation is only supported in build mode. Use `vite build` or set `force: true`.',
        );
      }

      if (!commitSha) {
        throw new Error(
          'MCC: MCC_COMMIT env var is required when MCC_COVERAGE=true (and git is not available).',
        );
      }
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!enabled) return html;

        const config = JSON.stringify({ commitSha, tester, endpoint });
        const script = `<script>window.__mcc_config__ = ${config};</script>`;
        return html.replace('</head>', `${script}\n</head>`);
      },
    },

    transform(code, id) {
      if (!enabled) return null;
      if (id.includes('node_modules')) return null;
      if (id.includes('.test.') || id.includes('.spec.')) return null;
      if (!/\.[jt]sx?$/.test(id)) return null;

      const shouldInclude =
        include.length === 0 || include.some((pattern) => id.includes(pattern));
      const shouldExclude = exclude.some((pattern) => id.includes(pattern));

      if (!shouldInclude || shouldExclude) return null;

      const result = transformSync(code, {
        filename: id,
        sourceMaps: true,
        compact: false,
        plugins: [
          [
            'babel-plugin-istanbul',
            {
              include,
              exclude: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*', ...exclude],
            },
          ],
        ],
      });

      if (!result?.code) return null;

      return {
        code: result.code,
        map: result.map ?? null,
      };
    },
  };
}

export default mccPlugin;
