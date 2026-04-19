# vite-react-app — manual example

Minimal React app to test `manual-code-coverage` end-to-end locally.

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

## Quick start

From the **monorepo root**:

```bash
pnpm install
pnpm build
```

### 1. Start the MCC server

```bash
pnpm --filter @manual-code-coverage/server run start
```

The server listens on `http://localhost:3000` by default.

### 2. Start the app with instrumentation

```bash
pnpm --filter vite-react-app-example build:coverage
pnpm --filter vite-react-app-example preview
```

`build:coverage` sets `MCC_COVERAGE=true`, which activates the Vite plugin (`mccPlugin`) and instruments the code with Istanbul at build time.

### 3. Exercise the code

Open `http://localhost:4173` in your browser and perform the actions you want to cover.  
The `MccClient` (initialised in `src/main.tsx`) collects coverage data and sends it to the server on every interaction.

### 4. Download the report

```bash
pnpm --filter @manual-code-coverage/cli run start -- report <commit-sha> --output coverage/
```

The HTML report is generated at `coverage/index.html`.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `MCC_COVERAGE` | `false` | Enables build instrumentation |
| `MCC_SERVER_URL` | `http://localhost:3000` | MCC server URL |

## Structure

```
examples/vite-react-app/
├── src/
│   └── main.tsx        # entry point, initialises MccClient
├── vite.config.ts      # uses mccPlugin()
├── index.html
└── package.json
```
