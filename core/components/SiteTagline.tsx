import { QuartzComponent, QuartzComponentConstructor } from "../types"
import { siteConfig } from "../util/siteConfig"

const SiteTagline: QuartzComponent = () => {
  const tagline = siteConfig.tagline
  if (!tagline?.trim()) return null
  return <p class="site-tagline">{tagline}</p>
}

SiteTagline.css = `
.site-tagline {
  margin: 0;
  font-size: 0.85em;
  color: var(--gray);
  font-style: italic;
  opacity: 0.85;
}
`

export default (() => SiteTagline) satisfies QuartzComponentConstructor
