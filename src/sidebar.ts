import { readFileSync } from "node:fs";
import matter from "gray-matter";
import type {
  CategoryOrder,
  SidebarConfig,
  SidebarItem,
  SidebarLink,
  SidebarOptions,
} from "./types.js";
import { scanMdFiles, type ScannedFile } from "./fs.js";

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
    const title = data?.sidebar_title ?? data?.title;
    if (typeof title === "string") return title;
  } catch {
    // ignore
  }
  return slug
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Sorts items using a {@link CategoryOrder}: an explicit name list,
 * a comparator function, or undefined (alphabetical fallback).
 *
 * - **Array** — listed items come first in given sequence; unlisted items
 *   are appended alphabetically. Matching is case-insensitive.
 * - **Function** — items are sorted with the comparator applied to
 *   their normalized (lowercase, prefix-stripped) names.
 * - **undefined** — plain alphabetical sort.
 */
function applyCategoryOrder(items: string[], order?: CategoryOrder): string[] {
  if (!order) {
    return [...items].sort();
  }

  if (typeof order === "function") {
    return [...items].sort((a, b) => order(dirToKey(a), dirToKey(b)));
  }

  if (order.length === 0) {
    return [...items].sort();
  }

  const orderLower = order.map((o) => o.toLowerCase());

  const ordered: string[] = [];
  for (const name of orderLower) {
    const match = items.find((i) => i.toLowerCase() === name);
    if (match) ordered.push(match);
  }

  const remaining = items
    .filter((i) => !orderLower.includes(i.toLowerCase()))
    .sort();

  return [...ordered, ...remaining];
}

/**
 * Normalizes a directory name to its lowercase label form
 * (strips numeric prefix, replaces separators with spaces, lowercases).
 */
function dirToKey(dirName: string): string {
  return dirName.replace(/^\d+-/, "").toLowerCase();
}

/**
 * Builds VitePress sidebar config from a generated GraphQL docs directory.
 * Supports nested dirs (e.g. 01-operations/07-queries/, 02-types/06-objects/).
 *
 * @param docsDir - Absolute or relative path to the generated docs folder (e.g. "./docs/graphql" or "./graphql").
 * @param baseURL - Base path for links (e.g. "graphql"). Defaults to the last segment of docsDir.
 * @param options - Ordering options. Use `order` for top-level categories and `subOrder` for subcategories.
 * @returns Sidebar config for themeConfig.sidebar["/baseURL/"].
 */
export function createSidebar(
  docsDir: string,
  baseURL?: string,
  options?: SidebarOptions,
): SidebarConfig {
  const base =
    baseURL ?? docsDir.replace(/\/$/, "").split("/").pop() ?? "graphql";
  const basePath = base.startsWith("/") ? base : `/${base}`;

  let files: ScannedFile[];
  try {
    files = scanMdFiles(docsDir);
  } catch (err) {
    console.warn(
      `[graphql-markdown] Could not read docs directory "${docsDir}":`,
      err instanceof Error ? err.message : err,
    );
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
  const sortedTops = applyCategoryOrder([...byTop.keys()], options?.order);

  for (const top of sortedTops) {
    const subMap = byTop.get(top)!;
    const topKey = dirToKey(top);
    const subKeys = applyCategoryOrder(
      [...subMap.keys()],
      options?.subOrder?.[topKey],
    );

    if (subKeys.length === 1 && subKeys[0] === top) {
      // Single level: top dir has files directly (e.g. generated.md at root)
      const list = subMap.get(top)!;
      const items: (SidebarLink | SidebarItem)[] = list.map((f) => {
        const link = `${basePath}/${f.relativePath.replace(/\.md$/, "")}`;
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
          const link = `${basePath}/${f.relativePath.replace(/\.md$/, "")}`;
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
