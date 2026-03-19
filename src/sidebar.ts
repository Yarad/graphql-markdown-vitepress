import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { SidebarConfig, SidebarItem, SidebarLink } from "./types.js";

/**
 * Humanizes a category folder name (e.g. "01-objects" -> "Objects").
 */
function categoryLabel(dirName: string): string {
  const withoutOrder = dirName.replace(/^\d+-/, "");
  return withoutOrder
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Title from frontmatter or fallback to slug (filename).
 */
function titleFromFile(filePath: string, slug: string): string {
  try {
    const content = readFileSync(filePath, "utf-8");
    const { data } = matter(content);
    const title = data?.title ?? data?.sidebar_title;
    if (typeof title === "string") return title;
  } catch {
    // ignore
  }
  return slug
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

interface ScannedFile {
  relativePath: string;
  fullPath: string;
  slug: string;
}

/**
 * Recursively collect all .md/.mdx files under dir, with relative path from docsDir.
 */
function collectMdFiles(
  docsDir: string,
  currentDir: string,
  relativePrefix: string
): ScannedFile[] {
  const result: ScannedFile[] = [];
  const entries = readdirSync(currentDir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(currentDir, e.name);
    const rel = relativePrefix ? `${relativePrefix}/${e.name}` : e.name;
    if (e.isDirectory() && !e.name.startsWith(".")) {
      result.push(
        ...collectMdFiles(docsDir, full, rel)
      );
    } else if (e.isFile() && (e.name.endsWith(".md") || e.name.endsWith(".mdx"))) {
      result.push({
        relativePath: rel,
        fullPath: full,
        slug: e.name.replace(/\.(md|mdx)$/, ""),
      });
    }
  }
  return result;
}

/**
 * Builds VitePress sidebar config from a generated GraphQL docs directory.
 * Supports nested dirs (e.g. 01-operations/07-queries/, 02-types/06-objects/).
 *
 * @param docsDir - Absolute or relative path to the generated docs folder (e.g. "./docs/graphql" or "./graphql").
 * @param baseURL - Base path for links (e.g. "graphql"). Defaults to the last segment of docsDir.
 * @returns Sidebar config for themeConfig.sidebar["/baseURL/"].
 */
export async function createSidebar(
  docsDir: string,
  baseURL?: string
): Promise<SidebarConfig> {
  const base = baseURL ?? docsDir.replace(/\/$/, "").split("/").pop() ?? "graphql";
  const basePath = base.startsWith("/") ? base : `/${base}`;

  let files: ScannedFile[];
  try {
    files = collectMdFiles(docsDir, docsDir, "");
  } catch {
    return [];
  }

  // Group by first path segment (01-operations, 02-types), then by second (07-queries, 06-objects).
  const byTop = new Map<string, Map<string, ScannedFile[]>>();
  for (const f of files) {
    const parts = f.relativePath.split("/");
    const top = parts[0];
    const sub = parts.length > 2 ? parts[1] : "";
    const key = sub || top;
    if (!byTop.has(top)) byTop.set(top, new Map());
    const subMap = byTop.get(top)!;
    if (!subMap.has(key)) subMap.set(key, []);
    subMap.get(key)!.push(f);
  }

  const sidebar: SidebarConfig = [];
  const sortedTops = [...byTop.keys()].sort();

  for (const top of sortedTops) {
    const subMap = byTop.get(top)!;
    const subKeys = [...subMap.keys()].sort();

    if (subKeys.length === 1 && subKeys[0] === top) {
      // Single level: top dir has files directly (e.g. generated.md at root)
      const list = subMap.get(top)!;
      const items: (SidebarLink | SidebarItem)[] = list.map((f) => {
        const link = `${basePath}/${f.relativePath.replace(/\.(md|mdx)$/, "")}`;
        const text = titleFromFile(f.fullPath, f.slug);
        return { text, link };
      });
      sidebar.push({ text: categoryLabel(top), collapsed: false, items });
    } else {
      // Nested: e.g. 01-operations -> 07-queries -> [files]
      const sections: SidebarItem[] = [];
      for (const sub of subKeys) {
        const list = subMap.get(sub)!;
        const items: (SidebarLink | SidebarItem)[] = list.map((f) => {
          const link = `${basePath}/${f.relativePath.replace(/\.(md|mdx)$/, "")}`;
          const text = titleFromFile(f.fullPath, f.slug);
          return { text, link };
        });
        sections.push({ text: categoryLabel(sub), collapsed: false, items });
      }
      sidebar.push({
        text: categoryLabel(top),
        collapsed: false,
        items: sections,
      });
    }
  }

  return sidebar;
}
