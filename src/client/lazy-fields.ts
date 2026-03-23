/**
 * Client-side lazy loader for nested GraphQL type fields.
 *
 * At build time only the first inline expansion level is pre-rendered;
 * deeper type references become lightweight `<div class="gql-lazy-fields">`
 * placeholders. This script fetches the JSON fields index once, then
 * resolves each placeholder on demand when the user opens its parent
 * `<details>` element. Circular references are tracked per expansion path.
 */

interface LazyFieldsMeta {
  css: {
    field: string;
    inlineField: string;
    inlineFields: string;
    sectionLabel: string;
    responseType: string;
  };
  labels: {
    fields: string;
  };
}

type FieldsIndex = Record<string, string>;

const DEFAULT_META: LazyFieldsMeta = {
  css: {
    field: "gql-field",
    inlineField: "gql-inline-field",
    inlineFields: "gql-inline-fields",
    sectionLabel: "gql-section-label",
    responseType: "gql-response-type",
  },
  labels: {
    fields: "Fields",
  },
};

let fieldsIndex: FieldsIndex | null = null;
let meta: LazyFieldsMeta = DEFAULT_META;
let indexPromise: Promise<FieldsIndex | null> | null = null;
let baseOverride: string | null = null;

/**
 * Sets the site base path used to resolve `_gql-fields-index.json`.
 * Called automatically by `graphqlThemeSetup` with VitePress's `site.base`.
 */
export function setFieldsIndexBase(base: string): void {
  baseOverride = base;
}

function loadIndex(): Promise<FieldsIndex | null> {
  if (fieldsIndex) return Promise.resolve(fieldsIndex);
  if (!indexPromise) {
    const base =
      baseOverride ??
      (typeof import.meta !== "undefined"
        ? (import.meta as unknown as Record<string, Record<string, string>>)
            .env?.BASE_URL
        : undefined) ??
      "/";
    const url = `${base.replace(/\/$/, "")}/_gql-fields-index.json`;
    indexPromise = fetch(url)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`${r.status} ${r.statusText}`);
        }
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("json")) {
          throw new Error(`Expected JSON, got ${ct}`);
        }
        return r.json() as Promise<Record<string, unknown>>;
      })
      .then((data) => {
        if (data) {
          if (data._meta) {
            meta = data._meta as LazyFieldsMeta;
            delete data._meta;
          }
          fieldsIndex = data as FieldsIndex;
        }
        return fieldsIndex;
      })
      .catch((err) => {
        console.warn("[graphql-markdown] Failed to load fields index:", err);
        indexPromise = null;
        return null;
      });
  }
  return indexPromise;
}

function stripSelfAnchors(el: Element): void {
  el.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    const parent = a.parentElement;
    if (!parent) return;
    while (a.firstChild) parent.insertBefore(a.firstChild, a);
    a.remove();
  });
}

function expandLazy(container: HTMLElement, typeUrl: string, visited: Set<string>): void {
  if (!fieldsIndex?.[typeUrl]) {
    container.remove();
    return;
  }

  const html = fieldsIndex[typeUrl];

  container.classList.remove("gql-lazy-fields");

  const temp = document.createElement("div");
  temp.innerHTML = html;

  temp.querySelectorAll(`.${meta.css.field}`).forEach((el) => {
    el.classList.replace(meta.css.field, meta.css.inlineField);
  });

  stripSelfAnchors(temp);

  while (temp.firstChild) {
    container.appendChild(temp.firstChild);
  }

  const newVisited = new Set(visited);
  newVisited.add(typeUrl);

  attachLazyToChildren(container, newVisited);
}

function attachLazyToChildren(root: Element, visited: Set<string>): void {
  root
    .querySelectorAll<HTMLDetailsElement>(`:scope > details.${meta.css.inlineField}`)
    .forEach((details) => {
      if (details.dataset.lazyBound) return;

      const summary = details.querySelector("summary");
      if (!summary) return;

      const link = summary.querySelector<HTMLAnchorElement>("a[href]");
      if (!link) return;

      const rawHref = link.getAttribute("href");
      const href = rawHref?.replace(/\.md$/, "");
      if (!href || !fieldsIndex?.[href] || visited.has(href)) return;

      details.dataset.lazyBound = "true";

      const lazy = document.createElement("div");
      lazy.className = `${meta.css.inlineFields} gql-lazy-fields`;
      lazy.dataset.typeUrl = href;
      lazy.innerHTML = `<span class="${meta.css.sectionLabel}">${meta.labels.fields}</span>`;
      details.appendChild(lazy);

      details.addEventListener("toggle", () => {
        if (!details.open) return;
        if (lazy.dataset.lazyLoaded === "true") return;
        lazy.dataset.lazyLoaded = "true";
        expandLazy(lazy, href, visited);
      });
    });
}

/**
 * Scans the current page for `.gql-lazy-fields` placeholders and wires
 * up toggle listeners on their parent `<details>` elements.
 * Safe to call multiple times (idempotent via `data-lazy-init`).
 */
export function initGqlLazyFields(): void {
  document
    .querySelectorAll<HTMLElement>(".gql-lazy-fields:not([data-lazy-init])")
    .forEach((container) => {
      container.dataset.lazyInit = "true";

      const parentDetails = container.closest("details");
      if (!parentDetails) return;

      if ((parentDetails as HTMLDetailsElement).open) {
        loadIndex().then((idx) => {
          if (!idx) return;
          const typeUrl = container.dataset.typeUrl;
          if (typeUrl) expandLazy(container, typeUrl, new Set());
        });
        return;
      }

      const handler = () => {
        if (!(parentDetails as HTMLDetailsElement).open) return;
        parentDetails.removeEventListener("toggle", handler);
        loadIndex().then((idx) => {
          if (!idx) return;
          const typeUrl = container.dataset.typeUrl;
          if (typeUrl) expandLazy(container, typeUrl, new Set());
        });
      };
      parentDetails.addEventListener("toggle", handler);
    });

  // Safety net: ensure response-type details stay open even if Vue's
  // template compiler strips the boolean `open` attribute.
  document
    .querySelectorAll<HTMLDetailsElement>(
      `details.${meta.css.responseType}:not([open])`,
    )
    .forEach((el) => {
      el.open = true;
    });
}
