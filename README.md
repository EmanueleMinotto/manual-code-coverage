# manual-code-coverage

Self-hosted tool to track JavaScript code coverage executed manually in the browser and verify that pull requests have been manually tested.

## Architecture

```
packages/
  core/        — shared TypeScript types and coverage merge utilities
  server/      — Fastify HTTP API with pluggable StorageProvider
  vite-plugin/ — Vite plugin for build-time instrumentation (babel-plugin-istanbul)
  browser/     — runtime client: reads window.__coverage__, sends deltas
  cli/         — mcc report <commit>  and  mcc verify-pr <number>
examples/
  vite-react-app/ — minimal example wired up end-to-end
```

## Example

See [examples/vite-react-app/README.md](examples/vite-react-app/README.md) for a complete end-to-end walkthrough.

## Quickstart (Docker Compose)

```bash
# Start the server
cd docker
docker compose up -d

# The server is now listening on http://localhost:3000
```

## Usage

### 1. Instrument your Vite app

```ts
// vite.config.ts
import { mccPlugin } from '@manual-code-coverage/vite-plugin';

export default defineConfig({
  plugins: [mccPlugin()],
});
```

### 2. Build with coverage enabled

```bash
MCC_COVERAGE=true \
MCC_COMMIT=$(git rev-parse HEAD) \
MCC_TESTER=alice \
MCC_ENDPOINT=http://localhost:3000 \
vite build
```

### 3. Initialise the browser client

```ts
import { MccClient } from '@manual-code-coverage/browser';

if (window.__mcc_config__) {
  const client = new MccClient();
  await client.init(); // creates a session, starts 30s flush interval
}
```

### 4. Generate a coverage report

```bash
npx mcc report <commit-sha> --endpoint http://localhost:3000
# → ./coverage-report/index.html
```

### 5. Verify a pull request in CI

```bash
npx mcc verify-pr 42 \
  --endpoint http://localhost:3000 \
  --repo owner/repo \
  --token $GITHUB_TOKEN
```

Exit code 0 = pass, 1 = fail or no coverage.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `MCC_COVERAGE` | — | Set to `true` to enable instrumentation (build mode only) |
| `MCC_COMMIT` | — | Commit SHA to associate coverage with (required when `MCC_COVERAGE=true`) |
| `MCC_TESTER` | `""` | Tester identifier; can also be set at runtime via `window.__mcc_config__.tester` |
| `MCC_ENDPOINT` | `http://localhost:3000` | MCC server URL |
| `PORT` | `3000` | Server listen port |
| `HOST` | `0.0.0.0` | Server listen host |
| `MCC_DATA_DIR` | `./data` | Filesystem storage directory |
| `GITHUB_TOKEN` | — | GitHub token for `mcc verify-pr` |
| `GITHUB_REPOSITORY` | — | `owner/repo` fallback for `mcc verify-pr` |

## Configuration (`mcc.config.json`)

```json
{
  "endpoint": "http://localhost:3000",
  "threshold": 1.0,
  "flushIntervalMs": 30000,
  "repo": "owner/repo"
}
```

## PR Comment format

When `--comment` is passed, `mcc verify-pr` posts (or updates) a comment on the pull request. The comment includes:

- A status header (`✅ Passed` / `❌ Failed` / `⚠️ No coverage data`)
- A progress bar with covered vs total modified lines
- Coverage percentage vs threshold
- A link to the HEAD commit

If coverage data is available, two collapsible sections are appended:

**Sessions** — collapsed by default, shows at a glance how many sessions were run and by whom:

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  2 / 2 modified lines covered
Coverage **100.0%** ≥ threshold **80.0%** ✅

Commit: [`a1b2c3d`](https://github.com/owner/repo/commit/a1b2c3d...)

▶ Sessions — 2 sessions · testers: alice, bob
  | Sessions | Unique testers | Coverage merged at    |
  |----------|----------------|-----------------------|
  | 2        | alice, bob     | 2026-04-23 10:30 UTC  |

▶ Uncovered lines (1)
  | File       | Lines |
  |------------|-------|
  | src/app.ts | 42    |
```

## GitHub Actions example

```yaml
- name: Verify PR coverage
  run: npx mcc verify-pr ${{ github.event.pull_request.number }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPOSITORY: ${{ github.repository }}
```
