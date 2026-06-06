# nb-quartz

Turn any [nb](https://xwmx.github.io/nb/) notebook into a [Quartz v4](https://quartz.jzhao.xyz/) static site, deployed to GitHub Pages via GitHub Actions.

## What it does

- Clones Quartz v4 and configures it for your notebook
- Wires up a two-repo GitHub Actions pipeline (content repo + config repo)
- Runs image optimisation (WebP thumbnails via `sharp`) on every build
- Hides `_meta.md`-style config notes from the public site
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
├── templates/
│   ├── deploy.yml            # GitHub Actions workflow template
│   ├── quartz.config.ts      # Base config placeholders
│   └── quartz.layout.ts      # Base layout with NB_MODULE_* markers
├── core/
│   ├── plugins/filters/      # underscoreFiles.ts
│   └── scripts/              # optimize-images.mjs
├── themes/
│   └── <name>/apply.sh       # Patches config + layout for the theme
├── modules/
│   └── <name>/
│       ├── module.json        # Metadata + layout slot declarations
│       ├── install.sh         # Wires module into a Quartz instance
│       ├── components/        # Quartz TSX components
│       ├── plugins/           # Custom filters/transformers/emitters
│       └── styles/            # Additional SCSS
└── docs/
    └── ARCHITECTURE.md        # Full architecture reference
```

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
