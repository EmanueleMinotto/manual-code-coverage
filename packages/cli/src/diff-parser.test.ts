import { describe, it, expect } from 'vitest';

import { extractAddedLines, parseChangedFiles } from './diff-parser.js';

describe('extractAddedLines', () => {
  it('extracts added lines from a simple patch', () => {
    const patch = `@@ -1,3 +1,4 @@
 unchanged
+added line 2
 unchanged
+added line 4`;
    expect(extractAddedLines(patch)).toEqual([2, 4]);
  });

  it('handles multiple hunks', () => {
    const patch = `@@ -1,2 +1,3 @@
 line1
+added at 2
 line2
@@ -10,2 +11,3 @@
 line10
+added at 12
 line11`;
    expect(extractAddedLines(patch)).toEqual([2, 12]);
  });

  it('ignores removed lines', () => {
    const patch = `@@ -1,3 +1,2 @@
 unchanged
-removed line
 unchanged`;
    expect(extractAddedLines(patch)).toEqual([]);
  });

  it('handles new file (all added)', () => {
    const patch = `@@ -0,0 +1,3 @@
+line 1
+line 2
+line 3`;
    expect(extractAddedLines(patch)).toEqual([1, 2, 3]);
  });
});

describe('parseChangedFiles', () => {
  it('excludes removed files', () => {
    const files = [
      { filename: 'deleted.ts', status: 'removed', patch: '@@ -1,1 +0,0 @@\n-line' },
    ];
    expect(parseChangedFiles(files)).toHaveLength(0);
  });

  it('includes added and modified files', () => {
    const files = [
      { filename: 'new.ts', status: 'added', patch: '@@ -0,0 +1,2 @@\n+a\n+b' },
      { filename: 'mod.ts', status: 'modified', patch: '@@ -1,1 +1,2 @@\n line\n+added' },
    ];
    const result = parseChangedFiles(files);
    expect(result).toHaveLength(2);
    expect(result[0]?.path).toBe('new.ts');
    expect(result[0]?.addedLines).toEqual([1, 2]);
    expect(result[1]?.addedLines).toEqual([2]);
  });

  it('skips files with no patch', () => {
    const files = [{ filename: 'binary.png', status: 'added' }];
    expect(parseChangedFiles(files)).toHaveLength(0);
  });
});
