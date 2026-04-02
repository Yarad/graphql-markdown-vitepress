import { resolve, join, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { runGraphQLMarkdown } from "@graphql-markdown/cli";
import type { GraphQLDocsOptions, LandingPageOptions, TransformOptions } from "./types.js";
import { transformGeneratedDocs } from "./transform/index.js";

const DEFAULT_LOGGER = "@graphql-markdown/logger";

// Resolve the formatter's absolute path so the CLI can always find it.
// CJS has __dirname; ESM has import.meta.url. tsup sets import.meta = {} in CJS.
// @ts-ignore __dirname exists in CJS but not in TS ESM source
const _moduleDir: string = typeof __dirname === "string" ? __dirname : dirname(fileURLToPath(import.meta.url));
const DEFAULT_MDX_PARSER = join(_moduleDir, "formatter", "index.cjs");

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
  if (schema.endsWith(".graphql") || schema.endsWith(".gql")) {
    loaders.GraphQLFileLoader = "@graphql-tools/graphql-file-loader";
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

  if (merged.landingPage) {
    applyLandingPageOverrides(outputDir, merged.landingPage);
  }

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

const CLI_LANDING_PAGE_FILENAME = "generated.md";
const DEFAULT_LANDING_PAGE_FILENAME = "index.md";

/**
 * Applies user overrides to the CLI-generated landing page.
 * Runs before the transform pipeline so transforms can still process the file.
 *
 * The CLI always emits `generated.md`; this function renames it to the
 * configured filename (default `index.md`) and cleans up stale files.
 */
function applyLandingPageOverrides(
  outputDir: string,
  options: LandingPageOptions,
): void {
  const sourcePath = join(outputDir, CLI_LANDING_PAGE_FILENAME);
  if (!existsSync(sourcePath)) return;

  const targetFilename = options.filename ?? DEFAULT_LANDING_PAGE_FILENAME;
  const targetPath = join(outputDir, targetFilename);

  if (targetPath !== sourcePath && existsSync(targetPath)) {
    unlinkSync(targetPath);
  }

  const raw = readFileSync(sourcePath, "utf-8");
  const { data, content: body } = matter(raw);

  if (options.label) {
    data.sidebar_title = options.label;
  }
  if (options.hidden) {
    data.sidebar_hidden = true;
  }
  if (options.frontMatter) {
    Object.assign(data, options.frontMatter);
  }

  const newBody = options.content != null ? `\n${options.content}\n` : body;
  writeFileSync(targetPath, matter.stringify(newBody, data), "utf-8");

  if (targetPath !== sourcePath) {
    unlinkSync(sourcePath);
  }
}
