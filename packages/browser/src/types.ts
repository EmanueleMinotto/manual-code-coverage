export interface MccConfig {
  commitSha: string;
  tester: string;
  endpoint: string;
}

export interface WorkerMessage {
  type: 'snapshot' | 'flush-ok' | 'flush-error' | 'warning';
  payload?: unknown;
}

declare global {
  interface Window {
    __mcc_config__?: MccConfig;
    __coverage__?: Record<string, unknown>;
  }
}
