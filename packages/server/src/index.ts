import compress from '@fastify/compress';
import cors from '@fastify/cors';
import type { StorageProvider } from '@manual-code-coverage/core';
import fastify from 'fastify';

import { registerRoutes } from './routes.js';

export interface ServerOptions {
  storage: StorageProvider;
  logger?: boolean;
  cors?: boolean | string | string[];
}

export async function createServer(opts: ServerOptions) {
  const app = fastify({ logger: opts.logger ?? false });

  await app.register(compress, { global: false });

  const corsOrigin = opts.cors ?? true;
  await app.register(cors, { origin: corsOrigin });
  app.addHook('onSend', async (_req, reply) => {
    void reply.header('content-type', 'application/json; charset=utf-8');
  });

  registerRoutes(app, opts.storage);
  return app;
}

export { FilesystemProvider } from './storage/FilesystemProvider.js';
export type { StorageProvider } from '@manual-code-coverage/core';
