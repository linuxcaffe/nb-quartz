import { QuartzFilterPlugin } from "../types"

// Exclude any file whose basename starts with "_" (e.g. _meta.md, _config.md).
// This makes the _ prefix convention self-enforcing — no need for draft: true.
export const UnderscoreFiles: QuartzFilterPlugin<{}> = () => ({
  name: "UnderscoreFiles",
  shouldPublish(_ctx, [_tree, vfile]) {
    const slug = vfile.data?.slug ?? ""
    const basename = slug.split("/").pop() ?? ""
    return !basename.startsWith("_")
  },
})
