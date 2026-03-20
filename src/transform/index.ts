/**
 * Document transformation pipeline for GraphQL markdown docs.
 *
 * Orchestrates passes over all generated markdown files:
 * 1. **Collapsible** — converts flat heading structure to `<details>/<summary>`
 * 2. **Inline expansion** — embeds referenced type fields for a Shopify-style
 *    nested documentation UI
 * 3. **Custom** — user-provided transform functions
 *
 * Each pass can be individually enabled/disabled via {@link TransformOptions}.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, relative } from "node:path";
import type { TransformOptions } from "../types.js";
import { resolveTransformConfig } from "./config.js";
import { transformMarkdown } from "./collapsible.js";
import { buildFieldsIndex, inlineTypeFields } from "./inline.js";
import { enhanceSeo } from "./seo.js";
import { cleanDirectoryUrls } from "./urls.js";

function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMdFiles(full));
    } else if (extname(entry.name) === ".md") {
      files.push(full);
    }
  }
  return files;
}

/**
 * Transforms all generated markdown files in-place.
 *
 * @param docsDir - Absolute path to the generated docs directory.
 * @param options - Transform pipeline configuration. Omit for default behavior.
 */
export async function transformGeneratedDocs(
  docsDir: string,
  options?: TransformOptions,
): Promise<void> {
  const config = resolveTransformConfig(options);

  const hasWork =
    config.collapsible ||
    config.inline ||
    config.custom.length > 0 ||
    config.seo ||
    config.cleanUrls;
  if (!hasWork) return;

  const files = collectMdFiles(docsDir);

  if (config.collapsible) {
    for (const filePath of files) {
      const content = readFileSync(filePath, "utf-8");
      const transformed = transformMarkdown(content, options);
      if (transformed !== content) {
        writeFileSync(filePath, transformed, "utf-8");
      }
    }
  }

  if (config.inline) {
    const index = buildFieldsIndex(docsDir, config.baseURL, options);

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf-8");
      const expanded = inlineTypeFields(content, index, options);
      if (expanded !== content) {
        writeFileSync(filePath, expanded, "utf-8");
      }
    }

    if (config.lazyInline) {
      const publicDir = join(docsDir, "..", "public");
      mkdirSync(publicDir, { recursive: true });
      const jsonIndex: Record<string, string> = {};
      for (const [url, html] of index.entries()) {
        jsonIndex[url] = html;
      }
      writeFileSync(
        join(publicDir, "_gql-fields-index.json"),
        JSON.stringify(jsonIndex),
        "utf-8",
      );
    }
  }

  for (const customTransform of config.custom) {
    for (const filePath of files) {
      const content = readFileSync(filePath, "utf-8");
      const transformed = customTransform(content);
      if (transformed !== content) {
        writeFileSync(filePath, transformed, "utf-8");
      }
    }
  }

  if (config.seo) {
    for (const filePath of files) {
      const content = readFileSync(filePath, "utf-8");
      const relPath = relative(docsDir, filePath);
      const enhanced = enhanceSeo(content, relPath, config.structuredData);
      if (enhanced !== content) {
        writeFileSync(filePath, enhanced, "utf-8");
      }
    }
  }

  if (config.cleanUrls) {
    cleanDirectoryUrls(docsDir);
  }
}

// Re-export public API from submodules
export { transformMarkdown } from "./collapsible.js";
export { buildFieldsIndex, inlineTypeFields } from "./inline.js";
export { parseFieldBlocks, renderFieldBlock } from "./parse.js";
export type { FieldBlock } from "./parse.js";
export { resolveTransformConfig } from "./config.js";
export type { ResolvedTransformConfig } from "./config.js";
export {
  mdLinksToHtml,
  stripSelfAnchors,
  stripParentPrefix,
  extractPermalinkId,
  headingLevel,
} from "./utils.js";
export { enhanceSeo, detectCategory, extractDescription } from "./seo.js";
export { cleanDirectoryUrls } from "./urls.js";
