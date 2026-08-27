# ADR 004: asynchronous storage abstraction

## Context

Browser storage is synchronous, while future IndexedDB and server adapters are asynchronous and browser APIs are unavailable during SSR.

## Decision

Expose a Promise-based `StorageAdapter`. Provide memory and defensive local-storage implementations in core.

## Alternatives

A synchronous contract would be smaller but could not represent future adapters without breaking callers.

## Consequences

All persistence consumers use one future-proof contract. Local-storage failures are contained and do not make the picker unusable.
