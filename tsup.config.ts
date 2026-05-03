import { defineConfig } from "tsup";

// `import.meta.url` access in src/generate.ts is guarded behind a runtime
// `typeof __dirname` check, so the access only fires in the ESM bundle.
// esbuild still emits an advisory warning when it sees the token in the
// CJS source — silence it; the runtime path is correct.
const silenceImportMetaWarning = (options: {
  logOverride?: Record<string, string>;
}) => {
  options.logOverride = {
    ...options.logOverride,
    "empty-import-meta": "silent",
  };
};

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      "formatter/index": "src/formatter/index.ts",
      "vite-plugin": "src/vite-plugin.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ["vite", "vitepress", "vue", "graphql"],
    esbuildOptions: silenceImportMetaWarning,
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
    esbuildOptions: silenceImportMetaWarning,
  },
]);
