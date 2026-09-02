# Media security and CSP

## Secret boundary

Never embed a production vendor key in browser code:

```text
wrong:     browser → vendor key → third-party API
preferred: browser → company backend → configured provider
```

The SDK requires endpoints and normalized data, not vendor credentials. Keep
API keys, signing secrets, moderation tokens, tenant authorization, and raw
provider responses on the server. `.env.example`, tests, Storybook, playground
fixtures, and package tarballs must contain no secrets.

## URL policy

`isSafeMediaUrl` rejects executable schemes such as `javascript:` and
`data:text/html`, SVG data URLs, credential-bearing URLs, and protocol-relative
URLs. `MediaPicker.mediaSecurity` applies the same policy before rendering
media. Every built-in HTTP provider accepts a matching `mediaSecurity` option
for response validation and a separate `endpointSecurity` policy for its
application-backend endpoint.

Production configuration should normally use:

```ts
const mediaSecurity = {
  allowedOrigins: ["https://media.company.com"],
  allowHttp: false,
  allowDataImages: false,
  allowBlob: false,
  allowRelative: true,
};
```

Relative URLs remain useful when the application backend and media share an
origin. The default policy remains development-friendly and backwards
compatible; production hosts should opt into HTTPS/origin restrictions.

Invalid or failed image/video assets render a neutral fallback. One malformed
item does not crash the picker or its provider panel.

HTTP adapter `headers` may be a function that returns a short-lived
application session token, and `credentials: "include"` may be used for a
host-owned cookie session. Those are browser-to-application credentials only.
Never place an upstream vendor key in this configuration: all npm/browser
source and network inspection is visible to the end user.

The SDK never executes provider HTML. Data images are limited to common raster
formats; production applications should normally disable them entirely.

## Content Security Policy

Adapt these directives to the application's actual origins:

```text
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' https://media.company.com data: blob:;
media-src 'self' https://media.company.com blob:;
connect-src 'self' https://api.company.com;
```

- `img-src` covers static images, GIF and animated WebP.
- `media-src` covers WebM/video assets.
- `connect-src` covers the application media API and any host-selected Lottie
  fetch path.
- Remove `data:`/`blob:` if the application does not use them.
- Add provider attribution-logo origins only when required.

The picker does not require `unsafe-eval`, remote HTML, or injected provider
markup. Structural styles ship as a static CSS file. Custom token values may be
applied through React's style attribute, so a strict `style-src` policy may
need the application's normal strategy for React inline styles.
