# ADR 007: Presentation modes and lazy full picker

## Decision

Treat presentation density, responsive placement, and sizing as independent API axes:

- `mode`: `compact` or `full`
- `displayMode`: `auto`, `inline`, `popover`, `modal`, or `bottom-sheet`
- `size`: `sm`, `md`, or `lg`, with optional dimensions

The public `MediaPicker` owns controlled/uncontrolled mode state and shared persistent recents, favorites, and skin-tone state. `CompactMediaPicker` renders a generic normalized-media toolbar. `FullMediaPicker` owns search, categories, grid, preview, and full-picker interaction state.

`FullMediaPicker` is imported through `React.lazy`. Default compact reactions and the tone menu use a generated ten-record Emojibase slice exposed by `@super-media-picker/emoji/compact`, so the full component and full generated emoji dataset are absent from the initial compact path. Both presentations call the same dataset-backed variant resolver; React never appends Unicode modifiers. Recent, frequent, favorites, or unknown custom Unicode inputs dynamically request full emoji data because those strategies require arbitrary ID resolution.

## Consequences

- Compact selection and full selection use the same `MediaItem` callback.
- Expanding preserves shared persisted state without duplicating storage logic.
- Consumers can provide normalized future media reactions without changing the toolbar architecture.
- Full mode has a short Suspense loading state on first use.
- Dynamic compact sources trade their broader ID support for loading the emoji-data chunk.
