# @super-media-picker/emoji

Compact Unicode emoji data plus framework-independent category, search, variant, and normalized-media utilities.

```ts
import {
  resolveEmojiVariant,
  searchEmoji,
  toEmojiMediaItem,
} from "@super-media-picker/emoji";

const thumbsUp = searchEmoji("thumbs up", { limit: 1 })[0];
if (thumbsUp) {
  resolveEmojiVariant(thumbsUp, "medium");
  toEmojiMediaItem(thumbsUp, "medium");
}
```

The checked-in runtime module is generated from Emojibase's CLDR-derived data:

```sh
pnpm --filter @super-media-picker/emoji generate:data
```

Only picker fields are emitted. Source datasets remain development dependencies and are not included in the package tarball.

The `@super-media-picker/emoji/compact` export contains the generated default-reaction subset and the same variant resolver. It keeps compact React entry points small without duplicating or synthesizing Unicode skin-tone sequences.
