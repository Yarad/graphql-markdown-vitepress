import type { Plugin, ResolvedConfig } from "vite";
import { generateDocs } from "./generate.js";
import type { GraphQLDocsOptions } from "./types.js";

const PLUGIN_NAME = "graphql-markdown-vitepress";

/**
 * Vite plugin that generates GraphQL schema documentation before build and dev.
 * Run generation in buildStart so generated .md files are available for VitePress.
 *
 * Automatically reads the VitePress `base` from the resolved Vite config
 * so that generated `<a href>` attributes include the correct prefix on
 * non-root deployments — no extra configuration required.
 *
 * @param options - Same options as generateDocs (schema path, output paths, etc.)
 */
export function graphqlDocsPlugin(options: GraphQLDocsOptions): Plugin {
  let ran = false;
  let vitepressBase: string | undefined;

  const runGeneration = async () => {
    if (ran) return;
    ran = true;
    const merged =
      vitepressBase && !options.base
        ? { ...options, base: vitepressBase }
        : options;
    await generateDocs(merged);
  };

  return {
    name: PLUGIN_NAME,
    enforce: "pre",
    configResolved(config: ResolvedConfig) {
      if (config.base && config.base !== "/") {
        vitepressBase = config.base;
      }
    },
    async buildStart() {
      try {
        await runGeneration();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(
          `[${PLUGIN_NAME}] Documentation generation failed during build: ${msg}`,
          { cause: err },
        );
      }
    },
    configureServer() {
      runGeneration().catch((err) => {
        console.error(`[${PLUGIN_NAME}] Generation failed:`, err);
      });
    },
  };
}
