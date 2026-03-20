import type { Plugin } from "vite";
import { generateDocs } from "./generate.js";
import type { GraphQLDocsOptions } from "./types.js";

const PLUGIN_NAME = "graphql-markdown-vitepress";

/**
 * Vite plugin that generates GraphQL schema documentation before build and dev.
 * Run generation in buildStart so generated .md files are available for VitePress.
 *
 * @param options - Same options as generateDocs (schema path, output paths, etc.)
 */
export function graphqlDocsPlugin(options: GraphQLDocsOptions): Plugin {
  let ran = false;

  const runGeneration = async () => {
    if (ran) return;
    ran = true;
    await generateDocs(options);
  };

  return {
    name: PLUGIN_NAME,
    enforce: "pre",
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
