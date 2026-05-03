import type { Plugin } from "vite";

export interface GraphqlScopedCssOptions {
  /**
   * Class name to use as the CSS scope. Must match the runtime
   * `scopeClass` passed to `graphqlThemeSetup`. The shipped stylesheet
   * is authored against `gql-page`; setting any other value rewrites
   * every occurrence at build time.
   *
   * @default "gql-page"
   */
  scopeClass?: string;
}

const DEFAULT_SCOPE_CLASS = "gql-page";

const PACKAGE_STYLE_RE =
  /[/\\]graphql-markdown-vitepress[/\\](?:src|dist)[/\\]client[/\\]style\.css$/;

/**
 * Vite plugin that rewrites the `gql-page` scope class in the shipped
 * `graphql-markdown-vitepress/style.css` to a custom class name. Pair with
 * `graphqlThemeSetup({ scopeClass })` so the runtime toggle and the CSS
 * selector stay in sync.
 *
 * Add to `vite.plugins` in `.vitepress/config.ts`. When `scopeClass` is the
 * default (`"gql-page"`) the plugin is a no-op.
 *
 * @example
 * ```ts
 * import { graphqlScopedCss } from "graphql-markdown-vitepress/vite";
 *
 * export default defineConfig({
 *   vite: {
 *     plugins: [graphqlScopedCss({ scopeClass: "my-gql-scope" })],
 *   },
 * });
 * ```
 */
export function graphqlScopedCss(
  options: GraphqlScopedCssOptions = {},
): Plugin {
  const target = options.scopeClass ?? DEFAULT_SCOPE_CLASS;
  const isDefault = target === DEFAULT_SCOPE_CLASS;

  return {
    name: "graphql-markdown-vitepress:scoped-css",
    enforce: "pre",
    transform(code, id) {
      if (isDefault) return null;
      const path = id.split("?")[0] ?? "";
      if (!PACKAGE_STYLE_RE.test(path)) return null;
      return {
        code: code.replace(/\bgql-page\b/g, target),
        map: null,
      };
    },
  };
}
