import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { resolveRelative, pathToRoot, joinSegments } from "../../util/path"
import { classNames } from "../../util/lang"
// @ts-ignore
import style from "../styles/featuredItem.scss"

function normalizeImage(image: string, fromSlug: string): string | null {
  if (!image) return null
  const first = image.split(",")[0].trim()
  if (!first) return null
  const rel = first.startsWith("../images/") ? first.slice(3)
            : first.startsWith("images/")    ? first
            : `images/${first}`
  return joinSegments(pathToRoot(fromSlug as any), rel)
}

export default (() => {
  const FeaturedItem: QuartzComponent = (props: QuartzComponentProps) => {
    if (!props?.allFiles) return null
    const { allFiles, fileData, displayClass } = props
    const item = allFiles.find((f) => {
      if (!f.slug?.startsWith("items/")) return false
      const tags: string[] = (f.frontmatter?.tags as string[]) ?? []
      return tags.includes("featured")
    })

    if (!item) return null

    const fm          = item.frontmatter ?? {}
    const title       = (fm["title"] as string) ?? ""
    const caption     = fm["caption"] as string | undefined
    const description = fm["description"] as string | undefined
    const price       = fm["price"] as string | undefined
    const qtty        = fm["qtty"]  as string | undefined
    const status      = (fm["status"] as string) ?? "available"
    const image       = fm["image"] as string | undefined
    const listing     = fm["listing"] as string | undefined
    const platform    = fm["platform"] as string | undefined

    const href   = resolveRelative(fileData.slug!, item.slug!)
    const imgSrc = image ? normalizeImage(image, fileData.slug!) : null

    const statusLabel = status === "available" ? "Available" : status === "sold" ? "Sold" : status

    return (
      <div class={classNames(displayClass, "featured-item")}>
        {imgSrc && (
          <a href={href} class="featured-item-img-wrap">
            <img src={imgSrc} alt={title} loading="eager" class="featured-item-img" />
          </a>
        )}
        <div class="featured-item-body">
          <div class="featured-item-eyebrow">Featured item</div>
          <a href={href} class="featured-item-title">{title}</a>
          {caption && <p class="featured-item-caption">{caption}</p>}
          {description && <p class="featured-item-description">{description}</p>}
          <div class="featured-item-footer">
            {qtty && <span class="featured-item-qtty">×{String(qtty)}</span>}
            <span class={`item-status item-status--${status}`}>{statusLabel}</span>
            {price && <span class="featured-item-price">{String(price)}</span>}
            {listing
              ? <a href={String(listing)} class="featured-item-cta" target="_blank" rel="noopener noreferrer">
                  View on {String(platform || "listing")} →
                </a>
              : <a href={href} class="featured-item-cta">See this item →</a>
            }
          </div>
        </div>
      </div>
    )
  }

  FeaturedItem.css = style
  return FeaturedItem
}) satisfies QuartzComponentConstructor
