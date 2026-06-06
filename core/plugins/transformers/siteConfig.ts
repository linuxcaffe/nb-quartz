import { QuartzTransformerPlugin } from "../types"

/**
 * SiteConfig — reads _meta.md frontmatter and attaches it to ctx.cfg
 * as cfg._siteConfig so any component can access site-wide settings.
 *
 * _meta.md is removed from the published site by UnderscoreFiles, but
 * transformers run before filters, so it is available here.
 *
 * Recognised fields (all optional):
 *   tagline     — shown in site header below the page title
 *   description — site-wide meta description fallback
 *   SEO         — additional comma-separated keywords
 */
export const SiteConfig: QuartzTransformerPlugin = () => ({
  name: "SiteConfig",
  markdownPlugins(ctx) {
    return [
      () => (_tree, file) => {
        if (file.data.slug !== "_meta") return
        const fm = file.data.frontmatter ?? {}
        ;(ctx.cfg as any)._siteConfig = {
          tagline:     String(fm["tagline"]     ?? ""),
          description: String(fm["description"] ?? ""),
          seo:         String(fm["SEO"]         ?? ""),
        }
      },
    ]
  },
})
