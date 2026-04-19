import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, afterEach } from 'vitest';

import { loadMccConfig } from './config.js';
import { MCC_CONFIG_DEFAULTS } from './types.js';

let tmpDir: string | undefined;

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true });
    tmpDir = undefined;
  }
});

describe('loadMccConfig', () => {
  it('returns defaults when mcc.config.json does not exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcc-test-'));
    tmpDir = dir;
    const cfg = loadMccConfig(dir);
    expect(cfg).toEqual(MCC_CONFIG_DEFAULTS);
  });

  it('merges provided fields with defaults', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcc-test-'));
    tmpDir = dir;
    writeFileSync(join(dir, 'mcc.config.json'), JSON.stringify({ threshold: 0.8 }));
    const cfg = loadMccConfig(dir);
    expect(cfg.threshold).toBe(0.8);
    expect(cfg.endpoint).toBe(MCC_CONFIG_DEFAULTS.endpoint);
  });

  it('throws on invalid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcc-test-'));
    tmpDir = dir;
    writeFileSync(join(dir, 'mcc.config.json'), '{ invalid json');
    expect(() => loadMccConfig(dir)).toThrow(/failed to parse/);
  });

  it('throws when config is not an object', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcc-test-'));
    tmpDir = dir;
    writeFileSync(join(dir, 'mcc.config.json'), '"a string"');
    expect(() => loadMccConfig(dir)).toThrow(/must be a JSON object/);
  });
});
