import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { MccConfig } from './types.js';
import { MCC_CONFIG_DEFAULTS } from './types.js';

export function loadMccConfig(cwd: string): MccConfig {
  const configPath = join(cwd, 'mcc.config.json');
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch {
    return { ...MCC_CONFIG_DEFAULTS };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`MCC: failed to parse ${configPath}: ${String(e)}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`MCC: ${configPath} must be a JSON object`);
  }

  const obj = parsed as Record<string, unknown>;

  return {
    endpoint:
      typeof obj['endpoint'] === 'string' ? obj['endpoint'] : MCC_CONFIG_DEFAULTS.endpoint,
    threshold:
      typeof obj['threshold'] === 'number' ? obj['threshold'] : MCC_CONFIG_DEFAULTS.threshold,
    flushIntervalMs:
      typeof obj['flushIntervalMs'] === 'number'
        ? obj['flushIntervalMs']
        : MCC_CONFIG_DEFAULTS.flushIntervalMs,
    repo: typeof obj['repo'] === 'string' ? obj['repo'] : MCC_CONFIG_DEFAULTS.repo,
  };
}
