import DefaultTheme from "vitepress/theme";
import { onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vitepress";
import { graphqlThemeSetup } from "graphql-markdown-vitepress/theme";
import "graphql-markdown-vitepress/style.css";

const SCOPE_CLASS = "gql-page";

export default {
  extends: DefaultTheme,
  setup() {
    graphqlThemeSetup();

    const route = useRoute();
    const apply = () => {
      document.documentElement.classList.toggle(
        SCOPE_CLASS,
        route.path.startsWith("/graphql/"),
      );
    };
    onMounted(apply);
    onUnmounted(() => {
      document.documentElement.classList.remove(SCOPE_CLASS);
    });
    watch(() => route.path, apply);
  },
};
