/**
 * Pass 1: Converts flat markdown heading structure into collapsible
 * `<details>/<summary>` blocks for field/argument/value sections.
 * Also applies section heading renames (e.g. "Type" → "Response").
 */

import type { TransformOptions } from "../types.js";
import { resolveTransformConfig } from "./config.js";
import { headingLevel } from "./utils.js";
import { parseFieldBlocks, renderFieldBlock } from "./parse.js";

/**
 * Transforms a single markdown document: replaces flat h4/h5 field listings
 * inside recognized h3 sections with collapsible `<details>` elements.
 *
 * @param content - Raw markdown content.
 * @param options - Optional transform config for sections, renames, CSS, and labels.
 */
export function transformMarkdown(
  content: string,
  options?: TransformOptions,
): string {
  const { collapsibleSections, sectionRenames, css } =
    resolveTransformConfig(options);

  const lines = content.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const level = headingLevel(line);

    if (level === 3) {
      const sectionTitle = line.replace(/^###\s+/, "").trim().toLowerCase();

      if (collapsibleSections.includes(sectionTitle)) {
        output.push(line);
        output.push("");
        i++;

        const sectionLines: string[] = [];
        while (i < lines.length) {
          const nextLevel = headingLevel(lines[i]);
          if (nextLevel > 0 && nextLevel <= 3) {
            break;
          }
          sectionLines.push(lines[i]);
          i++;
        }

        const blocks = parseFieldBlocks(sectionLines, 4);
        for (const block of blocks) {
          output.push(...renderFieldBlock(block, css.field, options));
          output.push("");
        }
        continue;
      }
    }

    const renamed = sectionRenames[line.trimEnd()];
    output.push(renamed ?? line);
    i++;
  }

  return output.join("\n");
}
