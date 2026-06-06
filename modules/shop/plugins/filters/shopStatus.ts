import { QuartzFilterPlugin } from "../types"

const PUBLISH_STATUSES = new Set(["available", "sold"])

export const ShopStatus: QuartzFilterPlugin<{}> = () => ({
  name: "ShopStatus",
  shouldPublish(_ctx, [_tree, vfile]) {
    // Only applies to shop items — pages use draft: true (RemoveDrafts) instead
    if (!vfile.data?.filePath?.includes("/items/")) return true
    const status = vfile.data?.frontmatter?.status
    if (!status) return true
    return PUBLISH_STATUSES.has(String(status).toLowerCase().trim())
  },
})
