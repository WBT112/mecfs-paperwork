# Server Security Headers

This document explains the purpose of the HTTP security headers implemented in the `nginx/default.conf` configuration.

## Content-Security-Policy (CSP)

- **Directive:** `default-src 'self' blob:; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';`
- **Purpose:** This header helps prevent Cross-Site Scripting (XSS) and other content injection attacks by specifying which dynamic resources are allowed to load.
  - `default-src 'self' blob:`: Restricts all resources to the same origin, but allows `blob:` URLs, which are required for client-side file generation (e.g., JSON imports and DOCX exports).
  - `script-src 'self' 'unsafe-eval'`: Allows scripts from the same origin. `'unsafe-eval'` is required for the `docx-templates` library to function correctly.
  - `style-src 'self' 'unsafe-inline'`: Allows stylesheets from the same origin and allows inline styles, which are used by the application's UI components.
  - `img-src 'self' data:`: Allows images from the same origin and from `data:` URIs.
  - `font-src 'self'`: Allows fonts from the same origin.
  - `connect-src 'self'`: Restricts `fetch`, `XHR`, `WebSocket`, and `EventSource` connections to the same origin.

## X-Frame-Options

- **Directive:** `SAMEORIGIN`
- **Purpose:** Protects against "clickjacking" attacks by preventing the page from being embedded in an `<iframe>`, `<frame>`, `<embed>`, or `<object>` on a different domain.

## X-Content-Type-Options

- **Directive:** `nosniff`
- **Purpose:** Prevents the browser from MIME-sniffing the content type of a response away from the one declared by the server. This mitigates attacks where a file might be misinterpreted as a different content type (e.g., an image being treated as a script).

## Referrer-Policy

- **Directive:** `no-referrer`
- **Purpose:** Enhances user privacy by preventing the browser from sending the `Referer` header with requests.

## Cache-Control

- **Policy:** Immutable caching for hashed assets; revalidation for all other routes and JSON formpack resources.
  - `/assets/*` → `public, max-age=31536000, immutable`
  - `/formpacks/*` → `no-cache, must-revalidate`
  - everything else (including deep links resolved to `index.html`) → `no-cache, must-revalidate`
- **Implementation:** `nginx/default.conf` (`map $uri $cache_control` and `add_header Cache-Control ...`).
- **Enforced by:** `.github/workflows/docker-smoke.yml` running `tools/header-smoke.mjs`.

## Permissions-Policy

- **Directive:** `geolocation=(), microphone=(), camera=()`
- **Purpose:** Controls access to sensitive browser features. This policy explicitly disables access to the Geolocation, Microphone, and Camera APIs, following the principle of least privilege.
