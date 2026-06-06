import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { resolveRelative, FullSlug } from "../../util/path"

const ItemCategory: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  if (!fileData.slug?.startsWith("items/")) return null
  const category = fileData.frontmatter?.category as string | undefined
  if (!category) return null

  const href = resolveRelative(fileData.slug!, `category/${category}` as FullSlug)
  return <a class="item-cat-badge" href={href}>{category}</a>
}

ItemCategory.css = `
.item-cat-badge {
  display: inline-flex;
  align-items: center;
  background: var(--secondary);
  color: var(--light) !important;
  border-radius: 4px;
  padding: 0.2em 0.65em;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none !important;
  margin-right: 0.25rem;
  vertical-align: middle;
}
.item-cat-badge:hover {
  background: var(--tertiary);
  text-decoration: none !important;
}
/* pull tags inline when category badge precedes them */
.item-cat-badge + ul.tags {
  display: inline-flex;
  flex-wrap: wrap;
  margin-top: 0;
  margin-bottom: 0;
  vertical-align: middle;
}
`

export default (() => ItemCategory) satisfies QuartzComponentConstructor
