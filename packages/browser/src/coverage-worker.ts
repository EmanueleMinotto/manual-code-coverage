import { openDB } from 'idb';

const DB_NAME = 'mcc-coverage-db';
const STORE_NAME = 'snapshots';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'key' });
    },
  });
}

async function saveSnapshot(coverage: Record<string, unknown>): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, { key: 'last', coverage });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      self.postMessage({ type: 'warning', payload: 'IndexedDB quota exceeded; using in-memory buffer only' });
    } else {
      throw e;
    }
  }
}

async function clearSnapshot(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, 'last');
  } catch {
    // best effort
  }
}

self.addEventListener('message', (event: MessageEvent<{ type: string; payload?: unknown }>) => {
  const { type, payload } = event.data;

  if (type === 'snapshot') {
    void saveSnapshot(payload as Record<string, unknown>);
  }

  if (type === 'clear') {
    void clearSnapshot();
  }
});
