import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

const SiteTagline: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  const tagline = (cfg as any)._siteConfig?.tagline as string | undefined
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
