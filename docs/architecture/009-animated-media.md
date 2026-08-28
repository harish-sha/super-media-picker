# 009: Shared animated-media renderer

Animated emoji and animated stickers share `AnimatedMediaRenderer`.

| Format        | Default strategy                               |
| ------------- | ---------------------------------------------- |
| WebM          | muted, looping, inline native `<video>`        |
| animated WebP | lazy native `<img>` while active               |
| GIF           | lazy native `<img>` while active               |
| Lottie        | typed host-supplied `renderers.lottie` adapter |

The default policy is `hover`: pointer hover or keyboard focus requests an animation slot, and leaving/blur restores the preview. `visible`, `always`, and `never` are explicit alternatives. Touch/pointer activation can start one relevant item without enabling an entire mobile grid.

Every instance observes visibility, avoids loading the animation URL while static when a preview exists, and releases its slot plus video resources on visibility loss or unmount. `AnimationConcurrencyManager` defaults to three active animations per picker. Reduced-motion preference suppresses automatic animation; explicit user activation remains possible.

Lottie is intentionally adapter-based. Bundling a renderer would impose a significant runtime on emoji-only consumers and couple the SDK to one Lottie implementation/version.
