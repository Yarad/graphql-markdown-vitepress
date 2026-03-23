import type { ConfigOptions } from "@graphql-markdown/types";

/**
 * CSS class names used in rendered HTML output.
 * Pass individual overrides or use a string prefix via {@link TransformOptions.css}.
 */
export interface CssClassMap {
  /** @default "gql-field" */
  field?: string;
  /** @default "gql-desc" */
  desc?: string;
  /** @default "gql-section-label" */
  sectionLabel?: string;
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
  /**
   * Link prefix used by `@graphql-markdown/cli` when generating `<a href>` attributes.
   * Must match the `linkRoot` passed to `generateDocs` so the inline expansion regex
   * and field index keys align with actual hrefs in the generated HTML.
   * @default "/"
   */
  linkRoot?: string;
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
  /**
   * Show the parent type name as a prefix on field entities
   * (e.g. `GamePagination.data` instead of `data`).
   * @default false
   */
  parentTypePrefix?: boolean;
  /**
   * Absolute path to the directory where `_gql-fields-index.json` is written.
   * Defaults to `<docsDir>/../public` (VitePress's default `public/` folder).
   * Set this when your `baseURL` is nested deeply and the auto-derived path
   * doesn't match VitePress's `public/` directory.
   */
  fieldsIndexOutputDir?: string;
}

/**
 * Context passed to the `onGenerated` callback with all resolved paths.
 */
export interface GeneratedContext {
  /** Absolute path to the generated docs directory (`rootPath/baseURL`). */
  outputDir: string;
  /** Resolved `rootPath` (VitePress docs root). */
  rootPath: string;
  /** The `baseURL` segment used for generation. */
  baseURL: string;
  /** Absolute path to the directory where `_gql-fields-index.json` was written (if applicable). */
  publicDir: string;
  /** Absolute path to `_gql-fields-index.json`, or `null` if lazy loading is disabled. */
  fieldsIndexPath: string | null;
}

/**
 * Customization for the auto-generated landing page (`generated.md`).
 *
 * `@graphql-markdown/cli` emits a `generated.md` file at the docs root that
 * serves as the schema overview / landing page. These options let you replace
 * its content, tweak its frontmatter, change the sidebar label, or hide it
 * from the sidebar entirely.
 *
 * @example
 * ```ts
 * await generateDocs({
 *   schema: "./schema.graphql",
 *   landingPage: {
 *     label: "API Reference",
 *     content: "# My API\n\nWelcome to the docs.",
 *     frontMatter: { description: "GraphQL API reference" },
 *   },
 * });
 * ```
 */
export interface LandingPageOptions {
  /**
   * Sidebar group label displayed in the VitePress sidebar.
   * Written as `sidebar_title` in the file's frontmatter so
   * {@link createSidebar} picks it up automatically.
   * @default derived from filename ("Generated")
   */
  label?: string;
  /**
   * Replace the markdown body of the landing page.
   * When set, the entire body below the frontmatter fence is replaced.
   */
  content?: string;
  /**
   * Extra frontmatter fields merged into the existing frontmatter.
   * Use this to set `title`, `description`, `layout`, or any custom keys.
   */
  frontMatter?: Record<string, unknown>;
  /**
   * Hide the landing page from the sidebar.
   * The file is still generated (so `/graphql/generated` resolves),
   * but `createSidebar` will skip it.
   * @default false
   */
  hidden?: boolean;
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
   * VitePress `base` path (e.g. `"/docs/"`). When set, this coordinates
   * several behaviors:
   * - `linkRoot` defaults to this value (so generated `<a href>` attributes
   *   include the VitePress base prefix).
   * - The fields index is written to `rootPath/public/` (not `docsDir/../public`).
   * - The lazy loader resolves the index URL relative to this base.
   *
   * This single option eliminates all workarounds needed for non-root deployments.
   * @default "/"
   */
  base?: string;
  /**
   * Prefix for internal links generated by `@graphql-markdown/cli`.
   * Defaults to {@link base} when set, otherwise `"/"`.
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
   * Customize the auto-generated landing page (`generated.md`).
   * @see {@link LandingPageOptions}
   */
  landingPage?: LandingPageOptions;
  /**
   * Called after docs are generated and transforms are applied.
   * Receives the output directory path and a context object with all resolved paths.
   */
  onGenerated?: (
    outputDir: string,
    context: GeneratedContext,
  ) => void | Promise<void>;
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

/**
 * Category ordering: an explicit name list or a custom comparator.
 *
 * - **Array** — category directory names in desired order.
 *   Unlisted categories are appended alphabetically.
 * - **Function** — `(a, b) => number` comparator (same contract as `Array.sort`).
 *   Receives lowercase directory names stripped of numeric prefixes.
 */
export type CategoryOrder = string[] | ((a: string, b: string) => number);

/**
 * Options for controlling sidebar category ordering in {@link createSidebar}.
 */
export interface SidebarOptions {
  /**
   * Top-level category order.
   * Pass an array of lowercase directory names, or a comparator function.
   *
   * @example
   * ```ts
   * order: ["types", "operations"]
   * order: (a, b) => a.localeCompare(b)
   * ```
   */
  order?: CategoryOrder;
  /**
   * Per-category subcategory ordering.
   * Keys are lowercase directory names of the parent category.
   * Values are arrays of subcategory names or comparator functions.
   *
   * @example
   * ```ts
   * {
   *   operations: ["queries", "directives"],
   *   types: (a, b) => a.localeCompare(b),
   * }
   * ```
   */
  subOrder?: Record<string, CategoryOrder>;
}
