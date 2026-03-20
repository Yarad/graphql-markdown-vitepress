/**
 * Client-side lazy loader for nested GraphQL type fields.
 *
 * At build time only the first inline expansion level is pre-rendered;
 * deeper type references become lightweight `<div class="gql-lazy-fields">`
 * placeholders. This script fetches the JSON fields index once, then
 * resolves each placeholder on demand when the user opens its parent
 * `<details>` element. Circular references are tracked per expansion path.
 */

type FieldsIndex = Record<string, string>;

let fieldsIndex: FieldsIndex | null = null;
let indexPromise: Promise<FieldsIndex> | null = null;

function loadIndex(): Promise<FieldsIndex> {
  if (fieldsIndex) return Promise.resolve(fieldsIndex);
  if (!indexPromise) {
    const base =
      (typeof document !== "undefined" &&
        document.querySelector<HTMLBaseElement>("base")?.href) ||
      "/";
    const url = `${base.replace(/\/$/, "")}/_gql-fields-index.json`;
    indexPromise = fetch(url)
      .then((r) => r.json())
      .then((data: FieldsIndex) => {
        fieldsIndex = data;
        return data;
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

function expandLazy(
  container: HTMLElement,
  typeUrl: string,
  visited: Set<string>,
): void {
  if (!fieldsIndex?.[typeUrl]) {
    container.remove();
    return;
  }

  const html = fieldsIndex[typeUrl];

  container.classList.remove("gql-lazy-fields");

  const temp = document.createElement("div");
  temp.innerHTML = html;

  temp.querySelectorAll(".gql-field").forEach((el) => {
    el.classList.replace("gql-field", "gql-inline-field");
  });

  stripSelfAnchors(temp);

  while (temp.firstChild) {
    container.appendChild(temp.firstChild);
  }

  const newVisited = new Set(visited);
  newVisited.add(typeUrl);

  attachLazyToChildren(container, newVisited);
}

function attachLazyToChildren(
  root: Element,
  visited: Set<string>,
): void {
  root
    .querySelectorAll<HTMLDetailsElement>(
      ":scope > details.gql-inline-field",
    )
    .forEach((details) => {
      if (details.dataset.lazyBound) return;

      const summary = details.querySelector("summary");
      if (!summary) return;

      const link = summary.querySelector<HTMLAnchorElement>("a[href]");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || !fieldsIndex?.[href] || visited.has(href)) return;

      details.dataset.lazyBound = "true";

      const lazy = document.createElement("div");
      lazy.className = "gql-inline-fields gql-lazy-fields";
      lazy.dataset.typeUrl = href;
      lazy.innerHTML = '<span class="gql-args-label">Fields</span>';
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
        loadIndex().then(() => {
          const typeUrl = container.dataset.typeUrl;
          if (typeUrl) expandLazy(container, typeUrl, new Set());
        });
        return;
      }

      const handler = () => {
        if (!(parentDetails as HTMLDetailsElement).open) return;
        parentDetails.removeEventListener("toggle", handler);
        loadIndex().then(() => {
          const typeUrl = container.dataset.typeUrl;
          if (typeUrl) expandLazy(container, typeUrl, new Set());
        });
      };
      parentDetails.addEventListener("toggle", handler);
    });
}
