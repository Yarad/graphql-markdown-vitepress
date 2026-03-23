/**
 * Pure text transformation utilities for GraphQL markdown processing.
 * No I/O, no state — fully reusable across passes.
 */

const PERMALINK_RE = /\s*\\?\{#([\w-]+)\\?\}\s*$/;

const MD_LINK_RE = /\[((?:[^[\]]|\[[^\]]*\])*)\]\(([^)]+)\)/g;

const PARENT_PREFIX_RE = /`\w+\./g;
const HTML_PARENT_PREFIX_RE =
  /<(?:code|span) class="gqlmd-mdx-entity-parent">[^<]*<\/(?:code|span)>\./g;

const SELF_ANCHOR_RE = /<a\s+href="#[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

const BADGE_RE = /<Badge type="[^"]*">([^<]*)<\/Badge>/g;
const BACKTICK_WITH_PARENT_RE = /`(\w+)\.([^`]+)`/g;
const BACKTICK_RE = /`([^`]+)`/g;
const ENTITY_THEN_LINK_RE = /(<\/code>)\s*(<a\s)/;

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
 * Removes the parent type prefix from entity names.
 * Handles both backtick markdown (`` `Type.field` `` → `` `field` ``)
 * and pre-rendered HTML (`<code class="gqlmd-mdx-entity-parent">Type</code>.` → removed).
 */
export function stripParentPrefix(text: string): string {
  return text.replace(PARENT_PREFIX_RE, "`").replace(HTML_PARENT_PREFIX_RE, "");
}

/**
 * Converts markdown-style summary text to styled HTML suitable for
 * `<summary>` elements where VitePress won't process markdown or
 * Vue components.
 *
 * - Backtick entities → `<code class="gqlmd-mdx-entity">` with parent/name spans
 * - `<Badge>` components → `.gqlmd-mdx-badge` spans
 * - Bullet separator inserted between field entity and type link
 */
export function summaryToHtml(text: string): string {
  if (text.includes("gqlmd-mdx-")) {
    return text.trim();
  }

  let result = text.replace(
    BADGE_RE,
    '<span class="gqlmd-mdx-badge">$1</span>',
  );

  result = result.replace(
    BACKTICK_WITH_PARENT_RE,
    '<code class="gqlmd-mdx-entity"><span class="gqlmd-mdx-entity-parent">$1.</span><span class="gqlmd-mdx-entity-name">$2</span></code>',
  );

  result = result.replace(
    BACKTICK_RE,
    '<code class="gqlmd-mdx-entity"><span class="gqlmd-mdx-entity-name">$1</span></code>',
  );

  result = result.replace(
    ENTITY_THEN_LINK_RE,
    '$1 <span class="gqlmd-mdx-bullet">\u2022</span> $2',
  );

  return result.trim();
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

/**
 * Escapes special regex characters in a string so it can be used
 * as a literal pattern inside a `RegExp` constructor.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
