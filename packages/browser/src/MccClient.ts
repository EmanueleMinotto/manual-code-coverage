import { computeDelta, isEmptyDelta } from './delta.js';
import type { MccConfig } from './types.js';

export class MccClient {
  private readonly config: MccConfig;
  private sessionId: string | null = null;
  private sequenceNumber = 0;
  private lastSnapshot: Record<string, unknown> = {};
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private worker: Worker | null = null;

  constructor(config?: Partial<MccConfig>) {
    const base = window.__mcc_config__ ?? { commitSha: '', tester: '', endpoint: 'http://localhost:3000' };
    this.config = { ...base, ...config };
  }

  async init(flushIntervalMs = 30_000): Promise<void> {
    const res = await fetch(`${this.config.endpoint}/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        commitSha: this.config.commitSha,
        tester: this.config.tester,
      }),
    });
    const data = (await res.json()) as { id: string };
    this.sessionId = data.id;

    try {
      this.worker = new Worker(new URL('./coverage-worker.js', import.meta.url), { type: 'module' });
    } catch {
      // Worker unavailable — continue without IDB buffering
    }

    void this.flush();
    this.intervalId = setInterval(() => { void this.flush(); }, flushIntervalMs);

    window.addEventListener('beforeunload', () => { this.flushBeacon(); });
  }

  async flush(): Promise<void> {
    if (!this.sessionId) return;

    const coverage = window.__coverage__;
    if (!coverage) return;

    const delta = computeDelta(
      coverage as Parameters<typeof computeDelta>[0],
      this.lastSnapshot as Parameters<typeof computeDelta>[1],
    );

    if (isEmptyDelta(delta)) return;

    const seqNum = this.sequenceNumber++;
    this.lastSnapshot = JSON.parse(JSON.stringify(coverage)) as Record<string, unknown>;
    this.worker?.postMessage({ type: 'snapshot', payload: this.lastSnapshot });

    await fetch(`${this.config.endpoint}/sessions/${this.sessionId}/coverage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sequenceNumber: seqNum,
        capturedAt: new Date().toISOString(),
        changes: delta,
      }),
    });
  }

  private flushBeacon(): void {
    if (!this.sessionId) return;

    const coverage = window.__coverage__;
    if (!coverage) return;

    const delta = computeDelta(
      coverage as Parameters<typeof computeDelta>[0],
      this.lastSnapshot as Parameters<typeof computeDelta>[1],
    );

    if (isEmptyDelta(delta)) return;

    const seqNum = this.sequenceNumber++;

    const payload = JSON.stringify({
      sequenceNumber: seqNum,
      capturedAt: new Date().toISOString(),
      changes: delta,
    });

    navigator.sendBeacon(
      `${this.config.endpoint}/sessions/${this.sessionId}/coverage`,
      new Blob([payload], { type: 'application/json' }),
    );
  }

  destroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.worker?.terminate();
    this.worker = null;
  }
}
