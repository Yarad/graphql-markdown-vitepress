import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildFieldsIndex, inlineTypeFields } from "./inline.js";
import { transformGeneratedDocs } from "./index.js";
import { readFileSync, existsSync } from "node:fs";

function makeTmpDir(): string {
  const dir = join(tmpdir(), `gql-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeDoc(dir: string, relPath: string, content: string): void {
  const full = join(dir, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf-8");
}

// ── buildFieldsIndex ───────────────────────────────

describe("buildFieldsIndex", () => {
  let docsDir: string;

  beforeEach(() => {
    docsDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(docsDir, { recursive: true, force: true });
  });

  it("creates keys without .md extension", () => {
    writeDoc(docsDir, "02-types/06-objects/player.md", [
      "# Player",
      "",
      "### Fields",
      "",
      "#### `name` ([String](../scalars/string.md))",
      "",
      "The player name.",
    ].join("\n"));

    const index = buildFieldsIndex(docsDir, "graphql");
    const keys = [...index.keys()];

    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe("/graphql/02-types/06-objects/player");
    expect(keys[0]).not.toMatch(/\.md$/);
  });

  it("skips index.md files", () => {
    writeDoc(docsDir, "02-types/06-objects/index.md", [
      "# Objects",
      "",
      "### Fields",
      "",
      "#### `x` (Y)",
      "",
      "Desc.",
    ].join("\n"));

    const index = buildFieldsIndex(docsDir, "graphql");
    expect(index.size).toBe(0);
  });

  it("extracts fields HTML from recognized sections", () => {
    writeDoc(docsDir, "02-types/06-objects/team.md", [
      "# Team",
      "",
      "### Fields",
      "",
      "#### `name` ([String](../scalars/string.md))",
      "",
      "The team name.",
      "",
      "### Description",
      "",
      "A team entity.",
    ].join("\n"));

    const index = buildFieldsIndex(docsDir, "graphql");
    const html = index.get("/graphql/02-types/06-objects/team");

    expect(html).toBeDefined();
    expect(html).toContain("`name`");
  });
});

// ── inlineTypeFields ───────────────────────────────

describe("inlineTypeFields", () => {
  it("expands response section type refs when href has .md extension", () => {
    const index = new Map<string, string>();
    index.set(
      "/graphql/02-types/06-objects/tournament-pagination",
      [
        '<details class="gql-field" id="nodes">',
        '<summary><code>nodes</code> (<a href="/graphql/02-types/06-objects/tournament.md">[Tournament]</a>)</summary>',
        "",
        '<p class="gql-desc">The list of tournaments.</p>',
        "</details>",
      ].join("\n"),
    );

    const content = [
      "# Tournaments",
      "",
      "### Response",
      "",
      "#### [TournamentPagination](/graphql/02-types/06-objects/tournament-pagination.md)",
      "",
      "The paginated result.",
    ].join("\n");

    const options = { baseURL: "graphql" };
    const result = inlineTypeFields(content, index, options);

    expect(result).toContain("gql-inline-fields");
    expect(result).toContain("nodes");
    expect(result).toContain("gql-response-type");
  });

  it("expands details block type refs when href has .md extension", () => {
    const index = new Map<string, string>();
    index.set(
      "/graphql/02-types/06-objects/address",
      [
        '<details class="gql-field" id="city">',
        "<summary><code>city</code> (String)</summary>",
        "",
        '<p class="gql-desc">The city name.</p>',
        "</details>",
      ].join("\n"),
    );

    const content = [
      '<details class="gql-field" id="home-address">',
      '<summary><code>homeAddress</code> (<a href="/graphql/02-types/06-objects/address.md">Address</a>)</summary>',
      "",
      '<p class="gql-desc">Home address.</p>',
      "</details>",
    ].join("\n");

    const options = { baseURL: "graphql", lazyInline: false };
    const result = inlineTypeFields(content, index, options);

    expect(result).toContain("gql-inline-fields");
    expect(result).toContain("city");
  });

  it("returns content unchanged when no type refs match", () => {
    const index = new Map<string, string>();

    const content = [
      "# Simple page",
      "",
      "### Fields",
      "",
      "No type refs here.",
    ].join("\n");

    const result = inlineTypeFields(content, index, { baseURL: "graphql" });
    expect(result).toBe(content);
  });

  it("handles hrefs without .md extension (clean URLs)", () => {
    const index = new Map<string, string>();
    index.set(
      "/graphql/types/objects/player",
      [
        '<details class="gql-field" id="name">',
        "<summary><code>name</code> (String)</summary>",
        "",
        '<p class="gql-desc">Player name.</p>',
        "</details>",
      ].join("\n"),
    );

    const content = [
      '<details class="gql-field" id="player">',
      '<summary><code>player</code> (<a href="/graphql/types/objects/player">Player</a>)</summary>',
      "",
      '<p class="gql-desc">The player.</p>',
      "</details>",
    ].join("\n");

    const options = { baseURL: "graphql", lazyInline: false };
    const result = inlineTypeFields(content, index, options);

    expect(result).toContain("gql-inline-fields");
    expect(result).toContain("Player name");
  });
});

// ── transformGeneratedDocs (integration) ───────────

describe("transformGeneratedDocs", () => {
  let docsDir: string;

  beforeEach(() => {
    docsDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(docsDir, { recursive: true, force: true });
  });

  it("inlines type fields in response sections with .md hrefs", async () => {
    writeDoc(docsDir, "02-types/06-objects/tournament-pagination.md", [
      "# TournamentPagination",
      "",
      "### Fields",
      "",
      "#### `nodes` ([[Tournament]](/graphql/02-types/06-objects/tournament.md))",
      "",
      "The list of tournaments.",
    ].join("\n"));

    writeDoc(docsDir, "01-operations/01-queries/tournaments.md", [
      "# Tournaments",
      "",
      "### Type",
      "",
      "#### [TournamentPagination](/graphql/02-types/06-objects/tournament-pagination.md)",
      "",
      "The paginated result.",
    ].join("\n"));

    await transformGeneratedDocs(docsDir, {
      baseURL: "graphql",
      collapsible: true,
      inline: true,
      lazyInline: false,
      seo: false,
      cleanUrls: false,
    });

    const queryContent = readFileSync(
      join(docsDir, "01-operations/01-queries/tournaments.md"),
      "utf-8",
    );

    expect(queryContent).toContain("gql-inline-fields");
    expect(queryContent).toContain("nodes");
  });

  it("generates _gql-fields-index.json with clean keys when cleanUrls is true", async () => {
    writeDoc(docsDir, "02-types/06-objects/player.md", [
      "# Player",
      "",
      "### Fields",
      "",
      "#### `name` ([String](/graphql/02-types/05-scalars/string.md))",
      "",
      "The player name.",
    ].join("\n"));

    await transformGeneratedDocs(docsDir, {
      baseURL: "graphql",
      collapsible: true,
      inline: true,
      lazyInline: true,
      seo: false,
      cleanUrls: true,
    });

    const jsonPath = join(docsDir, "..", "public", "_gql-fields-index.json");
    expect(existsSync(jsonPath)).toBe(true);

    const jsonIndex = JSON.parse(readFileSync(jsonPath, "utf-8"));
    const keys = Object.keys(jsonIndex);

    for (const key of keys) {
      expect(key).not.toMatch(/\d+-/);
      expect(key).not.toMatch(/\.md$/);
    }

    expect(keys).toContain("/graphql/types/objects/player");
  });

  it("generates _gql-fields-index.json with numbered keys when cleanUrls is false", async () => {
    writeDoc(docsDir, "02-types/06-objects/player.md", [
      "# Player",
      "",
      "### Fields",
      "",
      "#### `name` ([String](/graphql/02-types/05-scalars/string.md))",
      "",
      "The player name.",
    ].join("\n"));

    await transformGeneratedDocs(docsDir, {
      baseURL: "graphql",
      collapsible: true,
      inline: true,
      lazyInline: true,
      seo: false,
      cleanUrls: false,
    });

    const jsonPath = join(docsDir, "..", "public", "_gql-fields-index.json");
    expect(existsSync(jsonPath)).toBe(true);

    const jsonIndex = JSON.parse(readFileSync(jsonPath, "utf-8"));
    const keys = Object.keys(jsonIndex);

    expect(keys).toContain("/graphql/02-types/06-objects/player");
  });

  it("strips .md from hrefs in JSON HTML values when cleanUrls is true", async () => {
    writeDoc(docsDir, "02-types/06-objects/player.md", [
      "# Player",
      "",
      "### Fields",
      "",
      "#### `team` ([Team](/graphql/02-types/06-objects/team.md))",
      "",
      "The player's team.",
    ].join("\n"));

    writeDoc(docsDir, "02-types/06-objects/team.md", [
      "# Team",
      "",
      "### Fields",
      "",
      "#### `name` ([String](/graphql/02-types/05-scalars/string.md))",
      "",
      "The team name.",
    ].join("\n"));

    await transformGeneratedDocs(docsDir, {
      baseURL: "graphql",
      collapsible: true,
      inline: true,
      lazyInline: true,
      seo: false,
      cleanUrls: true,
    });

    const jsonPath = join(docsDir, "..", "public", "_gql-fields-index.json");
    const jsonIndex = JSON.parse(readFileSync(jsonPath, "utf-8"));

    for (const [key, html] of Object.entries(jsonIndex)) {
      if (key === "_meta") continue;
      expect(html as string).not.toMatch(/href="[^"]+\.md"/);
    }
  });
});
