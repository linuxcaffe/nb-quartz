import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { QuartzPluginData } from "../../plugins/vfile"
import { resolveRelative } from "../../util/path"
import { classNames } from "../../util/lang"
import { thumbSrc } from "./imageUtils"
// @ts-ignore
import style from "../styles/itemGrid.scss"

// Renders an item grid driven entirely by the page's `with_tags:` frontmatter field.
// Add `with_tags: [vintage]` (or any tag list) to any page note and it becomes a
// tag-feed page — no layout code changes needed.
const TagFeed: QuartzComponent = (props: QuartzComponentProps) => {
  if (!props?.allFiles) return null
  const { allFiles, fileData, displayClass } = props

  const raw = fileData.frontmatter?.with_tags
  if (!raw) return null
  const tags: string[] = (Array.isArray(raw) ? raw : [raw]).map(String)

  let items: QuartzPluginData[] = allFiles
    .filter((f) => {
      if (!f.slug?.startsWith("items/")) return false
      const status = (f.frontmatter?.status as string) ?? "available"
      if (status !== "available") return false
      const itemTags: string[] = (f.frontmatter?.tags as string[]) ?? []
      return tags.some((t) => itemTags.includes(t))
    })
    .sort((a, b) => {
      const da = a.dates?.created?.getTime() ?? 0
      const db = b.dates?.created?.getTime() ?? 0
      return db - da
    })

  if (items.length === 0) return null

  return (
    <div class={classNames(displayClass, "item-grid")}>
      {items.map((item) => {
        const fm = item.frontmatter ?? {}
        const title   = (fm["title"]   as string) ?? item.slug ?? ""
        const price   = fm["price"]   as string | undefined
        const qtty    = fm["qtty"]    as string | undefined
        const status  = (fm["status"] as string) ?? "available"
        const image   = fm["image"]   as string | undefined
        const caption = fm["caption"] as string | undefined
        const href    = resolveRelative(fileData.slug!, item.slug!)
        const imgSrc = thumbSrc(image, fileData.slug!)
        const badgeLabel = status === "available" ? "Available" : status === "sold" ? "Sold" : status

        return (
          <a href={href} class={`item-card item-card--${status}`}>
            <div class="item-card-img">
              {imgSrc
                ? <img src={imgSrc} alt={title} decoding="async" />
                : <div class="item-card-img-placeholder" />
              }
            </div>
            <div class="item-card-body">
              <div class="item-card-title">{title}</div>
              {caption && <div class="item-card-caption">{caption}</div>}
              <div class="item-card-footer">
                {qtty && <span class="item-card-qtty">×{String(qtty)}</span>}
                <span class={`item-card-badge item-status--${status}`}>{badgeLabel}</span>
                {price && <span class="item-card-price">{String(price)}</span>}
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )
}

TagFeed.css = style

export default (() => TagFeed) satisfies QuartzComponentConstructor
