/**
 * Pass 2: Builds a type-fields index from all generated pages, then inlines
 * referenced type fields into `<details>` blocks and Response sections.
 * Expansion is recursive up to `inlineDepth` levels; a visited-type set
 * prevents circular references.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";
import type { CssClassMap, TransformLabels, TransformOptions } from "../types.js";
import { resolveTransformConfig } from "./config.js";
import {
  headingLevel,
  mdLinksToHtml,
  stripParentPrefix,
  stripSelfAnchors,
} from "./utils.js";
import { parseFieldBlocks } from "./parse.js";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a regex that matches href attributes pointing to inlineable type pages.
 * Supports both prefixed (`/{baseURL}/{NN}-{group}/{NN}-{category}/{slug}`)
 * and clean (`/{baseURL}/{group}/{category}/{slug}`) URL formats.
 */
function buildTypeHrefRegex(baseURL: string, categories: string[]): RegExp {
  const escapedBase = escapeRegExp(baseURL);
  const catPattern = categories.map((c) => `(?:\\d+-)?${escapeRegExp(c)}`).join("|");
  return new RegExp(
    `href="(\\/${escapedBase}\\/(?:\\d+-)?[^/]+\\/(?:${catPattern})\\/[^"]+)"`,
  );
}

// ── Index building ──────────────────────────────────

/**
 * Extracts the `<details>` HTML from the Fields/Values/Input Fields
 * section of a transformed markdown file.
 */
function extractFieldsHtml(content: string, fieldSections: string[]): string | null {
  const lines = content.split("\n");
  const fieldLines: string[] = [];
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const level = headingLevel(lines[i]);

    if (level === 3) {
      const title = lines[i]
        .replace(/^###\s+/, "")
        .trim()
        .toLowerCase();
      if (fieldSections.includes(title)) {
        inSection = true;
        continue;
      }
      if (inSection) {
        break;
      }
    }

    if (inSection) {
      fieldLines.push(lines[i]);
    }
  }

  const html = fieldLines.join("\n").trim();
  return html.length > 0 ? html : null;
}

/**
 * Builds an index mapping URL paths to their fields HTML.
 *
 * @param docsDir - Absolute path to the generated docs directory.
 * @param baseURL - Base URL segment (e.g. "graphql").
 * @param options - Optional transform config for field section titles.
 *
 * @example
 * index.get("/graphql/02-types/06-objects/player")
 * // → '<details class="gql-field" id="pin">…</details>\n…'
 */
export function buildFieldsIndex(
  docsDir: string,
  baseURL: string,
  options?: TransformOptions,
): Map<string, string> {
  const { fieldSections } = resolveTransformConfig(options);
  const index = new Map<string, string>();

  function walk(dir: string, urlPrefix: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, `${urlPrefix}/${entry.name}`);
        continue;
      }

      if (extname(entry.name) !== ".md" || entry.name === "index.md") {
        continue;
      }

      const slug = entry.name.replace(/\.md$/, "");
      const urlPath = `/${baseURL}${urlPrefix}/${slug}`;
      const content = readFileSync(fullPath, "utf-8");
      const fieldsHtml = extractFieldsHtml(content, fieldSections);

      if (fieldsHtml) {
        index.set(urlPath, fieldsHtml);
      }
    }
  }

  walk(docsDir, "");
  return index;
}

// ── Inline helpers ──────────────────────────────────

function extractTypeRef(line: string, typeHrefRe: RegExp): string | null {
  const match = line.match(typeHrefRe);
  return match ? match[1] : null;
}

/**
 * Wraps inlined fields HTML in a container div, converting top-level
 * field classes to inline-field classes to distinguish nesting depth.
 */
function wrapInlineFields(
  fieldsHtml: string,
  label: string,
  css: Required<CssClassMap>,
): string {
  const rewritten = fieldsHtml.replace(
    new RegExp(`class="${escapeRegExp(css.field)}"`, "g"),
    `class="${css.inlineField}"`,
  );

  return [
    `<div class="${css.inlineFields}">`,
    `<span class="${css.argsLabel}">${label}</span>`,
    stripSelfAnchors(rewritten),
    `</div>`,
  ].join("\n");
}

/**
 * Emits a lightweight placeholder that the client-side script will
 * replace with the actual fields HTML on demand.
 */
function wrapLazyPlaceholder(
  typeUrl: string,
  label: string,
  css: Required<CssClassMap>,
): string {
  return [
    `<div class="${css.inlineFields} gql-lazy-fields" data-type-url="${typeUrl}">`,
    `<span class="${css.argsLabel}">${label}</span>`,
    `</div>`,
  ].join("\n");
}

// ── Recursive expansion ─────────────────────────────

/**
 * Recursively expands type references inside raw fields HTML from the index.
 * For each `<details>` block that references an object/input type, that type's
 * own fields are fetched from the index and appended (wrapped) inside.
 * Circular references are prevented by tracking visited type URLs.
 *
 * When `lazyAfterDepth` is set and the current depth reaches that threshold,
 * a lightweight placeholder is emitted instead of the full expansion.
 * The client-side script handles loading the content on demand.
 */
function expandFieldsRecursively(
  fieldsHtml: string,
  index: Map<string, string>,
  typeHrefRe: RegExp,
  css: Required<CssClassMap>,
  labels: Required<TransformLabels>,
  depth: number,
  maxDepth: number,
  visited: Set<string>,
  lazyAfterDepth?: number,
): string {
  if (depth >= maxDepth) return fieldsHtml;

  const lines = fieldsHtml.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (
      line.startsWith(`<details class="${css.field}"`) ||
      line.startsWith(`<details class="${css.arg}"`)
    ) {
      const detailLines: string[] = [line];
      i++;
      let nestCount = 1;

      while (i < lines.length && nestCount > 0) {
        const cl = lines[i];
        if (cl.startsWith("<details ")) nestCount++;
        if (cl.trim() === "</details>") {
          nestCount--;
          if (nestCount === 0) {
            const summaryLine = detailLines.find((l) => l.startsWith("<summary>"));
            const typeRef = summaryLine ? extractTypeRef(summaryLine, typeHrefRe) : null;

            if (typeRef && index.has(typeRef) && !visited.has(typeRef)) {
              if (lazyAfterDepth !== undefined && depth >= lazyAfterDepth) {
                detailLines.push(wrapLazyPlaceholder(typeRef, labels.fields, css));
              } else {
                const childVisited = new Set(visited);
                childVisited.add(typeRef);
                const expanded = expandFieldsRecursively(
                  index.get(typeRef)!,
                  index,
                  typeHrefRe,
                  css,
                  labels,
                  depth + 1,
                  maxDepth,
                  childVisited,
                  lazyAfterDepth,
                );
                detailLines.push(wrapInlineFields(expanded, labels.fields, css));
              }
            }

            detailLines.push(cl);
            break;
          }
        }
        detailLines.push(cl);
        i++;
      }

      for (const dl of detailLines) output.push(dl);
      i++;
      continue;
    }

    output.push(line);
    i++;
  }

  return output.join("\n");
}

// ── Pass 2 core ─────────────────────────────────────

/**
 * Inlines referenced type fields into a single markdown document.
 *
 * Two injection points:
 * 1. **Response sections** — flat h4 type references become open `<details>`
 *    with the target type's fields embedded.
 * 2. **Existing `<details>` blocks** — when a field/argument references an
 *    object or input type, that type's fields are appended inside.
 *
 * Object-type fields within inlined content are recursively expanded up to
 * `inlineDepth` levels. A per-path visited set prevents circular references.
 *
 * @param content - Markdown content (already through the collapsible pass).
 * @param index - Type fields index from {@link buildFieldsIndex}.
 * @param options - Optional transform config for CSS, labels, URL matching.
 */
export function inlineTypeFields(
  content: string,
  index: Map<string, string>,
  options?: TransformOptions,
): string {
  const config = resolveTransformConfig(options);
  const { css, labels, responseSections, inlineDepth, lazyInline } = config;
  const typeHrefRe = buildTypeHrefRegex(config.baseURL, config.inlineTypeCategories);
  const lazyAfterDepth = lazyInline ? 1 : undefined;

  const lines = content.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const level = headingLevel(line);

    if (level === 3) {
      const sectionTitle = line
        .replace(/^###\s+/, "")
        .trim()
        .toLowerCase();
      if (responseSections.includes(sectionTitle)) {
        output.push(line);
        i++;

        const sectionLines: string[] = [];
        while (i < lines.length) {
          const nl = headingLevel(lines[i]);
          if (nl > 0 && nl <= 3) break;
          sectionLines.push(lines[i]);
          i++;
        }

        const blocks = parseFieldBlocks(sectionLines, 4);
        for (const block of blocks) {
          const summaryHtml = stripParentPrefix(mdLinksToHtml(block.heading));
          const typeRef = extractTypeRef(summaryHtml, typeHrefRe);
          const descText = block.description
            .map((l) => l.trim())
            .filter(Boolean)
            .join(" ");

          output.push("");
          output.push(`<details class="${css.field} ${css.responseType}" open>`);
          output.push(`<summary>${summaryHtml}</summary>`);
          if (descText) {
            output.push(`<p class="${css.desc}">${descText}</p>`);
          }

          if (typeRef && index.has(typeRef)) {
            const expanded = expandFieldsRecursively(
              index.get(typeRef)!,
              index,
              typeHrefRe,
              css,
              labels,
              1,
              inlineDepth,
              new Set([typeRef]),
              lazyAfterDepth,
            );
            output.push(wrapInlineFields(expanded, labels.fields, css));
          }

          output.push(`</details>`);
          output.push("");
        }

        if (blocks.length === 0) {
          for (const sl of sectionLines) output.push(sl);
        }
        continue;
      }
    }

    if (
      line.startsWith(`<details class="${css.field}"`) ||
      line.startsWith(`<details class="${css.arg}"`)
    ) {
      const detailLines: string[] = [line];
      i++;
      let depth = 1;

      while (i < lines.length && depth > 0) {
        const cl = lines[i];
        if (cl.startsWith("<details ")) depth++;
        if (cl.trim() === "</details>") {
          depth--;
          if (depth === 0) {
            const summaryLine = detailLines.find((l) => l.startsWith("<summary>"));
            const typeRef = summaryLine ? extractTypeRef(summaryLine, typeHrefRe) : null;

            if (typeRef && index.has(typeRef)) {
              const expanded = expandFieldsRecursively(
                index.get(typeRef)!,
                index,
                typeHrefRe,
                css,
                labels,
                1,
                inlineDepth,
                new Set([typeRef]),
                lazyAfterDepth,
              );
              detailLines.push(wrapInlineFields(expanded, labels.fields, css));
            }

            detailLines.push(cl);
            break;
          }
        }
        detailLines.push(cl);
        i++;
      }

      for (const dl of detailLines) output.push(dl);
      i++;
      continue;
    }

    output.push(line);
    i++;
  }

  return output.join("\n");
}
