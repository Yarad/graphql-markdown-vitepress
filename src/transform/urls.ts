/**
 * URL cleanup pass: strips numeric ordering prefixes from directory names
 * (e.g. `01-operations` → `operations`) and updates all internal links.
 * Runs as the final transform pass to avoid interfering with earlier
 * passes that rely on the original numbered directory structure.
 */

import {
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { collectMdFiles } from "../fs.js";

function collectNumberedDirs(dir: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && /^\d+-/.test(entry.name)) {
      map.set(entry.name, entry.name.replace(/^\d+-/, ""));
      const sub = collectNumberedDirs(join(dir, entry.name));
      for (const [k, v] of sub) map.set(k, v);
    }
  }
  return map;
}

/**
 * Renames directories depth-first so children are moved before parents.
 */
function renameDirs(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const fullPath = join(dir, entry.name);
      renameDirs(fullPath);
      if (/^\d+-/.test(entry.name)) {
        const newPath = join(dir, entry.name.replace(/^\d+-/, ""));
        if (existsSync(newPath)) {
          rmSync(newPath, { recursive: true });
        }
        renameSync(fullPath, newPath);
      }
    }
  }
}

/**
 * Strips numeric ordering prefixes from all directories under `docsDir`
 * and rewrites every internal link in the markdown files to match.
 */
export function cleanDirectoryUrls(docsDir: string): void {
  const dirMap = collectNumberedDirs(docsDir);
  if (dirMap.size === 0) return;

  const files = collectMdFiles(docsDir);
  for (const filePath of files) {
    let content = readFileSync(filePath, "utf-8");
    let changed = false;

    for (const [numbered, clean] of dirMap) {
      const search = `/${numbered}/`;
      if (content.includes(search)) {
        content = content.split(search).join(`/${clean}/`);
        changed = true;
      }
    }

    if (changed) {
      writeFileSync(filePath, content, "utf-8");
    }
  }

  renameDirs(docsDir);
}
