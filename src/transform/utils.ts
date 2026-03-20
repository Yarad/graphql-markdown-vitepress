/**
 * Pure text transformation utilities for GraphQL markdown processing.
 * No I/O, no state — fully reusable across passes.
 */

const PERMALINK_RE = /\s*\\?\{#([\w-]+)\\?\}\s*$/;

const MD_LINK_RE = /\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)]+)\)/g;

const PARENT_PREFIX_RE =
  /<code class="gqlmd-mdx-entity-parent">[^<]*<\/code>\./g;

const SELF_ANCHOR_RE = /<a\s+href="#[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

/**
 * Converts markdown link syntax `[text](url)` to HTML `<a>` tags.
 * Handles one level of nested brackets (e.g. `[[Game!]!](url)`).
 * Needed because VitePress doesn't parse markdown inside raw HTML blocks.
 */
export function mdLinksToHtml(text: string): string {
  return text.replace(MD_LINK_RE, (_match, content, url) => {
    return `<a href="${url}">${content}</a>`;
  });
}

/**
 * Strips self-referencing anchors (`href="#..."`) from HTML,
 * keeping only their inner content. Prevents VitePress's SPA router
 * from intercepting clicks on `<summary>` elements and blocking
 * the native `<details>` toggle.
 * Cross-page links (`href="/graphql/..."`) are preserved.
 */
export function stripSelfAnchors(text: string): string {
  return text.replace(SELF_ANCHOR_RE, "$1");
}

/**
 * Removes the parent type prefix markup from entity names.
 * Turns `<code class="gqlmd-mdx-entity-parent">Type</code>.<code ...>field</code>`
 * into just `<code ...>field</code>`.
 */
export function stripParentPrefix(text: string): string {
  return text.replace(PARENT_PREFIX_RE, "");
}

/**
 * Extracts a VitePress permalink id (`{#some-id}`) from a heading line.
 * Returns the cleaned line (without the permalink) and the extracted id.
 */
export function extractPermalinkId(line: string): {
  cleaned: string;
  id: string;
} {
  const match = line.match(PERMALINK_RE);
  if (match) {
    return { cleaned: line.replace(PERMALINK_RE, "").trimEnd(), id: match[1] };
  }
  return { cleaned: line.trimEnd(), id: "" };
}

/**
 * Returns the markdown heading level (1–6) for a line, or 0 if not a heading.
 */
export function headingLevel(line: string): number {
  const match = line.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
}
