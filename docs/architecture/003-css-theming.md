# ADR 003: CSS-variable theme contract

## Context

Host applications need brand overrides, light/dark/system modes, SSR safety, and no runtime CSS-in-JS cost.

## Decision

`@super-media-picker/themes` owns every visual design token and its `--mp-*` CSS variable mapping. React accepts either a named mode or `{ mode, tokens }`, converts only supplied tokens to inline custom properties, and otherwise consumes the shared stylesheet. System mode uses a live `prefers-color-scheme` media query, so no JavaScript state or reload is required.

## Alternatives

Runtime CSS-in-JS would add runtime and SSR complexity. Duplicating light/dark values in React would create two sources of truth.

## Consequences

Hosts can use the typed API or externally override CSS variables. Structural CSS remains static and tree-shakeable; system appearance follows browser changes automatically.
