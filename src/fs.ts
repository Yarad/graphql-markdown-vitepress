/**
 * Shared filesystem utilities for recursive markdown file collection.
 */

import { readdirSync } from "node:fs";
import { join, extname, relative, basename } from "node:path";

export interface ScannedFile {
  fullPath: string;
  relativePath: string;
  slug: string;
}

/**
 * Recursively collects all `.md` files under {@link dir}.
 * Returns absolute paths sorted by directory traversal order.
 */
export function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      files.push(...collectMdFiles(full));
    } else if (extname(entry.name) === ".md") {
      files.push(full);
    }
  }
  return files;
}

/**
 * Like {@link collectMdFiles} but returns enriched metadata
 * including the path relative to {@link baseDir} and the filename slug.
 */
export function scanMdFiles(baseDir: string): ScannedFile[] {
  return collectMdFiles(baseDir).map((fullPath) => ({
    fullPath,
    relativePath: relative(baseDir, fullPath),
    slug: basename(fullPath, ".md"),
  }));
}
