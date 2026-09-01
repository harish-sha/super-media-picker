# Native emoji compatibility

Super Media Picker stores exact CLDR/Emojibase Unicode sequences. It does not
split or synthesize variation selectors, skin-tone modifiers, regional flags,
keycaps, or zero-width-joiner sequences. A Unicode selection is emitted once
with the complete sequence in `UnicodeEmojiMediaItem.value`.

## Platform rendering boundary

Native emoji appearance and glyph coverage belong to the browser/OS emoji
font. A sequence can be valid Unicode and still render as a missing-glyph box
on an older Windows build, Linux image, embedded browser, or custom corporate
font configuration. macOS testing does not prove Windows glyph support.

The default font stack is:

```css
"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji",
"Twemoji Mozilla", "Segoe UI Symbol", emoji, sans-serif
```

It is configurable through the theme token `emojiFontFamily` or CSS variable
`--mp-emoji-font-family`. Stable cell dimensions, `line-height: 1`, layout/paint
containment, and overflow clipping prevent a fallback glyph from colliding with
adjacent controls.

## Unicode version policy

`MediaPicker`, `EmojiPicker`, and `useEmojiSearch` default to
`maxUnicodeVersion={15}`. Metadata for newer emoji can remain in the SDK without
being presented by default on platforms where current native coverage is less
predictable. Hosts may lower or raise the boundary:

```tsx
<EmojiPicker maxUnicodeVersion={14} onSelect={handleSelect} />
```

The low-level `searchEmoji` and `getEmojiByCategory` functions accept the same
option but do not impose a boundary when it is omitted. This keeps advanced
data access explicit while the public UI uses the compatible default.

Stored recents and favorites remain intact if the boundary is changed. Records
above the active boundary are not rendered in the native grid; they are not
deleted or rewritten.

## Guaranteed cross-platform artwork

For identical artwork on every client, register an `EmojiProvider` or
`emojiPacks` containing custom/animated items with image preview URLs. This is
the optional fallback path for tenant artwork or platforms with limited fonts.
The default package deliberately does not bundle Apple, Microsoft, Google, or a
large open image-emoji library.

Applications should insert a selected Unicode value with a functional update:

```tsx
setValue((current) => current + item.value);
```

JavaScript string length counts UTF-16 code units, not user-perceived emoji.
Use `Intl.Segmenter` with `granularity: "grapheme"` when displaying grapheme
counts.
