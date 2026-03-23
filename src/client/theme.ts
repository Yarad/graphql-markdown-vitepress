import DefaultTheme from "vitepress/theme";
import { onMounted, onUnmounted, onUpdated, nextTick, watch } from "vue";
import { useRoute, useData, useRouter, withBase } from "vitepress";
import { initGqlLazyFields, setFieldsIndexBase } from "./lazy-fields.js";

export interface GraphqlThemeOptions {
  /**
   * Site base path used to resolve the fields-index JSON URL.
   * Auto-detected from VitePress `site.base` when omitted.
   * Only needed if auto-detection fails or you serve the index elsewhere.
   */
  base?: string;
  /**
   * When set, intercepts clicks on `<a>` elements whose `href` starts with
   * this prefix and rewrites them through VitePress's SPA router with the
   * correct `base`. Useful when `linkRoot` differs from the VitePress base
   * (e.g. `linkRoot: "/"` with `base: "/docs/"`).
   *
   * @example
   * graphqlThemeSetup({ linkPrefix: "/api/graphql/" });
   */
  linkPrefix?: string;
}

/**
 * VitePress theme with GraphQL docs support.
 * Extends the default theme with lazy field loading and GraphQL-specific styles.
 *
 * Usage (one-liner):
 * ```ts
 * export { default } from "graphql-markdown-vitepress/theme";
 * ```
 *
 * Usage (with customization):
 * ```ts
 * import { graphqlThemeSetup } from "graphql-markdown-vitepress/theme";
 * export default {
 *   extends: DefaultTheme,
 *   setup() {
 *     graphqlThemeSetup();
 *     // your own setup logic
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

  let clickHandler: ((e: MouseEvent) => void) | null = null;

  if (options?.linkPrefix && base !== "/") {
    const prefix = options.linkPrefix;
    clickHandler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.("a");
      if (!link) return;
      if (link.closest("summary")) return;
      const href = link.getAttribute("href");
      if (href?.startsWith(prefix)) {
        e.preventDefault();
        e.stopPropagation();
        router.go(withBase(href));
      }
    };
  }

  onMounted(() => {
    nextTick(() => initGqlLazyFields());
    if (clickHandler) {
      document.addEventListener("click", clickHandler, true);
    }
  });
  onUnmounted(() => {
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
