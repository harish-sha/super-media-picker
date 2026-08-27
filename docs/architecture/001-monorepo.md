# ADR 001: pnpm package monorepo

## Context

The SDK needs independently consumable framework-free, feature, React, and theme modules.

## Decision

Use pnpm workspaces with explicit ESM package exports and topological builds. Keep applications separate from publishable packages.

## Alternatives

A single package was simpler initially but would prevent feature-level dependency control. A larger task runner was not justified at this scale.

## Consequences

Consumers can import only the layers they need. Workspace scripts remain understandable without an additional orchestration dependency.
