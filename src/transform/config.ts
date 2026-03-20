/**
 * Transform configuration resolution.
 * Converts user-facing {@link TransformOptions} into a fully-resolved
 * internal config with all defaults applied.
 */

import type { CssClassMap, TransformLabels, TransformOptions } from "../types.js";

export interface ResolvedTransformConfig {
  baseURL: string;
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
}

const DEFAULT_CSS_PREFIX = "gql";

function resolveCss(css?: string | CssClassMap): Required<CssClassMap> {
  const prefix = typeof css === "string" ? css : DEFAULT_CSS_PREFIX;
  const defaults: Required<CssClassMap> = {
    field: `${prefix}-field`,
    arg: `${prefix}-arg`,
    desc: `${prefix}-desc`,
    fieldArgs: `${prefix}-field-args`,
    argsLabel: `${prefix}-args-label`,
    inlineField: `${prefix}-inline-field`,
    inlineFields: `${prefix}-inline-fields`,
    responseType: `${prefix}-response-type`,
  };

  if (typeof css === "object" && css !== null) {
    return {
      field: css.field ?? defaults.field,
      arg: css.arg ?? defaults.arg,
      desc: css.desc ?? defaults.desc,
      fieldArgs: css.fieldArgs ?? defaults.fieldArgs,
      argsLabel: css.argsLabel ?? defaults.argsLabel,
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
    collapsible: options?.collapsible ?? true,
    inline: options?.inline ?? true,
    inlineDepth: options?.inlineDepth ?? 3,
    lazyInline: options?.lazyInline ?? false,
    custom: options?.custom ?? [],
    inlineTypeCategories: options?.inlineTypeCategories ?? [
      "objects",
      "inputs",
    ],
    sectionRenames: options?.sectionRenames ?? { "### Type": "### Response" },
    collapsibleSections: options?.collapsibleSections ?? [
      "fields",
      "arguments",
      "values",
      "input fields",
    ],
    responseSections: options?.responseSections ?? ["response", "type"],
    fieldSections: options?.fieldSections ?? [
      "fields",
      "values",
      "input fields",
    ],
    labels: {
      arguments: options?.labels?.arguments ?? "Arguments",
      fields: options?.labels?.fields ?? "Fields",
    },
    css: resolveCss(options?.css),
    seo: options?.seo ?? true,
    cleanUrls: options?.cleanUrls ?? true,
    structuredData: options?.structuredData ?? true,
  };
}
