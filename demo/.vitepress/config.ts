import { defineConfig } from "vitepress";
import {
  generateDocs,
  createSidebar,
  graphqlDocsPlugin,
} from "graphql-markdown-vitepress";
import { resolve } from "node:path";

export default async () => {
  const schemaPath = resolve(__dirname, "../schema-example.graphql");
  const rootPath = resolve(__dirname, "..");
  const graphqlDir = resolve(rootPath, "graphql");

  await generateDocs({
    schema: schemaPath,
    rootPath,
    baseURL: "graphql",
    linkRoot: "/",
    landingPage: {
      label: "Overview",
      filename: "index.md",
      frontMatter: { title: "Overview" },
      content: `# EGD Go Tournament API

Welcome to the **European Go Database** GraphQL API reference.

This API provides access to tournament results, player ratings, and game
records from the EGD system. Use it to build tournament browsers, player
profile pages, leaderboards, and more.

## Quick start

\`\`\`graphql
query {
  tournaments(pagination: { first: 5 }) {
    data { code description date city nation }
  }
}
\`\`\`

## What's inside

- **Queries** — look up tournaments, games, and players by ID or search criteria.
- **Object types** — \`Tournament\`, \`Game\`, \`Player\`, \`Placement\`, and their paginated list wrappers.
- **Input types** — filters and ordering inputs for fine-grained pagination.
- **Enums** — tournament class, order direction, game colors, and more.

Browse the sidebar to explore every type and operation in detail.
`,
    },
  });

  const sidebar = await createSidebar(graphqlDir, "graphql", {
    order: ["index.md", "operations", "types"],
    subOrder: {
      operations: ["queries", "directives"],
      types: ["objects", "inputs", "enums", "directives", "scalars"],
    },
  });

  return defineConfig({
    title: "GraphQL API Docs",
    description: "Auto-generated GraphQL schema documentation",
    base: "/",
    themeConfig: {
      nav: [
        { text: "Home", link: "/" },
        { text: "API", link: "/graphql/" },
      ],
      sidebar: {
        "/graphql/": sidebar,
      },
      socialLinks: [],
      search: {
        provider: "local",
      },
    },
    vite: {
      plugins: [
        graphqlDocsPlugin({
          schema: schemaPath,
          rootPath: resolve(__dirname, ".."),
          baseURL: "graphql",
          linkRoot: "/",
        }),
      ],
    },
  });
};
