# @company/media-emoji

Unicode emoji data and framework-independent category and search utilities.

The checked-in runtime module is generated from Emojibase's CLDR-derived data:

```sh
pnpm --filter @company/media-emoji generate:data
```

Only fields used by the picker are emitted. The source data package remains a development dependency.
