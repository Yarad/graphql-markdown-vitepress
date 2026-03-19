# graphql-markdown-vitepress

VitePress integration for **GraphQL schema documentation** using [GraphQL-Markdown](https://graphql-markdown.dev). Generate Markdown docs from any GraphQL schema (`.graphql`, `.json` introspection, or URL) and plug them into your VitePress site with automatic sidebar generation.

## Installation

```bash
npm install graphql-markdown-vitepress graphql vitepress
```

## Quick start

1. **Generate docs and configure VitePress** in `.vitepress/config.ts`:

```ts
import { defineConfig } from "vitepress";
import {
  generateDocs,
  createSidebar,
  graphqlDocsPlugin,
} from "graphql-markdown-vitepress";
import { resolve } from "node:path";

export default async () => {
  const schemaPath = resolve(__dirname, "../schema.json");
  const rootPath = resolve(__dirname, "..");
  const graphqlDir = resolve(rootPath, "graphql");

  await generateDocs({
    schema: schemaPath,
    rootPath,
    baseURL: "graphql",
    linkRoot: "/",
  });

  const sidebar = await createSidebar(graphqlDir, "graphql");

  return defineConfig({
    title: "GraphQL API Docs",
    themeConfig: {
      sidebar: { "/graphql/": sidebar },
    },
    vite: {
      plugins: [
        graphqlDocsPlugin({
          schema: schemaPath,
          rootPath,
          baseURL: "graphql",
          linkRoot: "/",
        }),
      ],
    },
  });
};
```

2. **Schema formats**

- **JSON introspection**: Use a `schema.json` from an introspection query. The package adds `JsonFileLoader` automatically when the schema path ends with `.json`.
- **SDL file**: Use `schema: "./schema.graphql"` and add `loaders: { GraphQLFileLoader: "@graphql-tools/graphql-file-loader" }` if needed.
- **Remote**: Use a URL and configure `loaders` with `UrlLoader`.

3. **Run the site**

```bash
npm run dev   # or vitepress dev
npm run build # or vitepress build
```

## API

### `generateDocs(options)`

Generates GraphQL schema documentation as Markdown under `rootPath/baseURL`. Uses the VitePress formatter (`.md` output, VitePress containers and links).

**Options:** See `GraphQLDocsOptions` in the package types. Key fields:

- `schema` (required) — Path or URL to the schema
- `rootPath` — Root folder for output (default `"./docs"`)
- `baseURL` — Segment under `rootPath` (default `"graphql"`)
- `linkRoot` — Prefix for internal links (default `"/"`; use `"/"` so links are `/graphql/...`)
- `loaders` — Optional; `.json` schemas get `JsonFileLoader` automatically

### `createSidebar(docsDir, baseURL?)`

Builds a VitePress sidebar config from the generated docs directory. Supports nested category folders (e.g. `01-operations/07-queries/`, `02-types/06-objects/`).

- `docsDir` — Path to the generated docs folder (e.g. `resolve(__dirname, "../graphql")`)
- `baseURL` — Base path for links (e.g. `"graphql"`). Defaults to the last segment of `docsDir`.

Returns a `SidebarConfig` suitable for `themeConfig.sidebar["/graphql/"]`.

### `graphqlDocsPlugin(options)`

Vite plugin that runs doc generation on `buildStart` and when the dev server starts. Pass the same options you use for `generateDocs` so that regenerating (e.g. after schema change) keeps the docs in sync.

## Demo

The `docs/` folder in this repo is a minimal VitePress site that documents the included `schema.json`:

```bash
cd docs && npm install && npm run dev
```

Then open the dev server URL and use the sidebar to browse the API.

## License

MIT
