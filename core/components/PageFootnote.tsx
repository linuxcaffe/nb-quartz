import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

// Parse inline markdown: *em*, **strong**, [text](url), [[wikilink]]
export function parseInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)]+)\)|\[\[([^\]]+)\]\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1] !== undefined)      parts.push(<strong>{m[1]}</strong>)
    else if (m[2] !== undefined) parts.push(<em>{m[2]}</em>)
    else if (m[4] !== undefined) parts.push(<a href={m[4]}>{m[3]}</a>)
    else {
      const title = m[5]
      const slug = title.toLowerCase().replace(/\s+/g, "-")
      parts.push(<a href={slug}>{title}</a>)
    }
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

const PageFootnote: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  if (fileData.slug?.startsWith("items/")) return null
  const footnote = fileData.frontmatter?.footnote as string | undefined
  if (!footnote) return null
  return <p class="page-footnote">{parseInline(footnote)}</p>
}

PageFootnote.css = `
.page-footnote {
  font-style: italic;
  color: var(--gray);
  font-size: 0.88rem;
  border-top: 1px solid var(--lightgray);
  padding-top: 0.9rem;
  margin-top: 2rem;
}
`

export default (() => PageFootnote) satisfies QuartzComponentConstructor
