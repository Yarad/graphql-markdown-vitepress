/**
 * Markdown field block parser and HTML renderer.
 * Converts flat heading hierarchies (h4/h5) into a structured FieldBlock tree,
 * then renders each block as a collapsible `<details>/<summary>` element.
 */

import type { TransformOptions } from "../types.js";
import { resolveTransformConfig } from "./config.js";
import {
  extractPermalinkId,
  headingLevel,
  mdLinksToHtml,
  stripParentPrefix,
  stripSelfAnchors,
} from "./utils.js";

export interface FieldBlock {
  heading: string;
  id: string;
  description: string[];
  children: FieldBlock[];
}

/**
 * Recursively parses markdown lines into a tree of FieldBlocks.
 * Each heading at `baseLevel` becomes a block; headings at `baseLevel + 1`
 * become its children (used for nested arguments).
 */
export function parseFieldBlocks(lines: string[], baseLevel: number): FieldBlock[] {
  const blocks: FieldBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const level = headingLevel(line);

    if (level === baseLevel) {
      const rawHeading = line.replace(/^#{1,6}\s/, "");
      const { cleaned, id } = extractPermalinkId(rawHeading);
      const block: FieldBlock = {
        heading: cleaned,
        id,
        description: [],
        children: [],
      };
      i++;

      const childLines: string[] = [];
      const descLines: string[] = [];
      let collectingChildren = false;

      while (i < lines.length) {
        const nextLevel = headingLevel(lines[i]);
        if (nextLevel === baseLevel || (nextLevel > 0 && nextLevel < baseLevel)) {
          break;
        }
        if (nextLevel === baseLevel + 1) {
          collectingChildren = true;
        }
        if (collectingChildren) {
          childLines.push(lines[i]);
        } else {
          descLines.push(lines[i]);
        }
        i++;
      }

      while (descLines.length > 0 && descLines[descLines.length - 1].trim() === "") {
        descLines.pop();
      }
      while (descLines.length > 0 && descLines[0].trim() === "") {
        descLines.shift();
      }
      block.description = descLines;

      if (childLines.length > 0) {
        block.children = parseFieldBlocks(childLines, baseLevel + 1);
      }

      blocks.push(block);
    } else {
      i++;
    }
  }

  return blocks;
}

/**
 * Renders a FieldBlock tree as nested `<details>/<summary>` HTML lines.
 * Applies text cleanup (parent prefix stripping, self-anchor removal,
 * markdown→HTML link conversion) to summary content.
 *
 * @param block - The field block to render.
 * @param cssClass - CSS class for the outer `<details>` element.
 * @param options - Optional transform config for CSS classes and labels.
 */
export function renderFieldBlock(
  block: FieldBlock,
  cssClass: string,
  options?: TransformOptions,
): string[] {
  const { css, labels } = resolveTransformConfig(options);

  const out: string[] = [];
  const idAttr = block.id ? ` id="${block.id}"` : "";
  out.push(`<details class="${cssClass}"${idAttr}>`);
  out.push(
    `<summary>${stripSelfAnchors(stripParentPrefix(mdLinksToHtml(block.heading)))}</summary>`,
  );
  out.push("");

  if (block.description.length > 0) {
    out.push(
      `<p class="${css.desc}">${block.description.map((l) => l.trim()).join(" ")}</p>`,
    );
  }

  if (block.children.length > 0) {
    out.push(`<div class="${css.fieldArgs}">`);
    out.push(`<span class="${css.argsLabel}">${labels.arguments}</span>`);
    for (const child of block.children) {
      out.push(...renderFieldBlock(child, css.arg, options));
    }
    out.push(`</div>`);
  }

  out.push("</details>");
  return out;
}
