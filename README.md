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

2. **Set up the theme** in `.vitepress/theme/index.ts`:

```ts
import "graphql-markdown-vitepress/style.css";
export { default } from "graphql-markdown-vitepress/theme";
```

This registers the styles (collapsible fields, badges, inline types) and the lazy-loading runtime for nested type expansion. If you need to extend the theme further:

```ts
import DefaultTheme from "vitepress/theme";
import { graphqlThemeSetup } from "graphql-markdown-vitepress/theme";
import "graphql-markdown-vitepress/style.css";

export default {
  extends: DefaultTheme,
  setup() {
    graphqlThemeSetup();
    // your own setup logic
  },
};
```

3. **Schema formats**

- **JSON introspection**: Use a `schema.json` from an introspection query. The package adds `JsonFileLoader` automatically when the schema path ends with `.json`.
- **SDL file**: Use `schema: "./schema.graphql"` and add `loaders: { GraphQLFileLoader: "@graphql-tools/graphql-file-loader" }` if needed.
- **Remote**: Use a URL and configure `loaders` with `UrlLoader`.

4. **Run the site**

```bash
npm run dev   # or vitepress dev
npm run build # or vitepress build
```

## API

### `generateDocs(options)`

Generates GraphQL schema documentation as Markdown under `rootPath/baseURL`, then runs the transform pipeline to produce collapsible, nested documentation.

### `createSidebar(docsDir, baseURL?)`

Builds a VitePress sidebar config from the generated docs directory. Supports nested category folders (e.g. `01-operations/07-queries/`, `02-types/06-objects/`).

- `docsDir` — Path to the generated docs folder (e.g. `resolve(__dirname, "../graphql")`)
- `baseURL` — Base path for links (e.g. `"graphql"`). Defaults to the last segment of `docsDir`.

Returns a `SidebarConfig` suitable for `themeConfig.sidebar["/graphql/"]`.

### `graphqlDocsPlugin(options)`

Vite plugin that runs doc generation on `buildStart` and when the dev server starts. Pass the same options you use for `generateDocs`.

### `transformGeneratedDocs(docsDir, options?)`

Runs the transform pipeline on already-generated markdown files. Called automatically by `generateDocs`, but exported for use in custom build scripts.

### `resolveTransformConfig(options?)`

Resolves a partial `TransformOptions` object into a fully-populated `ResolvedTransformConfig` with all defaults applied. Useful when calling individual transform functions directly.

## Configuration

### `GraphQLDocsOptions`

All options passed to `generateDocs` and `graphqlDocsPlugin`.

| Option        | Type                                           | Default            | Description                                                  |
| ------------- | ---------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| `schema`      | `string`                                       | **required**       | Path to GraphQL schema file or URL                           |
| `rootPath`    | `string`                                       | `"./docs"`         | Root folder for generated documentation                      |
| `baseURL`     | `string`                                       | `"graphql"`        | URL segment under `rootPath`; docs go to `rootPath/baseURL/` |
| `linkRoot`    | `string`                                       | `"/"`              | Prefix for internal links                                    |
| `mdxParser`   | `string`                                       | built-in formatter | Custom formatter module path                                 |
| `loaders`     | `Record<string, ...>`                          | auto for `.json`   | Schema loaders                                               |
| `transforms`  | `TransformOptions \| false`                    | `{}` (all enabled) | Transform pipeline configuration; `false` to skip            |
| `onGenerated` | `(outputDir: string) => void \| Promise<void>` | —                  | Callback after generation and transforms complete            |

All [GraphQL-Markdown config options](https://graphql-markdown.dev/docs/configuration) (`pretty`, `printTypeOptions`, `docOptions`, `groupByDirective`, etc.) are also supported.

### `TransformOptions`

Controls the post-generation transform pipeline that converts flat GraphQL-Markdown output into collapsible, nested documentation.

#### Pipeline control

| Option           | Type                              | Default | Description                                                                                                               |
| ---------------- | --------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `collapsible`    | `boolean`                         | `true`  | Enable the collapsible `<details>/<summary>` pass                                                                         |
| `inline`         | `boolean`                         | `true`  | Enable the inline type expansion pass                                                                                     |
| `custom`         | `((content: string) => string)[]` | `[]`    | Custom transform functions applied after built-in passes                                                                  |
| `seo`            | `boolean`                         | `true`  | Enable the SEO enhancement pass (per-page `title` with category qualifier, `description` from GraphQL schema, H1 heading) |
| `cleanUrls`      | `boolean`                         | `true`  | Strip numeric ordering prefixes from directories (e.g. `01-operations` → `operations`) and rewrite internal links         |
| `structuredData` | `boolean`                         | `true`  | Inject JSON-LD `TechArticle` structured data into each page (requires `seo` to be enabled)                                |

#### Section configuration

| Option                | Type                     | Default                                             | Description                                                 |
| --------------------- | ------------------------ | --------------------------------------------------- | ----------------------------------------------------------- |
| `collapsibleSections` | `string[]`               | `["fields", "arguments", "values", "input fields"]` | H3 titles that become collapsible blocks (case-insensitive) |
| `responseSections`    | `string[]`               | `["response", "type"]`                              | H3 titles treated as response sections for inlining         |
| `fieldSections`       | `string[]`               | `["fields", "values", "input fields"]`              | H3 titles used to extract fields for the type index         |
| `sectionRenames`      | `Record<string, string>` | `{ "### Type": "### Response" }`                    | Exact heading line replacements                             |

#### Inline expansion

| Option                 | Type       | Default                 | Description                                                                                                                                                  |
| ---------------------- | ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `baseURL`              | `string`   | `"graphql"`             | Base URL segment for matching type references in links                                                                                                       |
| `inlineDepth`          | `number`   | `3`                     | Maximum nesting depth for recursive inline expansion. `1` reproduces legacy single-level behavior; `0` disables inline expansion entirely                    |
| `lazyInline`           | `boolean`  | `true`                  | When enabled, only the first level of inline fields is pre-rendered at build time; deeper levels are loaded on demand in the browser via a JSON fields index |
| `inlineTypeCategories` | `string[]` | `["objects", "inputs"]` | Type category folder suffixes eligible for inline expansion. Matched as `\d+-{category}` in URL paths                                                        |

#### Labels

| Option             | Type     | Default       | Description                        |
| ------------------ | -------- | ------------- | ---------------------------------- |
| `labels.arguments` | `string` | `"Arguments"` | Label for nested argument blocks   |
| `labels.fields`    | `string` | `"Fields"`    | Label for inlined field containers |

#### CSS classes

The `css` option controls CSS class names in rendered HTML. Pass a **string** to set a prefix, or an **object** to override individual classes.

**Using a prefix:**

```ts
transforms: {
  css: "api-docs";
}
// Generates: api-docs-field, api-docs-arg, api-docs-desc, ...
```

**Using an object (partial overrides):**

```ts
transforms: {
  css: {
    field: "custom-field",
    arg: "custom-arg",
    // Unspecified classes keep the default "gql-*" prefix
  }
}
```

**Default class map** (prefix `"gql"`):

| Key            | Default class        | Used for                                                |
| -------------- | -------------------- | ------------------------------------------------------- |
| `field`        | `gql-field`          | Top-level field `<details>` elements                    |
| `desc`         | `gql-desc`           | Description `<p>` elements                              |
| `sectionLabel` | `gql-section-label`  | Section label `<span>` ("Arguments", "Fields")          |
| `inlineField`  | `gql-inline-field`   | Inline/argument `<details>` elements                    |
| `inlineFields` | `gql-inline-fields`  | Section container `<div>` (arguments and inline fields) |
| `responseType` | `gql-response-type`  | Response type `<details>` elements                      |

## Examples

### Disable inline expansion

Keep collapsible fields but don't embed referenced types:

```ts
await generateDocs({
  schema: "./schema.graphql",
  transforms: {
    inline: false,
  },
});
```

### Skip all transforms

Use raw GraphQL-Markdown output without any post-processing:

```ts
await generateDocs({
  schema: "./schema.graphql",
  transforms: false,
});
```

### Custom CSS prefix

Use your own class naming convention:

```ts
await generateDocs({
  schema: "./schema.graphql",
  transforms: {
    css: "api-docs",
  },
});
```

Then style with `.api-docs-field`, `.api-docs-arg`, etc. in your VitePress theme.

### Custom labels

Rename the labels rendered inside the HTML:

```ts
await generateDocs({
  schema: "./schema.graphql",
  transforms: {
    labels: {
      arguments: "Parameters",
      fields: "Properties",
    },
  },
});
```

### Custom base URL

Embed GraphQL docs under a different path in your site:

```ts
await generateDocs({
  schema: "./schema.graphql",
  baseURL: "api-reference",
  transforms: {
    // Not needed — baseURL is forwarded automatically from the top-level option.
    // Only set this when calling transformGeneratedDocs directly.
  },
});

const sidebar = await createSidebar("./docs/api-reference", "api-reference");
```

### Post-generation hook

Run custom logic after docs are generated:

```ts
await generateDocs({
  schema: "./schema.graphql",
  onGenerated: (outputDir) => {
    console.log(`Docs generated at ${outputDir}`);
    // Copy extra assets, run additional processing, etc.
  },
});
```

### Custom transform pass

Add your own post-processing step that runs after the built-in passes:

```ts
await generateDocs({
  schema: "./schema.graphql",
  transforms: {
    custom: [
      (content) => content.replace(/DRAFT/g, ""),
      (content) => content + "\n\n---\n_Auto-generated documentation_\n",
    ],
  },
});
```

### Extend inlineable types

By default only objects and inputs are inlined. Add unions:

```ts
await generateDocs({
  schema: "./schema.graphql",
  transforms: {
    inlineTypeCategories: ["objects", "inputs", "unions"],
  },
});
```

### Customize collapsible sections

Control which H3 sections become collapsible and rename headings:

```ts
await generateDocs({
  schema: "./schema.graphql",
  transforms: {
    collapsibleSections: ["fields", "arguments", "values"],
    sectionRenames: {
      "### Type": "### Return Type",
      "### Input Fields": "### Parameters",
    },
  },
});
```

## Advanced: using transform functions directly

For custom build pipelines, individual transform functions are exported:

```ts
import {
  transformMarkdown,
  buildFieldsIndex,
  inlineTypeFields,
  resolveTransformConfig,
} from "graphql-markdown-vitepress";

const options = { css: "my-prefix", labels: { arguments: "Params" } };

// Pass 1: collapsible
const collapsible = transformMarkdown(rawMarkdown, options);

// Pass 2: inline expansion
const index = buildFieldsIndex("./docs/graphql", "graphql", options);
const final = inlineTypeFields(collapsible, index, options);
```

## Styling

The default styles are included via `import "graphql-markdown-vitepress/style.css"` (see Quick Start). When using a custom `css` prefix or class map, override the corresponding classes in your own stylesheet.

## Demo

The [`demo/`](./demo/) folder contains a minimal VitePress site showcasing the package. See its [README](./demo/README.md) for setup instructions.

## License

MIT
