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
  });

  const sidebar = await createSidebar(graphqlDir, "graphql", {
    order: ["generated.md", "operations", "types"],
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
