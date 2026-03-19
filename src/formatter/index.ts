/**
 * VitePress MDX formatter module for GraphQL-Markdown.
 * Produces VitePress-native markdown (::: containers, .md links, YAML frontmatter).
 */
import type {
  AdmonitionType,
  Badge,
  CollapsibleOption,
  Formatter,
  FrontMatterOptions,
  Maybe,
  MDXString,
  MetaInfo,
  TypeLink,
} from "@graphql-markdown/types";
import {
  escapeMDX,
  FRONT_MATTER_DELIMITER,
  MARKDOWN_EOL,
  MARKDOWN_EOP,
} from "@graphql-markdown/utils";

const LINK_EXTENSION = ".md" as const;

/**
 * File extension for generated docs (VitePress uses .md).
 */
export const mdxExtension = LINK_EXTENSION;

/**
 * No extra imports needed for VitePress (plain markdown).
 */
export const mdxDeclaration = "";

/**
 * Formats a badge. VitePress default theme supports <Badge> in markdown.
 */
export const formatMDXBadge = ({ text, classname }: Badge): MDXString => {
  const textStr = typeof text === "object" ? text.singular : text;
  const type = typeof classname === "string" ? classname.toLowerCase() : "secondary";
  return ` <Badge type="${type}">${escapeMDX(textStr)}</Badge> ` as MDXString;
};

/**
 * Formats an admonition using VitePress custom containers (::: tip, ::: warning, etc.).
 */
export const formatMDXAdmonition = (
  { text, title, type }: AdmonitionType,
  _meta: Maybe<MetaInfo>
): MDXString => {
  const safeType = type === "caution" ? "warning" : type;
  return `${MARKDOWN_EOP}::: ${safeType} ${title}${MARKDOWN_EOL}${text}${MARKDOWN_EOL}:::${MARKDOWN_EOP}` as MDXString;
};

/**
 * Bullet separator.
 */
export const formatMDXBullet = (text: string = ""): MDXString => {
  return ` ${text}` as MDXString;
};

/**
 * Collapsible section using VitePress ::: details.
 */
export const formatMDXDetails = ({
  dataOpen,
  dataClose,
}: CollapsibleOption): MDXString => {
  return `${MARKDOWN_EOP}::: details ${dataOpen}${MARKDOWN_EOL}${dataClose}${MARKDOWN_EOL}:::${MARKDOWN_EOP}` as MDXString;
};

/**
 * Frontmatter block with --- delimiters.
 */
export const formatMDXFrontmatter = (
  _props: Maybe<FrontMatterOptions>,
  formatted: Maybe<string[]>
): MDXString => {
  return formatted
    ? ([FRONT_MATTER_DELIMITER, ...formatted, FRONT_MATTER_DELIMITER].join(
        MARKDOWN_EOL
      ) as MDXString)
    : ("" as MDXString);
};

/**
 * Type link; append .md for VitePress routes.
 */
export const formatMDXLink = ({ text, url }: TypeLink): TypeLink => {
  return {
    text,
    url: `${url}${LINK_EXTENSION}`,
  };
};

/**
 * Named entity as inline code.
 */
export const formatMDXNameEntity = (
  name: string,
  parentType?: Maybe<string>
): MDXString => {
  const full = parentType ? `${parentType}.${name}` : name;
  return ` \`${escapeMDX(full)}\` ` as MDXString;
};

/**
 * Specified-by link as markdown link.
 */
export const formatMDXSpecifiedByLink = (url: string): MDXString => {
  return ` [Specified by](${url}) ` as MDXString;
};

/**
 * No-op: VitePress uses config-based sidebar, not _category_.yml.
 */
export const beforeGenerateIndexMetafileHook = async (): Promise<void> => {};

/**
 * Creates the VitePress formatter (all formatMDX* functions).
 */
export const createMDXFormatter = (meta?: Maybe<MetaInfo>): Formatter => ({
  formatMDXBadge,
  formatMDXAdmonition: (admonition: AdmonitionType, m?: Maybe<MetaInfo>) =>
    formatMDXAdmonition(admonition, meta ?? m),
  formatMDXBullet,
  formatMDXDetails,
  formatMDXFrontmatter,
  formatMDXLink,
  formatMDXNameEntity,
  formatMDXSpecifiedByLink,
});
