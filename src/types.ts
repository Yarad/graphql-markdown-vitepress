import type { ConfigOptions } from "@graphql-markdown/types";

/**
 * Options for generating GraphQL docs with VitePress.
 * Extends GraphQL-Markdown config with VitePress-specific options.
 */
export type GraphQLDocsOptions = Omit<ConfigOptions, "schema"> & {
  /**
   * Path to GraphQL schema (file path or URL).
   * For JSON introspection result, use with loaders.JsonFileLoader.
   */
  schema: string;
  /**
   * Root folder for generated documentation (parent of baseURL segment).
   * @default "./docs"
   */
  rootPath?: string;
  /**
   * Base URL segment; docs are generated under rootPath/baseURL.
   * @default "graphql"
   */
  baseURL?: string;
  /**
   * Base path for internal links (e.g. "/graphql" for VitePress base).
   * Used by formatter for type links.
   */
  linkRoot?: string;
  /**
   * Custom MDX/formatter module path. Defaults to graphql-markdown-vitepress/formatter.
   */
  mdxParser?: string;
  /**
   * Schema loaders (e.g. JsonFileLoader for schema.json introspection).
   */
  loaders?: Record<string, string | { module: string; options?: Record<string, unknown> }>;
};

/**
 * VitePress sidebar item (link only).
 */
export interface SidebarLink {
  text: string;
  link: string;
}

/**
 * VitePress sidebar item (group with optional items).
 */
export interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  items: (SidebarLink | SidebarItem)[];
}

/**
 * Sidebar config for a path prefix (VitePress themeConfig.sidebar format).
 */
export type SidebarConfig = SidebarItem[];
