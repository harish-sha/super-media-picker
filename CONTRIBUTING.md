# Contributing

Thank you for helping improve Super Media Picker. The project is currently in
public beta, so focused bug reports, accessibility feedback, provider-contract
feedback, and small well-tested improvements are especially useful.

## Development setup

Requirements:

- Node.js 22 (CI version; package consumers support the range in the public
  manifest)
- Corepack
- pnpm 10.15.0

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

Run the playground with `pnpm dev` and Storybook with `pnpm storybook`.

## Pull requests

1. Keep production media provider-first; do not add large or proprietary media
   catalogs to npm packages.
2. Never commit API keys, tokens, production endpoints, customer data, or
   proprietary platform artwork.
3. Preserve normalized media types and avoid duplicating business logic between
   full, focused, and headless APIs.
4. Add tests for behavioral changes and update public documentation for API
   changes.
5. Add a Changesets entry for user-visible release changes.

Before opening a pull request, run:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm size
pnpm build-storybook
pnpm test:e2e
pnpm package:check
pnpm package:install-test
```

## Reporting bugs

Include the package version, React version, browser/runtime, minimal
configuration, and reproduction. Use the private process in `SECURITY.md` for
security issues.
