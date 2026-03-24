/**
 * Transform configuration resolution.
 * Converts user-facing {@link TransformOptions} into a fully-resolved
 * internal config with all defaults applied.
 */

import type { CssClassMap, TransformLabels, TransformOptions } from "../types.js";

export interface ResolvedTransformConfig {
  baseURL: string;
  linkRoot: string;
  collapsible: boolean;
  inline: boolean;
  inlineDepth: number;
  lazyInline: boolean;
  custom: ((content: string) => string)[];
  inlineTypeCategories: string[];
  sectionRenames: Record<string, string>;
  collapsibleSections: string[];
  responseSections: string[];
  fieldSections: string[];
  labels: Required<TransformLabels>;
  css: Required<CssClassMap>;
  seo: boolean;
  cleanUrls: boolean;
  structuredData: boolean;
  outline: number | [number, number] | "deep" | false;
  fieldsIndexOutputDir?: string;
}

const DEFAULT_CSS_PREFIX = "gql";

function resolveCss(css?: string | CssClassMap): Required<CssClassMap> {
  const prefix = typeof css === "string" ? css : DEFAULT_CSS_PREFIX;
  const defaults: Required<CssClassMap> = {
    field: `${prefix}-field`,
    desc: `${prefix}-desc`,
    sectionLabel: `${prefix}-section-label`,
    inlineField: `${prefix}-inline-field`,
    inlineFields: `${prefix}-inline-fields`,
    responseType: `${prefix}-response-type`,
  };

  if (typeof css === "object" && css !== null) {
    return {
      field: css.field ?? defaults.field,
      desc: css.desc ?? defaults.desc,
      sectionLabel: css.sectionLabel ?? defaults.sectionLabel,
      inlineField: css.inlineField ?? defaults.inlineField,
      inlineFields: css.inlineFields ?? defaults.inlineFields,
      responseType: css.responseType ?? defaults.responseType,
    };
  }

  return defaults;
}

export function resolveTransformConfig(
  options?: TransformOptions,
): ResolvedTransformConfig {
  return {
    baseURL: options?.baseURL ?? "graphql",
    linkRoot: options?.linkRoot ?? "/",
    collapsible: options?.collapsible ?? true,
    inline: options?.inline ?? true,
    inlineDepth: options?.inlineDepth ?? 3,
    lazyInline: options?.lazyInline ?? true,
    custom: options?.custom ?? [],
    inlineTypeCategories: options?.inlineTypeCategories ?? ["objects", "inputs"],
    sectionRenames: options?.sectionRenames ?? { "### Type": "### Response" },
    collapsibleSections: options?.collapsibleSections ?? [
      "fields",
      "arguments",
      "values",
      "input fields",
    ],
    responseSections: options?.responseSections ?? ["response", "type"],
    fieldSections: options?.fieldSections ?? ["fields", "values", "input fields"],
    labels: {
      arguments: options?.labels?.arguments ?? "Arguments",
      fields: options?.labels?.fields ?? "Fields",
    },
    css: resolveCss(options?.css),
    seo: options?.seo ?? true,
    cleanUrls: options?.cleanUrls ?? true,
    structuredData: options?.structuredData ?? true,
    outline: options?.outline ?? [2, 3],
    fieldsIndexOutputDir: options?.fieldsIndexOutputDir,
  };
}
