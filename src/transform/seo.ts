/**
 * SEO enhancement pass: enriches frontmatter with per-page description
 * derived from the GraphQL schema, improves page titles with a category
 * qualifier, and ensures each page has a proper H1 heading.
 */

import matter from "gray-matter";

const CATEGORY_MAP: Record<string, string> = {
  queries: "Query",
  mutations: "Mutation",
  subscriptions: "Subscription",
  objects: "Object",
  inputs: "Input",
  enums: "Enum",
  scalars: "Scalar",
  interfaces: "Interface",
  unions: "Union",
};

/**
 * Detects the GraphQL category from a file's relative path by matching
 * numbered directory names like `07-queries` or `06-objects`.
 */
export function detectCategory(relativePath: string): string | null {
  const parts = relativePath.split(/[/\\]/);
  for (const part of parts) {
    const match = part.match(/^\d+-(\w+)$/);
    if (match && CATEGORY_MAP[match[1]]) {
      return CATEGORY_MAP[match[1]];
    }
  }
  return null;
}

/**
 * Extracts the first meaningful paragraph from the markdown body.
 * This corresponds to the GraphQL schema description for the type/operation.
 */
export function extractDescription(body: string): string {
  const lines = body.split("\n");
  const descLines: string[] = [];
  let started = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!started) {
      if (
        trimmed &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("```") &&
        !trimmed.startsWith("<")
      ) {
        started = true;
        descLines.push(trimmed);
      }
    } else {
      if (
        trimmed === "" ||
        trimmed.startsWith("```") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("<")
      ) {
        break;
      }
      descLines.push(trimmed);
    }
  }

  const desc = descLines.join(" ").trim();
  return desc === "No description" ? "" : desc;
}

/**
 * Enhances a markdown file's frontmatter with SEO metadata and inserts
 * an H1 heading when one is missing.
 *
 * @param content - Raw markdown file content (with frontmatter).
 * @param relativePath - File path relative to the docs directory.
 * @param addStructuredData - Whether to inject JSON-LD structured data.
 */
export function enhanceSeo(
  content: string,
  relativePath: string,
  addStructuredData: boolean,
): string {
  const filename = relativePath.split(/[/\\]/).pop() ?? "";
  if (filename === "index.md" || filename === "generated.md") {
    return content;
  }

  const { data, content: body } = matter(content);
  const category = detectCategory(relativePath);
  const description = extractDescription(body);
  const alreadyEnhanced = !!data.sidebar_title;
  const originalTitle: string =
    data.sidebar_title ?? data.title ?? data.id ?? "";

  if (category && !alreadyEnhanced) {
    data.sidebar_title = originalTitle;
    data.title = `${originalTitle} ${category}`;
  }

  if (description) {
    data.description = description;
  }

  const hasJsonLd = Array.isArray(data.head) &&
    data.head.some(
      (h: unknown[]) =>
        Array.isArray(h) &&
        h[1] &&
        typeof h[1] === "object" &&
        (h[1] as Record<string, string>).type === "application/ld+json",
    );

  if (addStructuredData && !hasJsonLd && (description || category)) {
    const jsonLd: Record<string, string> = {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      name: data.title,
    };
    if (description) {
      jsonLd.description = description;
    }
    if (!data.head) data.head = [];
    data.head.push([
      "script",
      { type: "application/ld+json" },
      JSON.stringify(jsonLd),
    ]);
  }

  const bodyLines = body.split("\n");
  const hasH1 = bodyLines.some((line) => /^#\s/.test(line));

  let newBody = body;
  if (!hasH1 && originalTitle) {
    const firstContentIdx = bodyLines.findIndex((line) => line.trim() !== "");
    if (firstContentIdx >= 0) {
      bodyLines.splice(firstContentIdx, 0, `# ${originalTitle}`, "");
      newBody = bodyLines.join("\n");
    }
  }

  return matter.stringify(newBody, data);
}
