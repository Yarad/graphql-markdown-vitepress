import DefaultTheme from "vitepress/theme";
import { onMounted, onUnmounted, onUpdated, nextTick, watch } from "vue";
import { useRoute, useData, useRouter, withBase } from "vitepress";
import { initGqlLazyFields, setFieldsIndexBase } from "./lazy-fields.js";
import { stripBase } from "./path.js";

export interface GraphqlThemeOptions {
  /**
   * Site base path used to resolve the fields-index JSON URL.
   * Auto-detected from VitePress `site.base` when omitted.
   * Only needed if auto-detection fails or you serve the index elsewhere.
   */
  base?: string;
  /**
   * Path prefix that identifies plugin-rendered routes. Used for two things:
   *
   * 1. The `scopeClass` is toggled on `<html>` whenever `route.path` starts
   *    with this prefix.
   * 2. When the site `base !== "/"`, clicks on `<a>` elements whose `href`
   *    starts with this prefix are rewritten through VitePress's SPA router
   *    with the correct `base`. Useful when `linkRoot` differs from the
   *    VitePress base (e.g. `linkRoot: "/"` with `base: "/docs/"`).
   *
   * When omitted, the scope class is applied site-wide.
   *
   * @example
   * graphqlThemeSetup({ linkPrefix: "/api/graphql/" });
   */
  linkPrefix?: string;
  /**
   * CSS class toggled on `<html>` for plugin-rendered routes. Must match the
   * class used in the shipped stylesheet — `"gql-page"` by default, or the
   * `scopeClass` configured in the `graphqlScopedCss` Vite plugin.
   *
   * @default "gql-page"
   */
  scopeClass?: string;
}

const DEFAULT_SCOPE_CLASS = "gql-page";

/**
 * VitePress theme with GraphQL docs support.
 * Extends the default theme with lazy field loading and GraphQL-specific styles.
 *
 * The shipped stylesheet is scoped under the `.gql-page` class. This setup
 * function toggles the class on `<html>` automatically — for routes whose path
 * starts with `linkPrefix`, or site-wide when `linkPrefix` is omitted. Pass
 * `scopeClass` to pair with the `graphqlScopedCss` Vite plugin.
 *
 * Usage:
 * ```ts
 * export { default } from "graphql-markdown-vitepress/theme";
 * ```
 *
 * Usage (scoped to a path prefix):
 * ```ts
 * import { graphqlThemeSetup } from "graphql-markdown-vitepress/theme";
 * export default {
 *   extends: DefaultTheme,
 *   setup() {
 *     graphqlThemeSetup({ linkPrefix: "/graphql/" });
 *   },
 * };
 * ```
 */

export function graphqlThemeSetup(options?: GraphqlThemeOptions): void {
  const route = useRoute();
  const { site } = useData();
  const router = useRouter();

  const base = options?.base ?? site.value.base;
  setFieldsIndexBase(base);

  const scopeClass = options?.scopeClass ?? DEFAULT_SCOPE_CLASS;
  const linkPrefix = options?.linkPrefix;
  const matchScope = linkPrefix
    ? (path: string) => stripBase(path, base).startsWith(linkPrefix)
    : () => true;

  const applyScope = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle(
      scopeClass,
      matchScope(route.path),
    );
  };

  let clickHandler: ((e: MouseEvent) => void) | null = null;

  if (linkPrefix && base !== "/") {
    clickHandler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href?.startsWith(linkPrefix)) return;

      if (link.closest("summary")) {
        // Rewrite the href so VitePress's built-in router (or a full-page
        // load) lands on the correct base-prefixed URL. Don't call
        // preventDefault — let <details> toggle and VitePress handle the
        // navigation naturally.
        link.setAttribute("href", withBase(href));
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      router.go(withBase(href));
    };
  }

  onMounted(() => {
    applyScope();
    nextTick(() => initGqlLazyFields());
    if (clickHandler) {
      document.addEventListener("click", clickHandler, true);
    }
  });
  onUnmounted(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove(scopeClass);
    }
    if (clickHandler) {
      document.removeEventListener("click", clickHandler, true);
    }
  });
  onUpdated(() => {
    nextTick(() => initGqlLazyFields());
  });
  watch(
    () => route.path,
    () => {
      applyScope();
      nextTick(() => initGqlLazyFields());
    },
  );
}

export default {
  extends: DefaultTheme,
  setup() {
    graphqlThemeSetup();
  },
};
