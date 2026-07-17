# nb-quartz

Turn any [nb](https://xwmx.github.io/nb/) notebook into a [Quartz v4](https://quartz.jzhao.xyz/) static site, deployed to GitHub Pages via GitHub Actions.

## What it does

- Clones Quartz v4 and configures it for your notebook
- Wires up a two-repo GitHub Actions pipeline (content repo + config repo)
- Reads `_meta.md` for site-wide config (tagline, footer, social links) — hidden from the public site
- Optimises images to WebP (480 px thumbs + 1200 px full) via `sharp` — notebook is never written to
- Rebuilds automatically on every push, or every 30 minutes to pick up `nb sync` changes

Optional **modules** extend the base install for specific use cases (e.g. vintage shop, portfolio). The shop module is the reference implementation.

## Prerequisites

- [nb](https://xwmx.github.io/nb/) — at least one notebook
- [gh](https://cli.github.com/) — authenticated (`gh auth login`)
- Node.js v22+ (or [nvm](https://github.com/nvm-sh/nvm))
- git

## Quick start

```bash
git clone https://github.com/linuxcaffe/nb-quartz.git ~/dev/nb-quartz
cd ~/dev/nb-quartz
./setup.sh
```

`setup.sh` is interactive — it asks for your notebook name, site title, domain, theme, and modules, confirms, then builds everything.

## Two-repo pattern

```
github.com/<user>/<notebook>       ← nb notebook (content, managed by nb sync)
github.com/<user>/<notebook>-site  ← Quartz config (this repo pattern)
```

Content and presentation are fully independent. Edit notes from nb-web, the terminal, or any nb client — the site rebuilds automatically.

## Modules

A module adds components, plugins, and layout slots for a specific use case. Install at setup time; `setup.sh` wires everything into `quartz.layout.ts` automatically.

| Module | Status | Description |
|--------|--------|-------------|
| shop   | ✅ Ready | Vintage shop — item listings, categories, image gallery |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full module spec.

### Shop module — content conventions

Items live in an `items/` folder in your notebook. Each item is a Markdown note with frontmatter:

| Field | Required | Notes |
|-------|----------|-------|
| `title` | ✅ | Item name |
| `category` | ✅ | Groups items into nav links and category pages |
| `status` | ✅ | `available` or `sold` — other values hide the item |
| `image` | — | Filename(s) from `images/`, comma-separated for galleries |
| `price` | — | Displayed as-is (e.g. `$24.00`) |
| `description` | — | Short text shown in featured cards and item page |
| `condition` | — | e.g. `Excellent`, `Good`, `As-is` |
| `size` | — | Free text |
| `shipping` | — | e.g. `Canada Post, ~$8` |
| `platform` | — | External marketplace name (e.g. `Etsy`) |
| `listing` | — | URL to external listing (shown as "View on Platform →") |
| `qtty` | — | Quantity, shown as `×2` |

Tag any item `featured` to include it in the rotating featured section on the home page. Non-item pages with a `with_tags:` list appear as named sections in the shop nav and home page.

## Directory layout

```
nb-quartz/
├── setup.sh                  # Interactive setup
├── build.sh                  # Local build wrapper (installed into each site)
├── templates/
│   ├── deploy.yml            # GitHub Actions workflow template
│   ├── build.sh              # build wrapper template
│   ├── quartz.config.ts      # Base config placeholders
│   └── quartz.layout.ts      # Base layout with NB_MODULE_* markers
├── core/
│   ├── components/           # SiteTagline, SiteFooter, PageCaption, PageFootnote
│   ├── plugins/filters/      # underscoreFiles.ts
│   ├── scripts/              # optimize-images.mjs
│   ├── styles/               # siteFooter.scss
│   └── util/                 # siteConfig.ts (reads _meta.md at build time)
├── themes/
│   └── <name>/apply.sh       # Patches config + layout for the theme
├── modules/
│   └── <name>/
│       ├── module.json        # Metadata + layout slot declarations
│       ├── install.sh         # Wires module into a Quartz instance
│       ├── components/        # Quartz TSX components (incl. imageUtils.ts)
│       ├── plugins/           # Custom filters/transformers/emitters
│       └── styles/            # Additional SCSS
└── docs/
    └── ARCHITECTURE.md        # Full architecture reference
```

## Site configuration — `_meta.md`

Create a note called `_meta.md` at the root of your notebook (or let `setup.sh` create a blank one). It is never published — the `_` prefix hides it. Fields are read at build time by `quartz/util/siteConfig.ts`:

| Field | Purpose |
|-------|---------|
| `tagline` | Shown in the site header below the page title |
| `description` | Site-wide meta description for search engines |
| `SEO` | Additional comma-separated keywords |
| `footer` | Footer text — inline markdown supported (`**bold**`, `[links](url)`, `[[wikilinks]]`), multi-line YAML block (`\|`) for multiple lines |
| `copyright` | Copyright line fallback when `footer` is not set |
| `instagram` | Handle only — linked as `instagram.com/<handle>` |
| `ebay` | Username — linked as `ebay.ca/usr/<name>` |
| `etsy` | Shop name — linked as `etsy.com/shop/<name>` |

Individual pages can also use `caption:` (shown below the title) and `footnote:` (shown at the bottom of the page) frontmatter fields.

## Image optimisation

nb-quartz treats the notebook directory as **read-only**. Source images stay in your notebook; optimised WebP variants are generated into `image-cache/` inside the Quartz config directory and never written back to the notebook.

```
~/.nb/<notebook>/images/   ← source JPGs (read-only)
~/dev/quartz-<site>/
  image-cache/             ← generated WebP (gitignored)
  public/images/           ← final output: source + WebP copied here at build time
```

**Local builds:** use `./build.sh` instead of `npx quartz build` directly.

```bash
./build.sh           # optimise → build → copy cache
./build.sh --serve   # same, then start dev server on :8080
```

**GitHub Actions:** `deploy.yml` caches `image-cache/` by source image hash so Sharp only runs when images actually change.

Shop components automatically serve `-thumb.webp` (480 px) for cards and grids, `.webp` (1200 px) for gallery heroes. The result is typically 10–50× smaller payloads than serving original camera JPEGs.

## Vanilla Quartz compatibility

nb-quartz is a thin layer on top of a standard Quartz v4 install. The `quartz.config.ts` and `quartz.layout.ts` files are the same ones the [Quartz docs](https://quartz.jzhao.xyz/) describe. Any built-in Quartz plugin or component works without modification — just add it to those files as you normally would:

```typescript
// quartz.config.ts — add any built-in plugin:
Plugin.Breadcrumbs(),
Plugin.TagPage(),    // already included by default

// quartz.layout.ts — add any built-in component:
Component.Graph(),
Component.TableOfContents(),
Component.Backlinks(),
Component.Explorer(),
```

The base layout (`templates/quartz.layout.ts`) keeps all standard Quartz sidebar components intact. The **shop module** replaces the layout with a sidebar-free version appropriate for a storefront — if you want Quartz features alongside shop pages, add them back into `quartz.layout.ts` directly after install.

## Pitfalls

**`content/` symlink** — If your existing Quartz install has `content/` as a
symlink to the live notebook directory (a common local dev pattern), `rm -rf
content/` with a trailing slash follows the symlink and **deletes the notebook
contents**. `setup.sh` detects this and uses `rm -f` on the symlink only, but
if you ever clean a Quartz install manually, use `rm -f content` (no trailing
slash) not `rm -rf content/`.

**Test installs and the live site** — `setup.sh` keys the local Quartz
directory on the *site repo name* (`~/dev/quartz-<SITE_REPO>`), not the
notebook name. Use a distinct site repo name for test runs (e.g.
`pf-quartz-test`) so the test never touches your live Quartz install.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete design: two-repo pattern, module system, layout merging, image optimisation, themes, and the planned nb-web counterpart.
