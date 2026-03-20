import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { runGraphQLMarkdown } from "@graphql-markdown/cli";
import type { GraphQLDocsOptions, TransformOptions } from "./types.js";
import { transformGeneratedDocs } from "./transform/index.js";

const DEFAULT_LOGGER = "@graphql-markdown/logger";
const DEFAULT_MDX_PARSER = "graphql-markdown-vitepress/formatter";

const generationCache = new Map<string, Promise<void>>();

function cacheKey(options: GraphQLDocsOptions): string {
  return `${options.schema}::${options.rootPath ?? "./docs"}::${options.baseURL ?? "graphql"}`;
}

/**
 * Default options for VitePress doc generation.
 */
const defaultOptions: Partial<GraphQLDocsOptions> = {
  rootPath: "./docs",
  baseURL: "graphql",
  linkRoot: "/",
  mdxParser: DEFAULT_MDX_PARSER,
  pretty: true,
  printTypeOptions: {
    parentTypePrefix: false,
  },
  docOptions: {
    index: true,
    categorySort: "natural",
    sectionHeaderId: true,
    frontMatter: {},
  },
};

/**
 * Ensures loaders include JSON support when schema path ends with .json.
 */
function ensureLoaders(
  schema: string,
  existing?: GraphQLDocsOptions["loaders"],
): GraphQLDocsOptions["loaders"] {
  const loaders = { ...existing };
  if (schema.endsWith(".json")) {
    loaders.JsonFileLoader = "@graphql-tools/json-file-loader";
  }
  return Object.keys(loaders).length > 0 ? loaders : undefined;
}

/**
 * Generates GraphQL schema documentation as Markdown suitable for VitePress.
 * Uses @graphql-markdown/cli with the VitePress formatter.
 *
 * @param options - Generation options (schema path, output paths, transforms, etc.)
 */
export async function generateDocs(options: GraphQLDocsOptions): Promise<void> {
  const key = cacheKey(options);
  const cached = generationCache.get(key);
  if (cached) return cached;

  const promise = doGenerate(options);
  generationCache.set(key, promise);

  try {
    await promise;
  } catch (err) {
    generationCache.delete(key);
    throw err;
  }
}

async function doGenerate(options: GraphQLDocsOptions): Promise<void> {
  const schema = options.schema;
  const loaders = ensureLoaders(schema, options.loaders);

  const resolvedLinkRoot =
    options.linkRoot ?? options.base ?? defaultOptions.linkRoot;

  const merged: GraphQLDocsOptions = {
    ...options,
    rootPath: options.rootPath ?? defaultOptions.rootPath,
    baseURL: options.baseURL ?? defaultOptions.baseURL,
    linkRoot: resolvedLinkRoot,
    mdxParser: options.mdxParser ?? defaultOptions.mdxParser,
    pretty: options.pretty ?? defaultOptions.pretty,
    printTypeOptions: options.printTypeOptions ?? defaultOptions.printTypeOptions,
    docOptions: options.docOptions ?? defaultOptions.docOptions,
    loaders: loaders ?? options.loaders,
  };

  await runGraphQLMarkdown(merged, {}, DEFAULT_LOGGER);

  const rootPath = resolve(merged.rootPath ?? "./docs");
  const baseURL = merged.baseURL ?? "graphql";
  const outputDir = resolve(rootPath, baseURL);
  const publicDir = resolve(rootPath, "public");

  if (merged.transforms !== false) {
    const transformOpts: TransformOptions = {
      baseURL,
      linkRoot: resolvedLinkRoot,
      fieldsIndexOutputDir: publicDir,
      ...(typeof merged.transforms === "object" ? merged.transforms : {}),
    };
    await transformGeneratedDocs(outputDir, transformOpts);
  }

  if (merged.onGenerated) {
    const fieldsIndexPath = join(publicDir, "_gql-fields-index.json");
    await merged.onGenerated(outputDir, {
      outputDir,
      rootPath,
      baseURL,
      publicDir,
      fieldsIndexPath: existsSync(fieldsIndexPath)
        ? fieldsIndexPath
        : null,
    });
  }
}
