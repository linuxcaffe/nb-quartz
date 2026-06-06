# nb-quartz Architecture

## Vision

nb-quartz turns any [nb](https://xwmx.github.io/nb/) notebook into a
[Quartz v4](https://quartz.jzhao.xyz/) static site, deployed to GitHub Pages
via a two-repo GitHub Actions pipeline.

The core is deliberately generic — a clean Quartz installation with all
standard features intact (Explorer, Graph, Backlinks, full-text search,
wikilinks, tags). Optional **modules** extend it for specific use cases.
The shop module (extracted from preciousfinds.ca) is the reference
implementation.

---

## Two-Repo Pattern

```
github.com/<user>/<notebook>        ← nb notebook (content, images, notes)
github.com/<user>/<notebook>-site   ← nb-quartz config (this repo pattern)
```

- The notebook repo is managed entirely by `nb sync` — no manual git.
- The site repo holds Quartz config, custom components, and the Actions workflow.
- On every push to `main` (or on a 30-min schedule), Actions checks out both
  repos, runs the build, and deploys to Pages.

This separation keeps content and presentation independent. The notebook
can be edited from nb-web, the terminal, or any nb client without touching
the Quartz config.

---

## Directory Structure

```
nb-quartz/
├── setup.sh                    # Interactive setup — creates a new site repo
├── templates/
│   ├── deploy.yml              # GitHub Actions workflow template
│   ├── quartz.config.ts        # Base Quartz config (SITE_TITLE, BASE_URL placeholders)
│   └── quartz.layout.ts        # Base layout — all standard Quartz components
├── themes/
│   └── <name>/
│       ├── apply.sh            # Patches config + layout for this theme
│       └── custom.scss         # Theme-specific CSS variables and overrides
├── modules/
│   └── <name>/
│       ├── module.json         # Module metadata and layout slot declarations
│       ├── components/         # Quartz TSX components
│       ├── plugins/            # Custom filters, transformers, emitters
│       ├── styles/             # Additional SCSS
│       └── install.sh          # Wires module into a Quartz instance
└── docs/
    └── ARCHITECTURE.md         # This file
```

---

## Modules

A module is a self-contained extension that adds functionality to the base
Quartz install. Modules are installed at setup time; `setup.sh` generates
the final `quartz.layout.ts` from the base template plus each module's
layout declarations.

### module.json

```json
{
  "name": "shop",
  "description": "Vintage shop — item listings, categories, image gallery",
  "version": "1.0.0",
  "components": ["ShopHome", "ShopNav", "ItemGrid", "ItemGallery", "ItemMeta",
                 "CategoryContent", "FeaturedItem", "TagFeed"],
  "plugins": {
    "filters":      ["shopStatus", "underscoreFiles"],
    "transformers": ["categoryToTag"],
    "emitters":     ["categoryPage"]
  },
  "layout": {
    "header":    ["ShopNav"],
    "left":      [],
    "right":     [],
    "beforeBody": ["FeaturedItem"],
    "pageBody":  ["ShopHome", "ItemGrid", "ItemGallery", "ItemMeta",
                  "CategoryContent", "TagFeed"]
  }
}
```

### Layout Merging

`quartz.layout.ts` is a TypeScript file generated at setup time — not
edited by hand. `setup.sh` builds it by:

1. Starting from `templates/quartz.layout.ts` (base slots, standard components)
2. For each installed module, reading `module.json` layout declarations
3. Appending component imports and slot entries in declaration order
4. Writing the final file into the Quartz instance

Build-time merge keeps things simple: no runtime magic, no Quartz internals
modified, and the generated file is readable and auditable.

Multiple modules can add to the same slot; order is determined by the
order modules are listed in setup. Conflicts (two modules claiming the
same exclusive slot) are caught at setup time with a clear error.

---

## Core Plugins

These filters live in nb-quartz core because they apply to any nb-based site:

| Plugin | Type | Purpose |
|--------|------|---------|
| `draft` | filter | Hide notes with `draft: true` frontmatter |
| `underscoreFiles` | filter | Hide `_meta.md`-style config notes from the site |

Shop-specific plugins (`shopStatus`, `categoryToTag`, `categoryPage`) live
in the shop module.

---

## Image Optimization

Part of core. The Actions workflow runs `scripts/optimize-images.mjs`
(using `sharp`) before the Quartz build, generating:

- `{name}-thumb.webp` — 480 px wide, quality 80 (grids, strips)
- `{name}.webp`       — 1200 px wide, quality 85 (galleries, heroes)

Source images (jpg/png) in the notebook's `images/` folder are left
unchanged. Already-optimized files are skipped via mtime comparison.
A GitHub Actions cache keyed on source image hashes avoids redundant
processing across builds.

---

## Themes

A theme customises fonts, colours, and layout pruning without touching
Quartz internals. `apply.sh` patches `quartz.config.ts` and `quartz.layout.ts`
via sed; `custom.scss` sets CSS custom properties.

Themes and modules are orthogonal — any theme works with any module
combination.

---

## Setup Flow

```
setup.sh
  ├── Gather inputs (notebook name, GitHub user, site title, base URL,
  │   custom domain, theme, modules)
  ├── Clone Quartz v4 into ~/dev/quartz-<notebook>/
  ├── Install dependencies (npm ci)
  ├── Copy core plugins (draft, underscoreFiles) into quartz/plugins/
  ├── Apply theme (theme/apply.sh)
  ├── For each selected module:
  │   └── module install.sh (copy components + plugins, update layout)
  ├── Generate quartz.layout.ts from base + module declarations
  ├── Write deploy.yml from templates/deploy.yml
  ├── Wire notebook remote (nb sync target)
  └── Push to GitHub, enable Pages
```

---

## nb-web Modules (future)

nb-web (`~/dev/nb-web/`) is the browser-based editing interface for nb notebooks.
It already works with any notebook generically. But some nb-web features are
**notebook-specific** today — the VCF browser appears only in `contacts`, shop
item previews are hardcoded, etc. These are not yet modular.

A full module system requires both sides to be modular:

```
nb-quartz module          nb-web counterpart
─────────────────         ──────────────────────────────────────
components/ plugins/  ↔   custom preview renderers
layout.fragment.ts    ↔   custom toolbar buttons / panels
styles/               ↔   custom list item styling
install.sh            ↔   (no install hook in nb-web yet)
```

### Proposed nb-web module interface

A nb-web module would be a JS file loaded conditionally when a matching
notebook is active. It would register against a set of extension points:

```javascript
NbWeb.registerModule('shop', {
  notebooks: ['preciousfinds.ca'],          // activate for these notebooks
  previewRenderer: _renderShopItem,         // replaces/extends renderPreview()
  toolbarButtons: [{ id: 'vcf', ... }],     // injected into list panel toolbar
  listExcerpt: _shopItemExcerpt,            // custom excerpt logic for list items
  addFormExtras: _shopAddFormFields,        // extra fields in the Add note form
})
```

nb-web would call the registered hooks at the right points in its render
pipeline. The core remains generic; modules opt in to the extension points
they need.

### What this enables

- `shop` module: item preview, VCF browser, contacts excerpt (phone/email)
- `docs` module: doc-specific navigation, link checking, publish status
- Any module can add toolbar buttons, preview renderers, or list decorations
  scoped to the notebooks it declares

### Current state

Not started. The nb-web extension points don't exist yet. Existing
notebook-specific features (VCF browser, contact excerpts, shop previews)
are hardcoded and would need refactoring into the first module.

---

## Relationship to nb-website

nb-website (`~/dev/nb-website/`) was the first iteration — built
specifically for preciousfinds.ca with shop assumptions baked in.
nb-quartz is the generalisation: core first, shop as a module.

preciousfinds.ca will eventually migrate to nb-quartz + shop module,
validating the module system. Until then it runs as a standalone site.

---

## Status

| Phase | Status |
|-------|--------|
| 1 — nb-quartz core | ✅ Working |
| 2 — Module interface | ✅ Working (shop is reference implementation) |
| 3 — Shop module extraction | ✅ Validated against preciousfinds.ca notebook |
| preciousfinds.ca migration | ⏳ Pending — warm-vintage theme + metadata gaps (see below) |

### Known gaps (found during test)

**`_meta.md` not wired to site metadata** — `setup.sh` creates `_meta.md` in the
notebook with `tagline`, `description`, and `SEO` fields, but no component
reads them yet. Site title comes from `quartz.config.ts` (set at setup time);
the tagline and description fields in `_meta.md` are currently inert.
A future `SiteConfig` transformer or emitter should read `_meta.md` and inject
these into Quartz's page metadata and the site header at build time.

**WebP source images produce low-res variants** — `optimize-images.mjs` skips
files whose output is already newer than the source, but if the source itself
is a `.webp` (e.g. `Jacket1.webp`), sharp generates a 480 px thumbnail from it
which may look soft if the source was already compressed. In practice all
notebook images will be full-resolution jpg/png; `.webp` sources are an edge
case not worth guarding against.
