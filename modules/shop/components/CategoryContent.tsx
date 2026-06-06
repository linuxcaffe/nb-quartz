import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { QuartzPluginData } from "../../plugins/vfile"
import { resolveRelative } from "../../util/path"
// @ts-ignore
import style from "../styles/categoryContent.scss"
import { thumbSrc, fullSrc } from "./imageUtils"

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default (() => {
  const CategoryContent: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
    if (!allFiles) return null
    const slug = fileData.slug!
    if (!slug.startsWith("category/")) return null

    const cat = slug.slice("category/".length)
    const fromSlug = slug

    const items = allFiles
      .filter((f) => {
        if (!f.slug?.startsWith("items/")) return false
        const status = f.frontmatter?.status as string | undefined
        if (status && status !== "available") return false
        return (f.frontmatter?.category as string) === cat
      })
      .sort((a, b) => (b.dates?.created?.getTime() ?? 0) - (a.dates?.created?.getTime() ?? 0))

    if (items.length === 0) {
      return (
        <div class="category-content">
                    <h1 class="category-page-title">{capitalize(cat)}</h1>
          <p class="category-empty">No items in this category yet.</p>
        </div>
      )
    }

    const [hero, ...rest] = items

    function HeroCard({ item }: { item: QuartzPluginData }) {
      const fm = item.frontmatter ?? {}
      const title       = (fm["title"] as string) ?? ""
      const caption     = fm["caption"]     as string | undefined
      const description = fm["description"] as string | undefined
      const condition   = fm["condition"]   as string | undefined
      const status      = fm["status"]      as string | undefined
      const price       = fm["price"]       as string | undefined
      const qtty        = fm["qtty"]        as string | undefined
      const platform    = fm["platform"]    as string | undefined
      const listing     = fm["listing"]     as string | undefined
      const image       = fm["image"]       as string | undefined
      const imgSrc      = fullSrc(image, fromSlug)
      const href        = resolveRelative(fromSlug, item.slug!)

      const statusLabel =
        status === "available" ? "Available"
        : status === "sold"    ? "Sold"
        : status               ?? ""

      return (
        <div class="cat-hero">
          <a href={href} class="cat-hero-title">{title}</a>
          <a href={href} class="cat-hero-img-wrap">
            {imgSrc
              ? <img src={imgSrc} alt={title} loading="eager" decoding="async" />
              : <div class="cat-hero-img-placeholder" />
            }
          </a>
          {caption && <a href={href} class="cat-hero-caption">{caption}</a>}
          {description && <a href={href} class="cat-hero-description">{description}</a>}
          {condition && <p class="cat-hero-condition">{condition}</p>}
          <div class="cat-hero-footer">
            {qtty && <span class="cat-hero-qtty">×{String(qtty)}</span>}
            {status && (
              <span class={`cat-hero-badge cat-hero-badge--${status}`}>{statusLabel}</span>
            )}
            {price && <span class="cat-hero-price">{String(price)}</span>}
            {platform && listing
              ? <a class="cat-hero-platform" href={String(listing)} target="_blank" rel="noopener noreferrer">
                  View on {String(platform)} →
                </a>
              : platform
              ? <span class="cat-hero-platform">{String(platform)}</span>
              : null
            }
          </div>
        </div>
      )
    }

    function ItemCard({ item }: { item: QuartzPluginData }) {
      const fm      = item.frontmatter ?? {}
      const title   = (fm["title"] as string) ?? ""
      const caption = (fm["caption"] as string) ?? title
      const image   = fm["image"] as string | undefined
      const imgSrc  = thumbSrc(image, fromSlug)
      const href    = resolveRelative(fromSlug, item.slug!)

      return (
        <a href={href} class="cat-card">
          <div class="cat-card-img">
            {imgSrc
              ? <img src={imgSrc} alt={title} loading="lazy" decoding="async" />
              : <div class="cat-card-img-placeholder" />
            }
          </div>
          <div class="cat-card-caption">{caption}</div>
        </a>
      )
    }

    return (
      <div class="category-content">
                <h1 class="category-page-title">{capitalize(cat)}</h1>
        <HeroCard item={hero} />
        {rest.length > 0 && (
          <div class="cat-cards">
            {rest.map((item) => <ItemCard item={item} />)}
          </div>
        )}
      </div>
    )
  }

  CategoryContent.css = style
  return CategoryContent
}) satisfies QuartzComponentConstructor
