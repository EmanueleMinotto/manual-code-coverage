import { join } from 'node:path';

import { createServer, FilesystemProvider } from './index.js';

const port = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '0.0.0.0';
const dataDir = process.env['MCC_DATA_DIR'] ?? join(process.cwd(), 'data');

const corsEnv = process.env['MCC_CORS'];
const corsOption = corsEnv === undefined ? true : corsEnv === '*' ? true : corsEnv.split(',').map((s) => s.trim());

const server = await createServer({
  storage: new FilesystemProvider(dataDir),
  logger: true,
  cors: corsOption,
});

await server.listen({ port, host });
