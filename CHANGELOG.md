# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-04-19

### Added

- Link to example app README from root README
- CHANGELOG following [Keep a Changelog](https://keepachangelog.com/) format
- Changelog contribution guidelines in CONTRIBUTING.md

## [0.1.1] - 2026-04-19

### Fixed

- `vite-plugin`: use `??` for `MCC_COMMIT` fallback to distinguish empty string from unset
- `vite-plugin`: add blank line between import groups
- `cli`, `browser`: filter null-byte virtual files from Istanbul report

### Docs

- Translate `vite-react-app` example README to English

## [0.1.0] - 2026-04-19

### Added

- `core`: shared TypeScript types and coverage merge utilities
- `server`: Fastify HTTP API with pluggable `StorageProvider` and CORS support (`MCC_CORS`)
- `vite-plugin`: Vite plugin for build-time instrumentation via `babel-plugin-istanbul`
- `browser`: runtime client that reads `window.__coverage__` and sends deltas
- `cli`: `mcc report` and `mcc verify-pr` commands
- Docker Compose setup for self-hosted deployment
- Example app `vite-react-app` wired end-to-end

[Unreleased]: https://github.com/EmanueleMinotto/manual-code-coverage/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/EmanueleMinotto/manual-code-coverage/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/EmanueleMinotto/manual-code-coverage/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/EmanueleMinotto/manual-code-coverage/releases/tag/v0.1.0
