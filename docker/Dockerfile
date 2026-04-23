# Build stage
FROM node:22-slim AS builder

RUN npm install -g pnpm@9

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/core ./packages/core
COPY packages/server ./packages/server

RUN pnpm install --frozen-lockfile --filter @manual-code-coverage/server...
RUN pnpm --filter @manual-code-coverage/core build
RUN pnpm --filter @manual-code-coverage/server build

# Runtime stage
FROM node:22-slim AS runtime

RUN npm install -g pnpm@9

WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/tsconfig.base.json ./
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/package.json
COPY --from=builder /app/packages/server/dist ./packages/server/dist

RUN pnpm install --frozen-lockfile --prod --filter @manual-code-coverage/server...

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0
ENV MCC_DATA_DIR=/app/data

CMD ["node", "packages/server/dist/bin.js"]
