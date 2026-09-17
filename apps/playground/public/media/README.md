# Local demo media

This directory contains a deliberately bounded set of optimized local fixtures
for visual and offline tests. Production applications should return media from
their own provider/backend/CDN integration; these files are not a media catalog
and are never included in the public npm package tarballs.

All artwork was generated specifically for this repository and is governed by
the repository's root `LICENSE`. No proprietary messaging-platform artwork is
included.

Animated emoji coverage is deliberately capped at 20 pack entries: 16 distinct
reaction concepts, one separate muted WebM entry, one inert Lottie fixture used
by the playground's mocked host renderer, one deliberately broken animation,
and one custom fallback entry. The concepts exercise wave, pulse, bounce,
burst, flicker, clap, launch, and pop motion using small generated GIFs plus one
animated WebP. A missing URL is referenced intentionally to exercise Unicode
fallback. Rebuild raster/GIF/WebP fixtures with `pnpm media:fixtures` and the
WebM with `pnpm media:fixtures:webm` when needed.
