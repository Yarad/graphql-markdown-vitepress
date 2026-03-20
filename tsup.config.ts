import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "formatter/index": "src/formatter/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ["vitepress", "vue", "graphql"],
  },
  {
    entry: {
      "client/theme": "src/client/theme.ts",
      "client/lazy-fields": "src/client/lazy-fields.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    external: ["vitepress", "vitepress/theme", "vue"],
  },
]);
