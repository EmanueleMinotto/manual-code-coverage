import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { mccPlugin } from './index.js';

function getPlugin(env: Record<string, string> = {}) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  const plugin = mccPlugin();
  for (const [k] of Object.entries(env)) {
    if (saved[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = saved[k];
    }
  }
  return plugin;
}

describe('mccPlugin', () => {
  beforeEach(() => {
    delete process.env['MCC_COVERAGE'];
    delete process.env['MCC_COMMIT'];
    delete process.env['MCC_TESTER'];
    delete process.env['MCC_ENDPOINT'];
  });

  afterEach(() => {
    delete process.env['MCC_COVERAGE'];
    delete process.env['MCC_COMMIT'];
    delete process.env['MCC_TESTER'];
    delete process.env['MCC_ENDPOINT'];
  });

  it('does not instrument when MCC_COVERAGE is unset', () => {
    const plugin = getPlugin({});
    // @ts-expect-error — accessing plugin transform method directly for testing
    const result = plugin.transform?.('const x = 1;', '/src/app.ts');
    expect(result).toBeNull();
  });

  it('throws when MCC_COMMIT is empty and coverage is enabled (build mode)', () => {
    process.env['MCC_COVERAGE'] = 'true';
    process.env['MCC_COMMIT'] = '';
    const plugin = mccPlugin();
    const mockConfig = { command: 'build' } as Parameters<
      Extract<typeof plugin.configResolved, Function>
    >[0];
    expect(() => {
      (plugin.configResolved as (cfg: typeof mockConfig) => void)(mockConfig);
    }).toThrow('MCC_COMMIT');
  });

  it('throws when running in dev mode with coverage enabled', () => {
    process.env['MCC_COVERAGE'] = 'true';
    process.env['MCC_COMMIT'] = 'abc123';
    const plugin = mccPlugin();
    const mockConfig = { command: 'serve' } as Parameters<
      Extract<typeof plugin.configResolved, Function>
    >[0];
    expect(() => {
      (plugin.configResolved as (cfg: typeof mockConfig) => void)(mockConfig);
    }).toThrow('build mode');
  });

  it('injects __mcc_config__ matching env vars', () => {
    process.env['MCC_COVERAGE'] = 'true';
    process.env['MCC_COMMIT'] = 'sha-abc';
    process.env['MCC_TESTER'] = 'alice';
    process.env['MCC_ENDPOINT'] = 'http://example.com';
    const plugin = mccPlugin();

    const handler =
      typeof plugin.transformIndexHtml === 'object' && plugin.transformIndexHtml !== null
        ? (plugin.transformIndexHtml as { handler: (html: string) => string }).handler
        : (plugin.transformIndexHtml as (html: string) => string);

    const result = handler('<head></head>');
    expect(result).toContain('"commitSha":"sha-abc"');
    expect(result).toContain('"tester":"alice"');
    expect(result).toContain('"endpoint":"http://example.com"');
  });
});
