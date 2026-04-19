import { describe, it, expect } from 'vitest';

import { computeDelta, isEmptyDelta } from './delta.js';

const makeMap = (s: Record<string, number>, f: Record<string, number> = {}) => ({
  '/src/app.ts': { s, f, b: {} },
});

describe('computeDelta', () => {
  it('returns empty delta when nothing changed', () => {
    const map = makeMap({ '0': 1, '1': 2 });
    const delta = computeDelta(map, map);
    expect(isEmptyDelta(delta)).toBe(true);
  });

  it('includes only changed counters', () => {
    const prev = makeMap({ '0': 1, '1': 0 });
    const curr = makeMap({ '0': 1, '1': 3 });
    const delta = computeDelta(curr, prev);
    expect(delta['/src/app.ts']?.s).toEqual({ '1': 3 });
  });

  it('handles a first flush where previous is empty', () => {
    const curr = makeMap({ '0': 5 });
    const delta = computeDelta(curr, {});
    expect(delta['/src/app.ts']?.s).toEqual({ '0': 5 });
  });

  it('strips node_modules files', () => {
    const curr = {
      '/node_modules/react/index.js': { s: { '0': 10 }, f: {}, b: {} },
      '/src/app.ts': { s: { '0': 1 }, f: {}, b: {} },
    };
    const delta = computeDelta(curr, {});
    expect(Object.keys(delta)).toEqual(['/src/app.ts']);
  });

  it('second consecutive flush with unchanged snapshot produces empty delta', () => {
    const curr = makeMap({ '0': 5 });
    const snapshot = JSON.parse(JSON.stringify(curr)) as typeof curr;
    const delta = computeDelta(curr, snapshot);
    expect(isEmptyDelta(delta)).toBe(true);
  });
});
