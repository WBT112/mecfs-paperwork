# 1. Use NodeJS Polyfills for Browser Compatibility

* Status: accepted
* Date: 2024-07-30

## Context and Problem Statement

The application uses the `docx-templates` library to generate documents for export. This library was originally designed for a Node.js environment and depends on several built-in Node.js modules, such as `stream` and `util`. When used in a browser-based environment, these modules are not available, which causes the application to crash during document export operations.

## Decision Drivers

* The need to support document export functionality in the browser.
* The `docx-templates` library provides the required features for document generation.
* The Vite build tool provides a mechanism to substitute Node.js modules with browser-compatible equivalents.

## Considered Options

1. **Use Node.js polyfills:** Provide browser-compatible versions of the required Node.js modules.
2. **Replace `docx-templates`:** Find and integrate a different library for document generation that is designed for the browser.
3. **Remove document export functionality:** This was not a viable option as it is a core feature.

## Decision Outcome

Chosen option: "Use Node.js polyfills", because it allows the continued use of the `docx-templates` library with minimal changes to the existing codebase.

The following polyfills are configured in `app/vite.config.ts`:
- `events`
- `stream-browserify`
- `util`

## Consequences

### Positive

* The `docx-templates` library works correctly in the browser.
* Document export functionality is available to users.
* The solution is relatively simple to implement and maintain.

### Negative

* The application's bundle size is increased by the inclusion of the polyfills.
* The application now has a dependency on these polyfills, which may need to be updated or replaced in the future.
