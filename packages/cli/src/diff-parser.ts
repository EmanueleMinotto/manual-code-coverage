export interface FileChange {
  path: string;
  addedLines: number[];
}

export function parseChangedFiles(
  files: Array<{ filename: string; status: string; patch?: string }>,
): FileChange[] {
  const result: FileChange[] = [];

  for (const file of files) {
    if (file.status === 'removed') continue;
    if (!file.patch) continue;

    const addedLines = extractAddedLines(file.patch);
    if (addedLines.length > 0) {
      result.push({ path: file.filename, addedLines });
    }
  }

  return result;
}

export function extractAddedLines(patch: string): number[] {
  const lines: number[] = [];
  let currentLine = 0;

  for (const line of patch.split('\n')) {
    const hunkHeader = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunkHeader) {
      currentLine = Number(hunkHeader[1]) - 1;
      continue;
    }

    if (line.startsWith('-')) continue;

    currentLine++;

    if (line.startsWith('+')) {
      lines.push(currentLine);
    }
  }

  return lines;
}
