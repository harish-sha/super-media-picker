# Public beta release checklist

The monorepo root is private. Only `packages/super-media-picker` is prepared as
the self-contained public package for `0.1.0-beta.4`; no release command runs
automatically.

## Before publishing

1. Confirm the MIT license and copyright holder in the root and public package
   `LICENSE` files.
2. Confirm the version and beta changelog entry.
3. Run every CI command from a clean checkout with the frozen lockfile.
4. Run `pnpm package:check` to validate the complete tarball graph and contents.
5. Run `pnpm package:install-test` to install that tarball into an external
   temporary application and compile/use every public entry.
6. Inspect `pnpm pack --json` output and confirm only `dist`, `README.md`,
   `LICENSE`, and `package.json` are present.
7. Confirm npm ownership, two-factor authentication, and the `beta` dist-tag in
   the authorized release environment. The first manual local beta publish does
   not request npm provenance.

The actual publish command must be run manually by an authorized maintainer and
is intentionally outside CI. Do not place npm tokens or provider credentials in
the repository, package manifest, examples, or GitHub Actions configuration.
