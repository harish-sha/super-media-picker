# Browser SDK and Web Component

The browser SDK exposes the same picker engine and normalized `MediaItem`
contract as the React SDK without requiring the consuming application to use or
install React. The standalone artifacts contain an isolated React runtime as an
implementation detail; they do not create `React` or `ReactDOM` globals.

Use one of three browser-native delivery styles:

- `super-media-picker.element.js` registers `<super-media-picker>`.
- `super-media-picker.esm.js` exports typed ESM functions and provider classes.
- `super-media-picker.global.js` registers the element and creates the single
  explicit `globalThis.SuperMediaPicker` API.

The files are deterministic npm artifacts under `dist/browser/`. CDN examples
use jsDelivr only as an illustration; unpkg, a company CDN, and self-hosting are
equivalent. Pin an exact package version in production.

## HTML and a CDN

```html
<super-media-picker
  allow-expand
  display-mode="inline"
  mode="compact"
  motion="spring"
  placement="bottom-start"
  storage-namespace="composer"
  theme="system"
></super-media-picker>

<script src="https://cdn.jsdelivr.net/npm/super-media-picker@beta/dist/browser/super-media-picker.global.js"></script>
<script>
  const picker = document.querySelector("super-media-picker");

  picker.addEventListener("media-select", (event) => {
    console.log(event.detail);
  });
</script>
```

The element loads `styles.css` relative to the executing browser artifact. This
keeps hashed lazy chunks and styles working under nested paths such as
`/npm/super-media-picker@VERSION/dist/browser/`; no CDN hostname or site root is
hard-coded.

## Global JavaScript API

```html
<div id="picker"></div>
<script src="/vendor/super-media-picker/super-media-picker.global.js"></script>
<script>
  const controller = SuperMediaPicker.create({
    target: "#picker",
    mode: "compact",
    allowExpand: true,
    theme: "dark",
  });

  controller.update({ dimensions: { width: 420, height: 560 } });
  controller.close();
  controller.open();

  // When the host no longer needs the picker:
  controller.destroy();
</script>
```

`destroy()` unmounts the internal root, cleans up listeners/observers, and
removes the generated element. A later `create()` produces an independent new
instance. Loading the script more than once does not redefine the custom
element or throw.

The global object exposes only `create`, `defineCustomElement`, `elementName`,
the four `Http*Provider` adapters, and `MediaProviderError`. It never exposes an
internal React root or component.

## Browser ESM

```html
<div id="picker"></div>
<script type="module">
  import {
    create,
    HttpGifProvider,
  } from "https://cdn.jsdelivr.net/npm/super-media-picker@beta/dist/browser/super-media-picker.esm.js";

  const controller = create({
    target: "#picker",
    features: { gifs: true },
    providers: {
      gifs: new HttpGifProvider({ endpoint: "/api/media/gifs" }),
    },
  });
</script>
```

For npm/import-map consumers, the equivalent imports are
`super-media-picker/web` and the auto-registering
`super-media-picker/element`. Both imports are safe during server-side module
evaluation; creating or connecting a picker still requires a browser document.

## Attributes and properties

Primitive declarative options are attributes:

| Attribute           | Values                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `theme`             | `light`, `dark`, `system`                                                                      |
| `mode`              | `compact`, `full`                                                                              |
| `size`              | `sm`, `md`, `lg`                                                                               |
| `display-mode`      | `auto`, `inline`, `popover`, `modal`, `bottom-sheet`, `fullscreen`                             |
| `motion`            | `none`, `fade`, `scale`, `pop`, `slide-up`, `slide-down`, `zoom`, `spring`, `genie`            |
| `placement`         | `auto`, `top`, `top-start`, `top-end`, `bottom`, `bottom-start`, `bottom-end`, `left`, `right` |
| `width`, `height`   | Positive pixel numbers or CSS-compatible dimension strings                                     |
| `allow-expand`      | Boolean presence attribute                                                                     |
| `storage-namespace` | Local persistence prefix                                                                       |
| `stylesheet-url`    | Explicit browser stylesheet URL                                                                |

JavaScript properties configure complex values:

```js
const picker = document.querySelector("super-media-picker");

picker.dimensions = {
  width: 420,
  height: "65dvh",
  minWidth: 320,
  maxHeight: 720,
};
picker.interactions = {
  draggable: { enabled: true, snap: "nearest-edge" },
  resizable: { enabled: true, directions: ["bottom-right"] },
  swipeToDismiss: true,
};
picker.features = { gifs: true, stickers: true, recents: true };
picker.providers = { gifs: gifProvider, stickers: stickerProvider };
picker.mediaSecurity = {
  allowedOrigins: ["https://media.company.com"],
  allowHttp: false,
};
```

Complex property values take precedence over their primitive attribute
fallbacks. Properties that reflect a primitive option (`size`, `placement`,
and `displayMode`) update the corresponding attribute. `mode` is also runtime
presentation state, so the most recent host assignment or integrated
compact/full transition is authoritative. Updating properties renders into the
existing root rather than recreating it.

`projectKey` is a reserved, inert extension point for a future hosted service.
Setting it does not perform authentication or make a network request today.

## Events

| Event                 | `detail`                                                  |
| --------------------- | --------------------------------------------------------- |
| `media-select`        | The same normalized `MediaItem` returned by the React SDK |
| `picker-open`         | `{ open: true, mode, placement }`                         |
| `picker-close`        | `{ open: false, mode, placement }`                        |
| `presentation-change` | `{ open, mode, placement }`                               |
| `error`               | `{ source: "provider"                                     | "render" | "stylesheet", error }` |

Every event has `bubbles: true`, `composed: true`, and `cancelable: false`, so a
listener on an ancestor outside the Shadow DOM can observe it. Selection and
presentation are already committed when the event fires; canceling an event is
therefore intentionally unsupported.

## Providers and backend neutrality

```js
const gifProvider = new SuperMediaPicker.HttpGifProvider({
  endpoint: "/api/media/gifs",
  timeoutMs: 8_000,
  retry: { attempts: 2 },
  mediaSecurity: {
    allowedOrigins: ["https://media.company.com"],
    allowHttp: false,
  },
});

picker.features = { gifs: true };
picker.providers = { gifs: gifProvider };
```

The protocol is standard HTTP/JSON with status codes, headers, request IDs,
abort signals, and opaque cursors:

```text
Browser SDK → developer backend → media vendor/CDN
```

Vendor credentials never belong in browser properties, HTML, or bundles. The
backend may be Java/Spring, PHP, Python, Ruby, .NET, Node.js, or any other stack
that implements the documented contract. The planned Super Media backend is a
Java/Spring modular monolith, but the browser protocol has no Java-specific or
Node-specific coupling.

## Shadow DOM, portals, and styling

Each element owns an open ShadowRoot containing two stable parts:

```text
<super-media-picker>
  #shadow-root
    [part="application"]  internal React mount
    [part="overlay"]      menus, floating surfaces, Genie proxy
```

The internal overlay root keeps tone menus, sticker-pack menus, modal/popover
surfaces, bottom sheets, and the fixed decorative Genie proxy styled and
instance-local. Document-level outside-click handling uses the composed event
path, so menu choices remain interactive through the Shadow boundary.

Theme tokens and documented CSS variables inherit through the host:

```css
super-media-picker {
  --mp-accent: #7c3aed;
  --mp-font-family: Inter, system-ui, sans-serif;
  --mp-picker-width: 28rem;
}

super-media-picker::part(application) {
  max-width: 100%;
}
```

Only `application` and `overlay` are stable parts. Internal grid/button class
names are implementation details. Shadow DOM prevents broad host selectors such
as `button { all: unset }` and `div { box-sizing: content-box }` from changing
the picker.

## Persistence and multiple instances

The default namespace is `media-picker`. Instances with the same namespace
intentionally share recents, favorites, and skin tone through the resilient
local-storage adapter. Use distinct namespaces for isolation:

```html
<super-media-picker storage-namespace="support"></super-media-picker>
<super-media-picker storage-namespace="sales"></super-media-picker>
```

Transient search, focus, portal, interaction, presentation, and lifecycle state
remain instance-local regardless of namespace. A custom asynchronous storage
adapter may be assigned through `picker.storage`.

## Self-hosting

Copy the entire `dist/browser/` directory without flattening or renaming its
`chunks/` folder:

```text
/assets/super-media-picker/
  super-media-picker.esm.js
  super-media-picker.element.js
  super-media-picker.global.js
  styles.css
  chunks/...
```

Serve JavaScript as `text/javascript` and CSS as `text/css`. Do not copy only
the entry file: ESM lazy imports resolve relative to it. To place the stylesheet
elsewhere, set `stylesheet-url` or `picker.stylesheetUrl` before connection.

## Framework hosts

Framework wrappers are intentionally unnecessary. Vue, Svelte, Angular,
server-rendered Spring/PHP/Django/Rails/ASP.NET pages, WordPress, and static
sites can render the same custom element and assign complex properties after a
DOM reference is available. In JSX-based hosts, use a ref for property values
instead of serializing provider objects into attributes. React consumers that
want native React composition should continue using the package root and React
peer dependencies.

## Accessibility, motion, and cleanup

The Web Component reuses the existing focus management, keyboard navigation,
Escape/Back/backdrop behavior, focus restoration, pointer controller, and ARIA
semantics. `prefers-reduced-motion` resolves complex motion—including Genie—to
no motion. Genie remains a lazy, fixed, pointer-inert, `aria-hidden` proxy in
the element's overlay root and never changes host-page geometry.

Disconnecting unmounts the root and cleans observers/listeners. Reconnecting
reuses the ShadowRoot and creates one fresh root. Multiple elements do not share
React roots or overlay nodes.

See [media security and CSP](security.md), [backend API](backend-api.md), and
[provider integration](providers.md) for production deployment details.
