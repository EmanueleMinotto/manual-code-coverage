import { randomUUID } from 'node:crypto';


import type {
  StorageProvider,
  CoverageDelta,
  RawCoverageMap,
  Session,
} from '@manual-code-coverage/core';
import { buildContributorsMap, mergeCoverageMaps } from '@manual-code-coverage/core';
import type { FastifyInstance } from 'fastify';

import { AppendDeltaBodySchema, CreateSessionBodySchema } from './schemas.js';

export function registerRoutes(
  app: FastifyInstance,
  storage: StorageProvider,
): void {
  app.get('/health', async (_request, reply) => {
    await reply.send({ status: 'ok' });
  });

  app.post('/sessions', async (request, reply) => {
    const parsed = CreateSessionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message });
    }

    const now = new Date().toISOString();
    const session: Session = {
      id: randomUUID(),
      commitSha: parsed.data.commitSha,
      tester: parsed.data.tester,
      createdAt: now,
      lastUpdatedAt: now,
      coverage: {},
      lastAppliedSequence: -1,
    };

    await storage.createSession(session);
    return reply.code(201).send({ id: session.id, commitSha: session.commitSha });
  });

  app.post('/sessions/:id/coverage', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = AppendDeltaBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message });
    }

    const session = await storage.getSession(id);
    if (!session) {
      return reply.code(404).send({ error: `Session ${id} not found` });
    }

    const delta: CoverageDelta = {
      sessionId: id,
      sequenceNumber: parsed.data.sequenceNumber,
      capturedAt: parsed.data.capturedAt,
      changes: parsed.data.changes as RawCoverageMap,
    };

    const { alreadyApplied } = await storage.updateSessionCoverage(id, delta);
    await storage.invalidateMergedCoverage(session.commitSha);

    return reply.code(200).send({ alreadyApplied });
  });

  app.get('/reports/:commit', async (request, reply) => {
    const { commit } = request.params as { commit: string };

    let merged = await storage.getMergedCoverage(commit);

    if (!merged) {
      const sessions = await storage.listSessionsForCommit(commit);
      if (sessions.length === 0) {
        return reply.code(404).send({ error: `No coverage data for commit ${commit}` });
      }

      const coverage = mergeCoverageMaps(sessions.map((s) => s.coverage));
      const contributors = buildContributorsMap(sessions);
      merged = {
        commitSha: commit,
        mergedAt: new Date().toISOString(),
        sessionIds: sessions.map((s) => s.id),
        coverage,
        contributors,
      };
      await storage.setMergedCoverage(merged);
    }

    return reply.code(200).send(merged);
  });

  app.get('/pr/:number/verification', async (request, reply) => {
    const { number } = request.params as { number: string };
    const prNumber = Number(number);
    if (!Number.isInteger(prNumber) || prNumber <= 0) {
      return reply.code(400).send({ error: 'Invalid PR number' });
    }

    const commitSha = await storage.getCommitForPr(prNumber);
    if (!commitSha) {
      return reply.code(400).send({ error: `No commit mapping found for PR #${prNumber}` });
    }

    return reply.redirect(`/reports/${commitSha}`);
  });
}
