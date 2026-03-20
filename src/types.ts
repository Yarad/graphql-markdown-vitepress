import type { ConfigOptions } from "@graphql-markdown/types";

/**
 * CSS class names used in rendered HTML output.
 * Pass individual overrides or use a string prefix via {@link TransformOptions.css}.
 */
export interface CssClassMap {
  /** @default "gql-field" */
  field?: string;
  /** @default "gql-arg" */
  arg?: string;
  /** @default "gql-desc" */
  desc?: string;
  /** @default "gql-field-args" */
  fieldArgs?: string;
  /** @default "gql-args-label" */
  argsLabel?: string;
  /** @default "gql-inline-field" */
  inlineField?: string;
  /** @default "gql-inline-fields" */
  inlineFields?: string;
  /** @default "gql-response-type" */
  responseType?: string;
}

/**
 * Labels rendered inside the HTML output.
 */
export interface TransformLabels {
  /** Label for nested argument blocks. @default "Arguments" */
  arguments?: string;
  /** Label for inlined field containers. @default "Fields" */
  fields?: string;
}

/**
 * Controls the post-generation transform pipeline that converts flat
 * GraphQL-Markdown output into collapsible, nested documentation.
 */
export interface TransformOptions {
  /**
   * Base URL segment used for matching type references in generated links.
   * Must match the `baseURL` used during generation.
   * @default "graphql"
   */
  baseURL?: string;
  /** Enable the collapsible `<details>` pass. @default true */
  collapsible?: boolean;
  /** Enable the inline type expansion pass. @default true */
  inline?: boolean;
  /** Additional transform functions applied after built-in passes. */
  custom?: ((content: string) => string)[];
  /**
   * Maximum nesting depth for recursive inline expansion.
   * `1` reproduces the legacy single-level behavior.
   * Set to `0` to disable inline expansion entirely.
   * @default 3
   */
  inlineDepth?: number;
  /**
   * When true, only the first level of inline fields is pre-rendered
   * at build time; deeper levels are loaded on demand in the browser
   * via a JSON fields index. Dramatically reduces content duplication.
   * @default true
   */
  lazyInline?: boolean;
  /**
   * Type category folder suffixes eligible for inline expansion.
   * Matched as `\d+-{category}` against the URL path.
   * @default ["objects", "inputs"]
   */
  inlineTypeCategories?: string[];
  /**
   * Map of exact heading lines to their replacements (applied during collapsible pass).
   * @default { "### Type": "### Response" }
   */
  sectionRenames?: Record<string, string>;
  /**
   * H3 section titles (case-insensitive) that become collapsible `<details>` blocks.
   * @default ["fields", "arguments", "values", "input fields"]
   */
  collapsibleSections?: string[];
  /**
   * H3 section titles (case-insensitive) treated as response sections for inline expansion.
   * @default ["response", "type"]
   */
  responseSections?: string[];
  /**
   * H3 section titles (case-insensitive) used to extract field definitions
   * for the type fields index. Typically a subset of `collapsibleSections`.
   * @default ["fields", "values", "input fields"]
   */
  fieldSections?: string[];
  /** Labels used in rendered HTML. */
  labels?: TransformLabels;
  /**
   * CSS class names for rendered HTML.
   * Pass a string to set a prefix (e.g. `"api"` → `"api-field"`, `"api-arg"`, …),
   * or an object to override individual classes.
   * @default "gql"
   */
  css?: string | CssClassMap;
  /**
   * Enable the SEO enhancement pass that adds per-page `description` and
   * a category-qualified `title` to frontmatter, plus an H1 heading.
   * @default true
   */
  seo?: boolean;
  /**
   * Strip numeric ordering prefixes from directory names
   * (e.g. `01-operations` → `operations`) and rewrite all internal links.
   * @default true
   */
  cleanUrls?: boolean;
  /**
   * Inject JSON-LD `TechArticle` structured data into each page's
   * frontmatter `head`. Only effective when `seo` is also enabled.
   * @default true
   */
  structuredData?: boolean;
}

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
  loaders?: Record<
    string,
    string | { module: string; options?: Record<string, unknown> }
  >;
  /**
   * Transform pipeline configuration.
   * Pass `false` to skip all post-generation transforms.
   * Pass an object to configure individual passes.
   */
  transforms?: TransformOptions | false;
  /**
   * Called after docs are generated and transforms are applied.
   * Receives the absolute output directory path.
   */
  onGenerated?: (outputDir: string) => void | Promise<void>;
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
