import { describe, it, expect } from "vitest";
import { stripBase } from "./path.js";

describe("stripBase", () => {
  it("returns the path unchanged when base is '/'", () => {
    expect(stripBase("/api/graphql/foo", "/")).toBe("/api/graphql/foo");
  });

  it("returns the path unchanged when base is empty", () => {
    expect(stripBase("/api/graphql/foo", "")).toBe("/api/graphql/foo");
  });

  it("strips a trailing-slash base", () => {
    expect(stripBase("/docs/api/graphql/foo", "/docs/")).toBe(
      "/api/graphql/foo",
    );
  });

  it("strips a base that lacks a trailing slash", () => {
    expect(stripBase("/docs/api/graphql/foo", "/docs")).toBe(
      "/api/graphql/foo",
    );
  });

  it("strips a multi-segment base", () => {
    expect(stripBase("/foo/bar/api/graphql/x", "/foo/bar/")).toBe(
      "/api/graphql/x",
    );
  });

  it("preserves the leading slash after stripping", () => {
    expect(stripBase("/docs/", "/docs/")).toBe("/");
  });

  it("returns the path unchanged when it does not start with base", () => {
    expect(stripBase("/other/page", "/docs/")).toBe("/other/page");
  });

  it("does not strip a partial segment match", () => {
    // "/docs-archive/..." must not match base "/docs/"
    expect(stripBase("/docs-archive/x", "/docs/")).toBe("/docs-archive/x");
  });
});
