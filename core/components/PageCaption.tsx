import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const PageCaption: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  if (fileData.slug?.startsWith("items/")) return null
  const caption = fileData.frontmatter?.caption as string | undefined
  if (!caption) return null
  return <p class="page-caption">{caption}</p>
}

PageCaption.css = `
.page-caption {
  font-style: italic;
  color: var(--gray);
  font-size: 1.05rem;
  margin: -0.5rem 0 1.25rem;
  line-height: 1.5;
}
`

export default (() => PageCaption) satisfies QuartzComponentConstructor
