import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { resolveRelative, FullSlug } from "../../util/path"
// @ts-ignore
import style from "../styles/shopNav.scss"

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const ShopNav: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
  if (!allFiles) return null
  const fromSlug = fileData.slug!

  const tagFeedPages = allFiles
    .filter((f) => {
      if (f.slug?.startsWith("items/")) return false
      const wt = f.frontmatter?.with_tags
      return wt != null && (Array.isArray(wt) ? wt.length > 0 : String(wt).trim() !== "")
    })
    .sort((a, b) => {
      const ta = (a.frontmatter?.title as string) ?? a.slug ?? ""
      const tb = (b.frontmatter?.title as string) ?? b.slug ?? ""
      return ta.localeCompare(tb)
    })

  const byDate = [...allFiles]
    .filter((f) => {
      if (!f.slug?.startsWith("items/")) return false
      const status = f.frontmatter?.status as string | undefined
      return !status || status === "available"
    })
    .sort((a, b) => (b.dates?.created?.getTime() ?? 0) - (a.dates?.created?.getTime() ?? 0))

  const categories: string[] = []
  byDate.forEach((f) => {
    const cat = f.frontmatter?.category as string | undefined
    if (cat && !categories.includes(cat)) categories.push(cat)
  })

  if (tagFeedPages.length === 0 && categories.length === 0) return null

  const activeCat = fromSlug.startsWith("category/")
    ? fromSlug.slice("category/".length)
    : fromSlug.startsWith("items/")
    ? (fileData.frontmatter?.category as string | undefined)
    : undefined

  return (
    <nav class="shop-nav">
      {tagFeedPages.map((page) => (
        <a
          href={resolveRelative(fromSlug, page.slug!)}
          class={fromSlug === page.slug ? "shop-nav-active" : ""}
        >{(page.frontmatter?.title as string) ?? page.slug}</a>
      ))}
      {categories.map((cat) => (
        <a
          href={resolveRelative(fromSlug, `category/${cat}` as FullSlug)}
          class={cat === activeCat ? "shop-nav-active" : ""}
        >{capitalize(cat)}</a>
      ))}
    </nav>
  )
}

ShopNav.css = style

export default (() => ShopNav) satisfies QuartzComponentConstructor
