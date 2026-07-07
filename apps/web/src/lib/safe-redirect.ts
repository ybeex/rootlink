/**
 * Validates a `?redirect=` query parameter before passing it to
 * `router.replace()`/`window.location`.
 *
 * Accepts only same-site relative paths starting with a single `/`. Rejects:
 *   - absolute URLs ("https://evil.com", "//evil.com" — the protocol-relative
 *     trick where a browser treats "//host" as a different origin)
 *   - anything not starting with "/" (e.g. "javascript:alert(1)")
 *
 * Next.js's `router.replace()` is already scoped to the app's route tree and
 * would not navigate to an external URL today, so this is defense-in-depth:
 * it keeps the same guarantee even if this value is ever passed to
 * `window.location` (as a hard navigation) in the future.
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  return true;
}

/** Returns `path` if safe, otherwise `fallback`. */
export function safeRedirect(path: string | null | undefined, fallback: string): string {
  return isSafeRedirectPath(path) ? path : fallback;
}
