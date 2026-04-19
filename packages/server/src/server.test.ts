import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createServer } from './index.js';
import { FilesystemProvider } from './storage/FilesystemProvider.js';
import type { FastifyInstance } from 'fastify';

let tmpDir: string;
let server: FastifyInstance;

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mcc-server-test-'));
  server = await createServer({
    storage: new FilesystemProvider(tmpDir),
    logger: false,
  });
  await server.ready();
});

afterEach(async () => {
  await server.close();
  rmSync(tmpDir, { recursive: true });
});

describe('POST /sessions', () => {
  it('creates a session and returns id + commitSha', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/sessions',
      payload: { commitSha: 'abc123', tester: 'alice' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ id: string; commitSha: string }>();
    expect(body.id).toBeTypeOf('string');
    expect(body.commitSha).toBe('abc123');
  });

  it('returns 400 for missing commitSha', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/sessions',
      payload: { tester: 'alice' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /sessions/:id/coverage', () => {
  it('returns 404 for unknown session', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/sessions/nonexistent/coverage',
      payload: { sequenceNumber: 0, capturedAt: new Date().toISOString(), changes: {} },
    });
    expect(res.statusCode).toBe(404);
  });

  it('persists a valid delta and returns alreadyApplied: false', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/sessions',
      payload: { commitSha: 'abc123', tester: 'alice' },
    });
    const { id } = createRes.json<{ id: string }>();

    const deltaRes = await server.inject({
      method: 'POST',
      url: `/sessions/${id}/coverage`,
      payload: {
        sequenceNumber: 0,
        capturedAt: new Date().toISOString(),
        changes: {},
      },
    });
    expect(deltaRes.statusCode).toBe(200);
    expect(deltaRes.json<{ alreadyApplied: boolean }>().alreadyApplied).toBe(false);
  });

  it('is idempotent: sending the same sequenceNumber returns alreadyApplied: true', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/sessions',
      payload: { commitSha: 'abc123', tester: 'alice' },
    });
    const { id } = createRes.json<{ id: string }>();

    const payload = { sequenceNumber: 0, capturedAt: new Date().toISOString(), changes: {} };
    await server.inject({ method: 'POST', url: `/sessions/${id}/coverage`, payload });
    const second = await server.inject({ method: 'POST', url: `/sessions/${id}/coverage`, payload });
    expect(second.json<{ alreadyApplied: boolean }>().alreadyApplied).toBe(true);
  });
});

describe('GET /reports/:commit', () => {
  it('returns 404 for unknown commit', async () => {
    const res = await server.inject({ method: 'GET', url: '/reports/unknown' });
    expect(res.statusCode).toBe(404);
  });

  it('returns merged coverage shape after sessions are created', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: '/sessions',
      payload: { commitSha: 'sha456', tester: 'bob' },
    });
    const { id } = createRes.json<{ id: string }>();
    await server.inject({
      method: 'POST',
      url: `/sessions/${id}/coverage`,
      payload: { sequenceNumber: 0, capturedAt: new Date().toISOString(), changes: {} },
    });

    const report = await server.inject({ method: 'GET', url: '/reports/sha456' });
    expect(report.statusCode).toBe(200);
    const body = report.json<{ commitSha: string; sessionIds: string[] }>();
    expect(body.commitSha).toBe('sha456');
    expect(body.sessionIds).toContain(id);
  });
});

describe('GET /pr/:number/verification', () => {
  it('returns 400 when no commit is mapped to the PR', async () => {
    const res = await server.inject({ method: 'GET', url: '/pr/42/verification' });
    expect(res.statusCode).toBe(400);
  });
});

describe('concurrent delta writes', () => {
  it('10 simultaneous sessions for the same commit produce correct summed counters', async () => {
    const fileCoverage = {
      path: '/src/app.ts',
      statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
      s: { '0': 1 },
      fnMap: {},
      f: {},
      branchMap: {},
      b: {},
    };

    await Promise.all(
      Array.from({ length: 10 }, async (_, i) => {
        const createRes = await server.inject({
          method: 'POST',
          url: '/sessions',
          payload: { commitSha: 'concurrent-sha', tester: `tester-${i}` },
        });
        const { id } = createRes.json<{ id: string }>();
        await server.inject({
          method: 'POST',
          url: `/sessions/${id}/coverage`,
          payload: {
            sequenceNumber: 0,
            capturedAt: new Date().toISOString(),
            changes: { '/src/app.ts': fileCoverage },
          },
        });
      }),
    );

    const report = await server.inject({ method: 'GET', url: '/reports/concurrent-sha' });
    const body = report.json<{ coverage: Record<string, { s: Record<string, number> }> }>();
    expect(body.coverage['/src/app.ts']?.s['0']).toBe(10);
  });
});
