/**
 * Convert a VitePress route-space path (carrying `site.base`) into the
 * link-space namespace that the markdown generator emits hrefs in.
 * Inverse of VitePress's `withBase`.
 *
 * @example
 * stripBase("/docs/api/graphql/foo", "/docs/") // "/api/graphql/foo"
 * stripBase("/foo", "/")                       // "/foo"
 */
export function stripBase(path: string, base: string): string {
  if (!base || base === "/") return path;
  const normalized = base.endsWith("/") ? base : base + "/";
  return path.startsWith(normalized)
    ? "/" + path.slice(normalized.length)
    : path;
}
