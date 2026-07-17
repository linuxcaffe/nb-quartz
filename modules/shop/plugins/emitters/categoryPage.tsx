import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { defaultProcessedContent } from "../vfile"
import { FullPageLayout } from "../../cfg"
import { FullSlug, joinSegments, pathToRoot } from "../../util/path"
import { defaultContentPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { CategoryContent, ShopNav } from "../../components"
import { write } from "./helpers"
import { BuildCtx } from "../../util/ctx"
import { StaticResources } from "../../util/resources"

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const CategoryPage: QuartzEmitterPlugin = () => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    beforeBody: [ShopNav()],
    pageBody: CategoryContent(),
    afterBody: [],
    left: defaultContentPageLayout.left,
    right: [],
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  const plugin = {
    name: "CategoryPage",
    getQuartzComponents() {
      return [
        Head,
        Header,
        Body,
        ...header,
        ...beforeBody,
        pageBody,
        ...afterBody,
        ...left,
        ...right,
        Footer,
      ]
    },
    async *emit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)
      const cfg = ctx.cfg.configuration

      const categories = new Set<string>()
      for (const f of allFiles) {
        if (!f.slug?.startsWith("items/")) continue
        const status = f.frontmatter?.status as string | undefined
        if (status && status !== "available") continue
        const cat = f.frontmatter?.category as string | undefined
        if (cat) categories.add(cat)
      }

      for (const cat of categories) {
        const slug = joinSegments("category", cat) as FullSlug
        const [tree, file] = defaultProcessedContent({
          slug,
          frontmatter: { title: capitalize(cat), tags: [] },
        })
        const externalResources = pageResources(pathToRoot(slug), resources)
        const componentData: QuartzComponentProps = {
          ctx,
          fileData: file.data,
          externalResources,
          cfg,
          children: [],
          tree,
          allFiles,
        }
        const pageContent = renderPage(cfg, slug, componentData, opts, externalResources)
        yield write({ ctx, content: pageContent, slug, ext: ".html" })
      }
    },
    async *partialEmit(ctx, content, resources, _changeEvents) {
      yield* plugin.emit(ctx, content, resources)
    },
  }
  return plugin
}
