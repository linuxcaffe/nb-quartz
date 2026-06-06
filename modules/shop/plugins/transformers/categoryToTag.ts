import { QuartzTransformerPlugin } from "../types"

export const CategoryToTag: QuartzTransformerPlugin = () => ({
  name: "CategoryToTag",
  markdownPlugins() {
    return [
      () => (_tree, file) => {
        const fm = file.data.frontmatter
        if (!fm) return
        const category = fm["category"] as string | undefined
        if (!category) return
        const tags = (fm["tags"] as string[] | undefined) ?? []
        if (!tags.includes(category)) {
          fm["tags"] = [...tags, category]
        }
      },
    ]
  },
  htmlPlugins() {
    return []
  },
})
