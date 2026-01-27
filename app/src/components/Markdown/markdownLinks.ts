// RATIONALE: To prevent XSS attacks, we must ensure that link URLs do not
// contain dangerous protocols like `javascript:`. This check ensures that only
// safe, whitelisted protocols are allowed in rendered links.
// It must also be environment-agnostic (not rely on `window`).
export const isSafeHref = (href: string) => {
  try {
    // Use a dummy base to handle relative URLs correctly. The base itself
    // is irrelevant; we only care about the resulting protocol.
    const url = new URL(href, 'https://dummy.base');
    return ['http:', 'https:', 'mailto:'].includes(url.protocol);
  } catch {
    // Malformed URLs are considered unsafe.
    return false;
  }
};

export const isExternalHref = (href: string) => {
  // An external link is one that starts with a protocol. This is a simpler
  // and more robust check than trying to compare origins.
  return /^(?:https?|mailto):|^\/\//i.test(href);
};
