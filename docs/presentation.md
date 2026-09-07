# Presentation, geometry, motion, and input

Presentation options are independent from media providers. Provider configuration
controls data; the options on this page control where and how the same picker
surface is displayed.

## Dimensions and density

`size` remains the `sm` / `md` / `lg` density preset. `dimensions` is the
container geometry API:

```tsx
<MediaPicker
  dimensions={{
    width: 420,
    height: "min(70dvh, 520px)",
    minWidth: 320,
    maxWidth: 640,
    minHeight: 360,
    maxHeight: 720,
  }}
  onSelect={handleSelect}
/>
```

Numbers are CSS pixels; strings are CSS-compatible lengths. Viewport constraints
remain the final safety bound. Full mode receives `dimensions` by default so an
existing compact reaction capsule does not unexpectedly grow. Set
`applyToCompact: true` when this is intentional. The older `width` and `height`
aliases remain compatible but are deprecated.

Themes can set `pickerWidth`, `pickerHeight`, `pickerMinWidth`,
`pickerMaxWidth`, `pickerMinHeight`, and `pickerMaxHeight`, or hosts can set the
corresponding `--mp-picker-*` CSS custom properties.

## Floating placement and portals

Anchored popovers accept `auto`, `top`, `top-start`, `top-end`, `bottom`,
`bottom-start`, `bottom-end`, `left`, and `right`:

```tsx
const triggerRef = useRef<HTMLButtonElement>(null);

<button ref={triggerRef}>Reactions</button>
<MediaPicker
  anchorRef={triggerRef}
  displayMode="popover"
  placement="bottom-start"
  onResolvedPlacementChange={setResolvedPlacement}
  onSelect={handleSelect}
/>
```

An anchored popover portals to `document.body` by default. It measures the
trigger and picker, flips to the opposite side before clamping, observes both
elements, and updates on window/visual-viewport resize and scroll. Pass
`portal={false}` only when the host deliberately owns clipping and stacking.
Overlay modes can opt into the body portal with `portal`, or target a specific
`HTMLElement`. Inline mode is never repositioned. No browser API is read during
module evaluation, so SSR imports remain safe.

## Dragging, docking, and resizing

These advanced options are disabled by default:

```tsx
<MediaPicker
  displayMode="popover"
  draggable={{
    enabled: true,
    boundary: "viewport",
    snap: "nearest-edge",
    snapThreshold: 24,
    onPositionChange: savePosition,
  }}
  resizable={{
    enabled: true,
    directions: ["right", "bottom", "bottom-right"],
    onDimensionsChange: saveDimensions,
  }}
  onSelect={handleSelect}
/>
```

Dragging starts only from the explicit header handle and only after a pointer
dead zone (4 CSS pixels for a mouse, 7 for touch/pen). The controller uses
Pointer Events and pointer capture, follows the pointer with a compositor
translate, then commits a bounded position. Snapping occurs only when the final
position is within `snapThreshold`; there is no uncontrolled inertia. The host
may control `position`, and can persist committed callbacks, but the SDK never
persists geometry automatically.

Resize handles enforce the CSS min/max values plus visual-viewport bounds.
Arrow keys move a floating picker; Shift increases the step. Resize handles use
Arrow Right/Down to grow, Alt with the arrow to shrink, and Home to reset. Focus
stays on the active handle. These controls supplement direct dimension settings
and do not make pointer input mandatory.

On narrow layouts, `displayMode="auto"` resolves to the existing bottom sheet,
so desktop floating drag/resize is not forced onto mobile. Layout decisions use
viewport size; gesture behavior uses each `PointerEvent.pointerType`. Hybrid
touch/mouse/pen devices are not permanently classified.

## Bottom-sheet swipe

```tsx
<MediaPicker
  displayMode="bottom-sheet"
  swipeToDismiss={{ enabled: true, distanceThreshold: 96 }}
  onClose={closePicker}
  onSelect={handleSelect}
/>
```

Only the sheet handle owns the swipe; the media grid continues to scroll. A
downward release dismisses after the configured distance or velocity threshold,
otherwise it settles back. Pointer cancellation, lost capture, window blur,
Escape, unmount, and React StrictMode cleanup all return the controller to idle.
Horizontal tab swiping and pinch-to-resize are intentionally absent: browser
zoom, scrolling, and assistive gestures remain available. `touch-action: none`
is applied only to explicit spatial handles, never the picker or page.

## Motion

```tsx
<MediaPicker motion="scale" onSelect={handleSelect} />
<MediaPicker
  motion={{ preset: "spring", duration: 180 }}
  onSelect={handleSelect}
/>
```

Presets are `none`, `fade`, `scale`, `pop`, `slide-up`, `slide-down`, `zoom`,
`spring`, plus experimental `genie`. They share one
transform/opacity motion layer and animate both entry and exit. `pop` is the
short default. A surface that is actually closing remains mounted through
`opening → open → closing → unmounted`; Escape, Back, and backdrop dismissal use
that same path. Integrated compact/full changes switch to the requested usable
surface immediately and animate its entry instead of delaying interaction for
two sequential phases. An animation-end signal drives normal completion and a
duration-based fallback protects against missing CSS or interrupted browser
animation events.

Positioning, direct manipulation, and presentation motion own separate DOM
layers. Geometry controls the outer positioner, drag/swipe controls a gesture
layer, and enter/exit motion controls its inner motion layer. This prevents
placement and active Pointer Events from reconstructing or overwriting the
animation transform. Direct manipulation disables canned motion until release
so animation never fights the pointer.

`genie` lazily mounts six bounded decorative slices in a viewport-clipped,
body-level `position: fixed` proxy. Horizontal compression, translation, and a
short per-slice stagger progressively form an original elastic funnel between
the compact trigger and full picker. The real picker remains the only
interactive and authoritative surface. The proxy is `aria-hidden`, `inert`,
pointer-transparent, contains no cloned controls or content, cannot contribute
to document dimensions, and is removed as soon as the transition settles. Its
source and destination geometry are read once per transition. Invalid
rectangles or a delayed lazy chunk leave the ordinary scale fallback visible;
direct manipulation removes the proxy; reduced motion resolves to `none`. The
normal picker path never creates slice nodes.

The earlier experimental `morph` preset was removed before beta.5 because its
real-surface transform could make host-page geometry appear unstable. It is not
accepted or silently remapped. Use `genie` for an isolated advanced transition
or `scale` for the conservative fallback.

The View Transitions API was evaluated as an optional enhancement, but is not
used for this beta: it is not universally available and its document snapshot
lifecycle is a poor fit for portal movement, authoritative focus, and direct
pointer manipulation. The dependency-free CSS/proxy implementation is the
baseline and does not rely on that API. A future implementation may feature
detect it for compatible hosts without changing the public motion contract.

Changing `motion` while an already-open picker is idle configures the next
transition; it does not replay entry or remount application state. The
playground, Storybook gallery, and external Presentation Lab provide explicit
Replay controls for comparing presets. Those labs also contain local-only
fluidity diagnostics; the production picker does not render a diagnostics UI or
send performance telemetry.

`prefers-reduced-motion: reduce` resolves every picker motion to `none`, removes
settle transitions and inertia, and leaves all controls operational. `motion="none"`
is the explicit host override.

## Interaction ownership and accessibility

One primary spatial interaction owns a pointer at a time:

```text
idle → pressing → dragging | resizing | swiping → idle
```

Emoji/grid input keeps selection and vertical scrolling; the header handle
moves; resize handles resize; the sheet handle dismisses. Movement below the
dead zone remains a tap. Multi-pointer attempts do not steal the active session.
Important touch controls gain approximately 44 × 44 CSS-pixel hit areas for
coarse pointers without increasing normal desktop density.

Dialogs retain Escape/backdrop dismissal, focus containment, and compact/full
focus restoration. Swipe has Close/Escape alternatives, drag and resize have
keyboard alternatives, and motion is never necessary to understand state.

The internal long-press primitive handles movement and cancellation but is not
wired to current media controls. Long press remains a future, experimental
extension and will never be the only way to discover variants or favorites.

Automated coverage simulates mouse/touch/pen-style pointer events. It is not a
claim of physical iOS, Android, stylus, or touch-monitor hardware validation.
