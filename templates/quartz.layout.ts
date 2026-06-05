import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
// NB_MODULE_IMPORTS

// Components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [Component.PageTitle(), Component.Darkmode()],
  afterBody: [Component.Search()],
  footer: Component.Footer({ links: {} }),
}

// Single-note pages (e.g. a regular note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
    // NB_MODULE_BEFORE_BODY
  ],
  left: [
    Component.MobileOnly(Component.Spacer()),
    Component.DesktopOnly(Component.Explorer()),
    // NB_MODULE_LEFT
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.DesktopOnly(Component.Backlinks()),
    // NB_MODULE_RIGHT
  ],
}

// List/index pages (e.g. tag pages, folder indexes)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    // NB_MODULE_LIST_BEFORE_BODY
  ],
  left: [
    Component.MobileOnly(Component.Spacer()),
    Component.DesktopOnly(Component.Explorer()),
  ],
  right: [],
}
