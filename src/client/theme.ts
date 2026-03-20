import DefaultTheme from "vitepress/theme";
import { onMounted, nextTick, watch } from "vue";
import { useRoute } from "vitepress";
import { initGqlLazyFields } from "./lazy-fields.js";

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

export function graphqlThemeSetup(): void {
  const route = useRoute();
  onMounted(() => {
    initGqlLazyFields();
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
