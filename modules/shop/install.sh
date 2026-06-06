#!/usr/bin/env bash
# shop module install.sh
# Called by nb-quartz setup.sh as: bash install.sh <QUARTZ_DIR> <MOD_DIR>
#
# Wires the shop module into a fresh Quartz installation:
#   1. Copies components, plugins, and styles
#   2. Registers exports in plugin/component barrels
#   3. Adds shop plugins to quartz.config.ts
#   4. Writes the shop-specific quartz.layout.ts

set -euo pipefail

QUARTZ_DIR="$1"
MOD_DIR="$2"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓ $*${NC}"; }
info() { echo -e "${BLUE}  → $*${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $*${NC}"; }

# ── 1. Copy source files ──────────────────────────────────────────────────────

info "Copying shop components..."
mkdir -p "${QUARTZ_DIR}/quartz/components/shop"
cp "${MOD_DIR}/components/"* "${QUARTZ_DIR}/quartz/components/shop/"

info "Copying shop plugins..."
cp "${MOD_DIR}/plugins/filters/shopStatus.ts"           "${QUARTZ_DIR}/quartz/plugins/filters/"
cp "${MOD_DIR}/plugins/transformers/categoryToTag.ts"   "${QUARTZ_DIR}/quartz/plugins/transformers/"
cp "${MOD_DIR}/plugins/emitters/categoryPage.tsx"       "${QUARTZ_DIR}/quartz/plugins/emitters/"

info "Copying shop styles..."
cp "${MOD_DIR}/styles/"*.scss "${QUARTZ_DIR}/quartz/components/styles/"

ok "Files copied"

# ── 2. Register component exports ────────────────────────────────────────────

COMP_INDEX="${QUARTZ_DIR}/quartz/components/index.ts"

if ! grep -q "shop/ShopNav" "$COMP_INDEX"; then
  cat >> "$COMP_INDEX" << 'EOF'

// ── shop module ────────────────────────────────────────────────────────────────
import CategoryContent from "./shop/CategoryContent"
import FeaturedItem from "./shop/FeaturedItem"
import ItemCategory from "./shop/ItemCategory"
import ItemGallery from "./shop/ItemGallery"
import ItemGrid from "./shop/ItemGrid"
import ItemMeta from "./shop/ItemMeta"
import ShopHome from "./shop/ShopHome"
import ShopNav from "./shop/ShopNav"
import TagFeed from "./shop/TagFeed"

export {
  CategoryContent,
  FeaturedItem,
  ItemCategory,
  ItemGallery,
  ItemGrid,
  ItemMeta,
  ShopHome,
  ShopNav,
  TagFeed,
}
EOF
  ok "Components registered in index.ts"
else
  warn "Component exports already present — skipping"
fi

# ── 3. Register plugin exports ────────────────────────────────────────────────

PLUGIN_INDEX="${QUARTZ_DIR}/quartz/plugins/index.ts"

grep -q "ShopStatus"    "$PLUGIN_INDEX" || echo 'export { ShopStatus }    from "./filters/shopStatus"'         >> "$PLUGIN_INDEX"
grep -q "CategoryToTag" "$PLUGIN_INDEX" || echo 'export { CategoryToTag } from "./transformers/categoryToTag"' >> "$PLUGIN_INDEX"
grep -q "CategoryPage"  "$PLUGIN_INDEX" || echo 'export { CategoryPage }  from "./emitters/categoryPage"'      >> "$PLUGIN_INDEX"

ok "Plugin exports registered"

# ── 4. Wire plugins into quartz.config.ts ────────────────────────────────────

CONFIG="${QUARTZ_DIR}/quartz.config.ts"

python3 - "$CONFIG" << 'PYEOF'
import re, sys

path = sys.argv[1]
with open(path, "r") as f:
    text = f.read()

changed = False

# ShopStatus filter — append after UnderscoreFiles()
if "ShopStatus" not in text:
    if "UnderscoreFiles()" in text:
        text = text.replace("Plugin.UnderscoreFiles()", "Plugin.UnderscoreFiles(), Plugin.ShopStatus()")
        changed = True
    else:
        # Fallback: append after RemoveDrafts()
        text = text.replace("Plugin.RemoveDrafts()", "Plugin.RemoveDrafts(), Plugin.ShopStatus()")
        changed = True

# CategoryToTag transformer — append after Description()
if "CategoryToTag" not in text:
    if "Plugin.Description()" in text:
        text = text.replace("Plugin.Description()", "Plugin.Description(),\n      Plugin.CategoryToTag()")
        changed = True

# CategoryPage emitter — append after NotFoundPage()
if "CategoryPage" not in text:
    if "Plugin.NotFoundPage()" in text:
        text = text.replace("Plugin.NotFoundPage()", "Plugin.NotFoundPage(),\n      Plugin.CategoryPage()")
        changed = True

if changed:
    with open(path, "w") as f:
        f.write(text)
    print("  → Plugins wired into quartz.config.ts")
else:
    print("  ⚠ Some plugins may already be present in quartz.config.ts")
PYEOF

# ── 5. Write shop layout ──────────────────────────────────────────────────────

info "Writing shop quartz.layout.ts..."

cat > "${QUARTZ_DIR}/quartz.layout.ts" << 'EOF'
import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [Component.PageTitle(), Component.SiteTagline(), Component.Darkmode()],
  afterBody: [Component.Search()],
  footer: Component.Footer({ links: {} }),
}

export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ShopNav(),
    Component.ArticleTitle(),
    Component.ConditionalRender({
      component: Component.ShopHome(),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ItemGallery(),
    Component.ItemMeta(),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => !page.fileData.slug?.startsWith("items/"),
    }),
    Component.ItemCategory(),
    Component.TagList(),
    Component.TagFeed(),
  ],
  left: [],
  right: [],
}

export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [],
  right: [],
}
EOF

ok "Layout written"
echo ""
echo -e "${GREEN}  Shop module installed.${NC}"
echo "  Items go in: items/<slug>.md"
echo "  Required frontmatter: title, category, status (available|sold)"
echo "  Optional: price, image, description, condition, size, shipping, platform, listing"
echo ""
