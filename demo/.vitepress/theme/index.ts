import DefaultTheme from "vitepress/theme";
import { graphqlThemeSetup } from "graphql-markdown-vitepress/theme";
import "graphql-markdown-vitepress/style.css";

export default {
  extends: DefaultTheme,
  setup() {
    graphqlThemeSetup({ linkPrefix: "/graphql/" });
  },
};
