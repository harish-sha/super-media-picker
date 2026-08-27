# ADR 005: build-time emoji data transformation

## Context

Hand-maintained emoji records become incomplete quickly, while shipping a raw CLDR dataset adds unnecessary fields and bytes.

## Decision

Generate a compact typed module from Emojibase's CLDR-derived English data and shortcode metadata. Exclude component-only records and retain only identifiers, glyphs, labels, category, and searchable aliases.

## Alternatives

Runtime importing was rejected for bundle size. A small handwritten set was rejected for coverage and maintainability.

## Consequences

Runtime code has no data-package dependency. Updating Unicode coverage is reproducible by updating the development dependency and regenerating the module.
