import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { QuartzPluginData } from "../../plugins/vfile"
import { resolveRelative, FullSlug } from "../../util/path"
import { classNames } from "../../util/lang"
// @ts-ignore
import style from "../styles/shopHome.scss"
import { thumbSrc, fullSrc } from "./imageUtils"

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default (() => {
  const ShopHome: QuartzComponent = ({ allFiles, fileData, displayClass }: QuartzComponentProps) => {
    if (!allFiles) return null
    const fromSlug = fileData.slug!

    // Active = available or no status
    const active = allFiles.filter((f) => {
      if (!f.slug?.startsWith("items/")) return false
      const status = f.frontmatter?.status as string | undefined
      return !status || status === "available"
    })

    // Newest first
    const byDate = [...active].sort(
      (a, b) => (b.dates?.created?.getTime() ?? 0) - (a.dates?.created?.getTime() ?? 0),
    )

    // Dynamic categories — in order of first appearance (newest item first)
    const categories: string[] = []
    byDate.forEach((f) => {
      const cat = f.frontmatter?.category as string | undefined
      if (cat && !categories.includes(cat)) categories.push(cat)
    })

    // Tag-feed pages — any non-item page with with_tags: frontmatter
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

    // Featured items (active + "featured" tag)
    const featured = active.filter((f) => {
      const tags = (f.frontmatter?.tags as string[]) ?? []
      return tags.includes("featured")
    })

    function StripCard({ item }: { item: QuartzPluginData }) {
      const fm = item.frontmatter ?? {}
      const title = (fm["title"] as string) ?? ""
      const caption = (fm["caption"] as string) ?? title
      const image = fm["image"] as string | undefined
      const imgSrc = thumbSrc(image, fromSlug)
      const href = resolveRelative(fromSlug, item.slug!)

      return (
        <a href={href} class="strip-card">
          <div class="strip-card-img">
            {imgSrc ? (
              <img src={imgSrc} alt={title} loading="lazy" decoding="async" />
            ) : (
              <div class="strip-card-img-placeholder" />
            )}
          </div>
          <div class="strip-card-caption">{caption}</div>
        </a>
      )
    }

    function Strip({ items }: { items: QuartzPluginData[] }) {
      return (
        <div class="shop-strip-wrap" data-strip-wrap="1">
          <button class="strip-arrow strip-prev" data-strip-prev="1" aria-label="Previous" hidden>
            ‹
          </button>
          <div class="shop-strip" data-strip="1">
            {items.map((item) => (
              <StripCard item={item} />
            ))}
          </div>
          <button class="strip-arrow strip-next" data-strip-next="1" aria-label="Next">
            ›
          </button>
        </div>
      )
    }

    return (
      <div class={classNames(displayClass, "shop-home")}>
        {/* ── Featured ─────────────────────────────────────── */}
        {featured.length > 0 && (
          <section class="shop-featured">
            <h2 class="shop-section-heading">Featured</h2>
            <div class="featured-list" data-featured-list="1">
              {featured.map((item, i) => {
                const fm = item.frontmatter ?? {}
                const title = (fm["title"] as string) ?? ""
                const caption = fm["caption"] as string | undefined
                const price = fm["price"] as string | undefined
                const qtty = fm["qtty"] as string | undefined
                const image = fm["image"] as string | undefined
                const imgSrc = fullSrc(image, fromSlug)
                const href = resolveRelative(fromSlug, item.slug!)

                const description = fm["description"] as string | undefined
                const condition   = fm["condition"] as string | undefined
                const size        = fm["size"]      as string | undefined
                const shipping    = fm["shipping"]  as string | undefined
                const status      = fm["status"] as string | undefined
                const platform    = fm["platform"] as string | undefined
                const listing     = fm["listing"] as string | undefined

                const statusLabel =
                  status === "available" ? "Available"
                  : status === "sold"    ? "Sold"
                  : status               ?? ""

                return (
                  <div
                    class={`featured-card${i > 0 ? " featured-card--hidden" : ""}`}
                    data-featured-item="1"
                  >
                    <a href={href} class="featured-card-title">{title}</a>
                    <a href={href} class="featured-card-img-wrap">
                      {imgSrc ? (
                        <img src={imgSrc} alt={title} loading="eager" decoding="async" />
                      ) : (
                        <div class="featured-card-img-placeholder" />
                      )}
                    </a>
                    {featured.length > 1 && (
                      <button
                        class="featured-next"
                        data-featured-next="1"
                        aria-label="Next featured item"
                      >
                        ›
                      </button>
                    )}
                    {caption && (
                      <a href={href} class="featured-card-caption">{caption}</a>
                    )}
                    {description && (
                      <a href={href} class="featured-card-description">{description}</a>
                    )}
                    {(size || condition || shipping) && (
                      <div class="featured-card-specs">
                        {size      && <p class="featured-card-size">{size}</p>}
                        {condition && <p class="featured-card-condition">{condition}</p>}
                        {shipping  && <p class="featured-card-shipping">{shipping}</p>}
                      </div>
                    )}
                    <div class="featured-card-footer">
                      {qtty && <span class="featured-card-qtty">×{String(qtty)}</span>}
                      {status && (
                        <span class={`featured-card-badge featured-card-badge--${status}`}>
                          {statusLabel}
                        </span>
                      )}
                      {price && <span class="featured-card-price">{String(price)}</span>}
                      {platform && listing
                        ? <a class="featured-card-platform" href={String(listing)} target="_blank" rel="noopener noreferrer">
                            View on {String(platform)} →
                          </a>
                        : platform
                        ? <span class="featured-card-platform">{String(platform)}</span>
                        : null
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Tag-feed sections (New Arrivals, Vintage, etc.) ─ */}
        {tagFeedPages.map((page) => {
          const pageTags: string[] = (() => {
            const raw = page.frontmatter?.with_tags
            if (!raw) return []
            return (Array.isArray(raw) ? raw : [raw]).map(String)
          })()
          const pageItems = byDate.filter((f) => {
            const itemTags: string[] = (f.frontmatter?.tags as string[]) ?? []
            return pageTags.some((t) => itemTags.includes(t))
          })
          if (pageItems.length === 0) return null
          const title = (page.frontmatter?.title as string) ?? page.slug ?? ""
          return (
            <section class="shop-section" id={`feed-${page.slug}`}>
              <h2 class="shop-section-heading">
                <a href={resolveRelative(fromSlug, page.slug!)}>{title}</a>
              </h2>
              <Strip items={pageItems} />
            </section>
          )
        })}

        {/* ── Category sections ────────────────────────────── */}
        {categories.map((cat) => {
          const catItems = byDate.filter(
            (f) => (f.frontmatter?.category as string) === cat,
          )
          return (
            <section class="shop-section" id={`category-${cat}`}>
              <h2 class="shop-section-heading">
                <a href={resolveRelative(fromSlug, `category/${cat}` as FullSlug)}>{capitalize(cat)}</a>
              </h2>
              <Strip items={catItems} />
            </section>
          )
        })}
      </div>
    )
  }

  ShopHome.css = style

  ShopHome.afterDOMLoaded = `
    function initShopHome() {
      // Scroll strips
      document.querySelectorAll('[data-strip-wrap]').forEach(wrap => {
        if (wrap.dataset.stripInit) return
        wrap.dataset.stripInit = '1'

        const strip = wrap.querySelector('[data-strip]')
        const btnL = wrap.querySelector('[data-strip-prev]')
        const btnR = wrap.querySelector('[data-strip-next]')
        if (!strip) return

        function updateArrows() {
          const atStart = strip.scrollLeft < 2
          const atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2
          if (btnL) btnL.hidden = atStart
          if (btnR) btnR.hidden = atEnd
        }

        strip.addEventListener('scroll', updateArrows, { passive: true })
        updateArrows()

        const scrollAmt = () => strip.clientWidth * 0.8
        btnL?.addEventListener('click', () => strip.scrollBy({ left: -scrollAmt(), behavior: 'smooth' }))
        btnR?.addEventListener('click', () => strip.scrollBy({ left:  scrollAmt(), behavior: 'smooth' }))
      })

      // Featured cycling
      const featList = document.querySelector('[data-featured-list]')
      if (featList && !featList.dataset.featuredInit) {
        featList.dataset.featuredInit = '1'
        const items = Array.from(featList.querySelectorAll('[data-featured-item]'))
        let idx = 0
        featList.querySelectorAll('[data-featured-next]').forEach(btn => {
          btn.addEventListener('click', () => {
            items[idx].classList.add('featured-card--hidden')
            idx = (idx + 1) % items.length
            items[idx].classList.remove('featured-card--hidden')
          })
        })
      }
    }

    document.addEventListener('nav', initShopHome)
    initShopHome()
  `

  return ShopHome
}) satisfies QuartzComponentConstructor
