# Contributing

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`.

Examples:

```
feat(core): add branch coverage tracking
fix(reporter): handle empty coverage map
docs: update README examples
```

## Before committing

Always run linting and tests before committing:

```sh
pnpm lint
pnpm test
```

Both must pass with no errors. Typecheck is also recommended:

```sh
pnpm typecheck
```

## Pull requests

- Keep PRs focused on a single change
- Update tests for any modified behavior
- Update documentation if needed
