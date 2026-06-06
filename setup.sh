#!/usr/bin/env bash
# nb-quartz setup.sh
# Turn any nb notebook into a Quartz v4 static site on GitHub Pages.
#
# Usage: ./setup.sh
#
# Creates:
#   <gh-user>/<notebook>        GitHub repo — nb notebook content (nb sync target)
#   <gh-user>/<notebook>-site   GitHub repo — Quartz config + Actions workflow
#   ~/dev/quartz-<notebook>/    Local Quartz installation

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

NON_GITHUB_REMOTE=false   # set true when notebook is mirrored to GitHub

die()  { echo -e "\n${RED}Error: $*${NC}" >&2; exit 1; }
info() { echo -e "${BLUE}→ $*${NC}"; }
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }
ask()  { echo -en "${BOLD}$* ${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source nvm if available and node is too old / missing
if ! command -v node &>/dev/null || \
   (( $(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1) < 22 )); then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
  command -v nvm &>/dev/null && nvm use 22 --silent 2>/dev/null || true
fi

# ── Prerequisites ─────────────────────────────────────────────────────────────

check_prereqs() {
  local errors=0

  command -v git &>/dev/null || { warn "git not found."; errors=$(( errors + 1 )); }
  command -v nb  &>/dev/null || { warn "nb not found — https://xwmx.github.io/nb/"; errors=$(( errors + 1 )); }

  if ! command -v npm &>/dev/null; then
    warn "npm not found."
    errors=$(( errors + 1 ))
  elif ! command -v node &>/dev/null; then
    warn "Node.js not found."
    errors=$(( errors + 1 ))
  else
    local node_major
    node_major=$(node --version | sed 's/v//' | cut -d. -f1)
    if (( node_major < 22 )); then
      warn "Node.js v22+ required (found v${node_major})."
      echo "    nvm install 22 && nvm use 22"
      errors=$(( errors + 1 ))
    fi
  fi

  if ! command -v gh &>/dev/null; then
    warn "gh (GitHub CLI) not found — https://cli.github.com"
    errors=$(( errors + 1 ))
  elif ! gh auth status &>/dev/null 2>&1; then
    warn "gh not authenticated — run: gh auth login"
    errors=$(( errors + 1 ))
  fi

  (( errors == 0 )) || die "${errors} prerequisite(s) not met."
  ok "Prerequisites satisfied"
}

# ── Inputs ────────────────────────────────────────────────────────────────────

gather_inputs() {
  echo ""
  echo -e "${BOLD}nb-quartz setup${NC} — nb notebook → Quartz → GitHub Pages"
  echo ""

  # Notebook
  ask "nb notebook name (e.g. home, work, myblog):"; read -r NOTEBOOK
  [[ -n "$NOTEBOOK" ]] || die "Notebook name is required."
  NB_DIR="${HOME}/.nb/${NOTEBOOK}"
  [[ -d "$NB_DIR" ]] || die "Notebook '${NOTEBOOK}' not found at ${NB_DIR}.
  Create it first: nb notebooks add ${NOTEBOOK}"

  GH_USER=$(gh api user --jq .login 2>/dev/null) \
    || die "Could not get GitHub username — is gh authenticated?"
  echo "  GitHub user: ${GH_USER}"

  # Site repo name
  local default_site_repo="${NOTEBOOK}-site"
  ask "Quartz config repo name [${default_site_repo}]:"; read -r _input
  SITE_REPO="${_input:-$default_site_repo}"

  # Site identity
  ask "Site title:"; read -r SITE_TITLE
  [[ -n "$SITE_TITLE" ]] || die "Site title is required."

  ask "Custom domain (blank for ${GH_USER}.github.io/${SITE_REPO}):"; read -r CUSTOM_DOMAIN
  BASE_URL="${CUSTOM_DOMAIN:-${GH_USER}.github.io/${SITE_REPO}}"

  # Theme
  local themes=()
  while IFS= read -r -d '' t; do
    themes+=("$(basename "$t")")
  done < <(find "${SCRIPT_DIR}/themes" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null)

  if [[ ${#themes[@]} -gt 0 ]]; then
    echo ""
    echo "  Available themes:"
    for i in "${!themes[@]}"; do
      echo "    $((i+1))) ${themes[$i]}"
    done
    ask "Theme [1]:"; read -r _t
    local idx=$(( ${_t:-1} - 1 ))
    THEME="${themes[$idx]:-${themes[0]}}"
  else
    THEME="default"
    warn "No themes found — skipping theme step."
  fi

  # Modules — only show those with an install.sh (stubs are not ready)
  local modules=()
  while IFS= read -r -d '' m; do
    local mname
    mname="$(basename "$m")"
    [[ -f "${m}/module.json" && -x "${m}/install.sh" ]] && modules+=("$mname")
  done < <(find "${SCRIPT_DIR}/modules" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null)

  SELECTED_MODULES=()
  if [[ ${#modules[@]} -gt 0 ]]; then
    echo ""
    echo "  Available modules (space-separated numbers, blank for none):"
    for i in "${!modules[@]}"; do
      local desc
      desc=$(python3 -c "import json; d=json.load(open('${SCRIPT_DIR}/modules/${modules[$i]}/module.json')); print(d.get('description',''))" 2>/dev/null || echo "")
      echo "    $((i+1))) ${modules[$i]}  —  ${desc}"
    done
    ask "Modules to install [none]:"; read -r _mods
    for num in $_mods; do
      local midx=$(( num - 1 ))
      [[ -n "${modules[$midx]:-}" ]] && SELECTED_MODULES+=("${modules[$midx]}")
    done
  fi

  # Paths — keyed on site repo name so multiple sites from the same notebook don't collide
  QUARTZ_DIR="${HOME}/dev/quartz-${SITE_REPO}"

  # Confirm
  echo ""
  echo "  Notebook:   ${NB_DIR}"
  echo "  Quartz:     ${QUARTZ_DIR}"
  echo "  Content:    github.com/${GH_USER}/${NOTEBOOK}"
  echo "  Site repo:  github.com/${GH_USER}/${SITE_REPO}"
  echo "  URL:        https://${BASE_URL}"
  echo "  Theme:      ${THEME}"
  echo "  Modules:    ${SELECTED_MODULES[*]:-none}"
  echo ""

  ask "Add example content to get you started? [Y/n]:"; read -r _ex
  STARTER_CONTENT=true
  [[ "$_ex" =~ ^[Nn]$ ]] && STARTER_CONTENT=false

  ask "Proceed? [y/N]:"; read -r _yn
  [[ "$_yn" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
  echo ""
}

# ── Notebook remote ───────────────────────────────────────────────────────────

ensure_notebook_remote() {
  info "Checking notebook GitHub remote..."
  local remote
  remote=$(git -C "$NB_DIR" remote get-url origin 2>/dev/null || echo "")

  # GitHub Actions checkout requires a GitHub-hosted repo.
  # If the notebook already has a non-GitHub remote (e.g. Codeberg, self-hosted),
  # add a second remote 'github' pointing to a new GitHub repo.
  if [[ -z "$remote" ]]; then
    warn "No remote set for notebook '${NOTEBOOK}'."
    info "Creating GitHub repo ${GH_USER}/${NOTEBOOK}..."
    gh repo create "${GH_USER}/${NOTEBOOK}" --public \
      --description "${SITE_TITLE} — nb notebook content"
    git -C "$NB_DIR" remote add origin "git@github.com:${GH_USER}/${NOTEBOOK}.git"
    git -C "$NB_DIR" push -u origin HEAD
    ok "Notebook repo created: github.com/${GH_USER}/${NOTEBOOK}"
  elif echo "$remote" | grep -q "github.com"; then
    ok "Notebook remote (GitHub): ${remote}"
    git -C "$NB_DIR" push -u origin HEAD 2>/dev/null || true
  else
    warn "Notebook remote is not GitHub: ${remote}"
    warn "The Actions workflow requires the notebook to be on GitHub."
    echo ""
    ask "Create a GitHub repo for this notebook alongside the existing remote? [y/N]:"; read -r _yn
    [[ "$_yn" =~ ^[Yy]$ ]] || die "Aborted. Mirror the notebook to GitHub first, then re-run."

    # Create repo if it doesn't exist; if it does, ensure it's public
    if gh repo view "${GH_USER}/${NOTEBOOK}" &>/dev/null 2>&1; then
      local is_private
      is_private=$(gh repo view "${GH_USER}/${NOTEBOOK}" --json isPrivate --jq '.isPrivate')
      if [[ "$is_private" == "true" ]]; then
        warn "github.com/${GH_USER}/${NOTEBOOK} exists but is private — making it public..."
        gh repo edit "${GH_USER}/${NOTEBOOK}" --visibility public
      fi
      ok "Using existing GitHub repo: github.com/${GH_USER}/${NOTEBOOK}"
    else
      info "Creating GitHub repo ${GH_USER}/${NOTEBOOK}..."
      gh repo create "${GH_USER}/${NOTEBOOK}" --public \
        --description "${SITE_TITLE} — nb notebook content"
    fi

    # Add as a second remote named 'github' so the original remote is undisturbed
    if ! git -C "$NB_DIR" remote get-url github &>/dev/null; then
      git -C "$NB_DIR" remote add github "git@github.com:${GH_USER}/${NOTEBOOK}.git"
    fi
    git -C "$NB_DIR" push github HEAD:"${NOTEBOOK}"
    ok "Notebook mirrored to github.com/${GH_USER}/${NOTEBOOK} (branch: ${NOTEBOOK})"
    NON_GITHUB_REMOTE=true
  fi

  NOTEBOOK_REPO="${GH_USER}/${NOTEBOOK}"
  NOTEBOOK_BRANCH="${NOTEBOOK}"
}

# ── Quartz clone + config ─────────────────────────────────────────────────────

setup_quartz() {
  if [[ -d "$QUARTZ_DIR" ]]; then
    warn "${QUARTZ_DIR} already exists — skipping clone."
  else
    info "Cloning Quartz v4 (shallow)..."
    git clone --branch v4 --single-branch --depth 1 \
      https://github.com/jackyzha0/quartz.git "$QUARTZ_DIR"
  fi

  cd "$QUARTZ_DIR"
  info "Installing dependencies (this takes a minute)..."
  npm ci --quiet

  info "Patching quartz.config.ts..."
  sed -i "s|pageTitle: \".*\"|pageTitle: \"${SITE_TITLE}\"|" quartz.config.ts
  sed -i "s|baseUrl: \".*\"|baseUrl: \"${BASE_URL}\"|" quartz.config.ts
  # Remove content/ without following symlinks.
  # TRAP: `rm -rf content/` with a trailing slash follows a symlink to its
  # target. If content/ points at the live notebook (~/.nb/<notebook>/),
  # that silently destroys the entire notebook. Always check first.
  if [[ -L "content" ]]; then
    warn "content/ is a symlink — removing link only, target is safe"
    rm -f "content"
  else
    rm -rf "content"
  fi

  ok "Quartz configured"
}

# ── Core assets ───────────────────────────────────────────────────────────────

install_core() {
  info "Installing core plugins and scripts..."

  # UnderscoreFiles filter — hides _meta.md-style config notes
  cp "${SCRIPT_DIR}/core/plugins/filters/underscoreFiles.ts" \
     "${QUARTZ_DIR}/quartz/plugins/filters/"

  # SiteConfig transformer — reads _meta.md frontmatter into cfg._siteConfig
  mkdir -p "${QUARTZ_DIR}/quartz/plugins/transformers"
  cp "${SCRIPT_DIR}/core/plugins/transformers/siteConfig.ts" \
     "${QUARTZ_DIR}/quartz/plugins/transformers/"

  # SiteTagline component — renders cfg._siteConfig.tagline in the header
  cp "${SCRIPT_DIR}/core/components/SiteTagline.tsx" \
     "${QUARTZ_DIR}/quartz/components/"

  # Register exports in quartz/plugins/index.ts
  local plugins_index="${QUARTZ_DIR}/quartz/plugins/index.ts"
  grep -q "UnderscoreFiles" "$plugins_index" || \
    echo 'export { UnderscoreFiles } from "./filters/underscoreFiles"' >> "$plugins_index"
  grep -q "SiteConfig" "$plugins_index" || \
    echo 'export { SiteConfig } from "./transformers/siteConfig"'       >> "$plugins_index"

  # Register SiteTagline in quartz/components/index.ts
  local comp_index="${QUARTZ_DIR}/quartz/components/index.ts"
  if ! grep -q "SiteTagline" "$comp_index"; then
    cat >> "$comp_index" << 'EOF'

// ── nb-quartz core ─────────────────────────────────────────────────────────────
import SiteTagline from "./SiteTagline"
export { SiteTagline }
EOF
  fi

  # Image optimisation script + sharp dependency
  mkdir -p "${QUARTZ_DIR}/scripts"
  cp "${SCRIPT_DIR}/core/scripts/optimize-images.mjs" "${QUARTZ_DIR}/scripts/"
  cd "${QUARTZ_DIR}"
  if ! npm ls sharp &>/dev/null 2>&1; then
    info "Adding sharp image processing dependency..."
    npm install sharp --save --quiet
  fi

  # Base layout (standard Quartz — all components intact)
  cp "${SCRIPT_DIR}/templates/quartz.layout.ts" "${QUARTZ_DIR}/quartz.layout.ts"

  # Wire plugins into quartz.config.ts
  if ! grep -q "UnderscoreFiles" "${QUARTZ_DIR}/quartz.config.ts"; then
    sed -i 's/Plugin\.RemoveDrafts()/Plugin.RemoveDrafts(), Plugin.UnderscoreFiles()/' \
        "${QUARTZ_DIR}/quartz.config.ts"
  fi
  if ! grep -q "SiteConfig" "${QUARTZ_DIR}/quartz.config.ts"; then
    sed -i 's/Plugin\.FrontMatter()/Plugin.FrontMatter(), Plugin.SiteConfig()/' \
        "${QUARTZ_DIR}/quartz.config.ts"
  fi

  if grep -q "UnderscoreFiles" "${QUARTZ_DIR}/quartz.config.ts"; then
    ok "Core plugins wired into quartz.config.ts"
  else
    warn "Could not auto-wire UnderscoreFiles — add it manually to the filters array"
  fi

  ok "Core installed"
}

# ── Theme ─────────────────────────────────────────────────────────────────────

apply_theme() {
  local apply_script="${SCRIPT_DIR}/themes/${THEME}/apply.sh"
  if [[ -x "$apply_script" ]]; then
    info "Applying theme: ${THEME}..."
    bash "$apply_script" "$QUARTZ_DIR"
    ok "Theme '${THEME}' applied"
  else
    info "No apply.sh for theme '${THEME}' — using Quartz defaults"
  fi
}

# ── Modules ───────────────────────────────────────────────────────────────────

install_modules() {
  if [[ ${#SELECTED_MODULES[@]} -eq 0 ]]; then
    info "No modules selected — skipping"
    return
  fi

  for module in "${SELECTED_MODULES[@]}"; do
    local mod_dir="${SCRIPT_DIR}/modules/${module}"
    local install_script="${mod_dir}/install.sh"

    info "Installing module: ${module}..."
    if [[ -x "$install_script" ]]; then
      bash "$install_script" "$QUARTZ_DIR" "$mod_dir"
      ok "Module '${module}' installed"
    else
      warn "Module '${module}' has no install.sh — skipping"
    fi
  done
}

# ── Deploy workflow ───────────────────────────────────────────────────────────

write_deploy_workflow() {
  info "Writing GitHub Actions workflow..."
  mkdir -p "${QUARTZ_DIR}/.github/workflows"

  sed \
    -e "s|NOTEBOOK_REPO|${NOTEBOOK_REPO}|g" \
    -e "s|NOTEBOOK_BRANCH|${NOTEBOOK_BRANCH}|g" \
    "${SCRIPT_DIR}/templates/deploy.yml" \
    > "${QUARTZ_DIR}/.github/workflows/deploy.yml"

  if [[ -n "$CUSTOM_DOMAIN" ]]; then
    mkdir -p "${QUARTZ_DIR}/quartz/static"
    echo "$CUSTOM_DOMAIN" > "${QUARTZ_DIR}/quartz/static/CNAME"
    info "CNAME written for ${CUSTOM_DOMAIN}"
  fi

  ok "Workflow written"
}

# ── Meta note ─────────────────────────────────────────────────────────────────

create_meta_note() {
  local meta_file="${NB_DIR}/_meta.md"
  [[ -f "$meta_file" ]] && { warn "_meta.md already exists — skipping"; return; }

  info "Creating _meta.md in notebook..."
  cat > "$meta_file" <<EOF
---
title: ${SITE_TITLE}
tagline:
description: ${SITE_TITLE}
SEO:
draft: false
---

Site-wide configuration for ${SITE_TITLE}.
Edit this note to update the site header tagline and description.

**tagline** — shown in the site header
**description** — site-wide meta description for search engines
**SEO** — additional comma-separated keywords
EOF

  # Register with nb's index so it appears in listings.
  # nb auto-commits on the next nb operation (edit, sync, etc.) — we don't touch git here.
  (cd "$NB_DIR" && nb index add "_meta.md" 2>/dev/null) || true
  ok "_meta.md created"
}

# ── Starter content ───────────────────────────────────────────────────────────

create_starter_content() {
  # Item template always installed — needed regardless of example content choice
  if [[ " ${SELECTED_MODULES[*]} " == *" shop "* ]]; then
    local tmpl_dir="${NB_DIR}/.templates/items"
    mkdir -p "$tmpl_dir"
    local tmpl_file="${tmpl_dir}/item.md"
    if [[ ! -f "$tmpl_file" ]]; then
      info "Creating shop item template..."
      cat > "$tmpl_file" <<'EOF'
---
title: {{title}}
category:
status: available
price:
image:
description:
condition:
size:
shipping:
platform:
listing:
tags: [{{tags}}]
---

{{content}}
EOF
      ok "Item template installed at .templates/items/item.md"
    fi
  fi

  [[ "$STARTER_CONTENT" == "true" ]] || return 0

  info "Adding starter content..."
  local _added=()

  # ── Core: index.md ──────────────────────────────────────────────────────────
  if [[ ! -f "${NB_DIR}/index.md" ]]; then
    cat > "${NB_DIR}/index.md" <<EOF
---
title: ${SITE_TITLE}
---

Welcome to **${SITE_TITLE}**!

This site is built from a [nb](https://xwmx.github.io/nb/) notebook and
published automatically to GitHub Pages.

## How to update this site

1. **Write or edit notes** — in nb-web, the terminal, or any nb client
2. **Sync** — run \`nb sync ${NOTEBOOK}\` or use Menu → Sync in nb-web
3. **Wait** — the site rebuilds automatically within 30 minutes
   (or trigger it now: \`gh workflow run deploy.yml --repo ${GH_USER}/${SITE_REPO}\`)

## Customise site-wide settings

Edit the note **_meta.md** to change:
- **tagline** — shown in the header below the site title
- **description** — used by search engines
- **SEO** — additional keywords

## Add pages

Create any Markdown note in the notebook and it will appear on the site.
Notes beginning with \`_\` (like \`_meta.md\`) are hidden from the public site
but remain in your notebook.
EOF
    _added+=("index.md")
  fi

  # ── Core: about.md ──────────────────────────────────────────────────────────
  if [[ ! -f "${NB_DIR}/about.md" ]]; then
    cat > "${NB_DIR}/about.md" <<EOF
---
title: About
---

*Replace this page with your own About content.*

This note was created by nb-quartz setup. Edit it in nb-web or with \`nb edit about.md\`.
EOF
    _added+=("about.md")
  fi

  # ── Shop: example item + nav page ───────────────────────────────────────────
  if [[ " ${SELECTED_MODULES[*]} " == *" shop "* ]]; then
    mkdir -p "${NB_DIR}/items"

    if [[ ! -f "${NB_DIR}/items/example-item.md" ]]; then
      cat > "${NB_DIR}/items/example-item.md" <<EOF
---
title: Example Item
category: example
status: available
price: \$0.00
image: images/example.jpg
description: A short description shown in the shop and on the item page.
condition: Excellent
size: 10 × 5 × 3 cm
shipping: Canada Post, ~\$8
platform: Etsy
listing: https://etsy.com/listing/example
tags: [new]
---

The body of the note is the item's full description page.

Each item lives in the \`items/\` folder with this frontmatter:

| Field | Purpose |
|-------|---------|
| category | Groups items in the nav and generates /category/\<name\> pages |
| status | \`available\` shows the item; \`sold\` shows it as sold; anything else hides it |
| price | Displayed as-is — e.g. \$24.00 |
| image | Filename from the notebook's \`images/\` folder (comma-separate for a gallery) |
| description | Short text for cards and the item header |
| condition | Free text — Excellent, Good, As-is, etc. |
| size | Free text |
| shipping | Free text |
| platform | External marketplace name (Etsy, eBay, etc.) |
| listing | URL to external listing |

Tag an item \`featured\` to include it in the featured section on the home page.

*Delete this note when you have real items to list.*
EOF
      _added+=("items/example-item.md")
    fi

    if [[ ! -f "${NB_DIR}/new-arrivals.md" ]]; then
      cat > "${NB_DIR}/new-arrivals.md" <<EOF
---
title: New Arrivals
with_tags: [new]
---

This page is a **tag-feed** — it automatically shows all items tagged \`new\`.

Any note with a \`with_tags:\` list in its frontmatter appears as a section
in the shop navigation and on the home page. Remove the tag from items
once they're no longer new arrivals.

Create more pages like this for curated collections — Vintage, Sale, Featured, etc.
*Edit or replace this page to suit your shop.*
EOF
      _added+=("new-arrivals.md")
    fi
  fi

  # Register new files with nb's index.
  # Files in subdirectories belong in their folder's .index, not the root.
  for f in "${_added[@]}"; do
    local dir
    dir="$(dirname "$f")"
    local base
    base="$(basename "$f")"
    if [[ "$dir" == "." ]]; then
      (cd "$NB_DIR" && nb index add "$base" 2>/dev/null) || true
    else
      # Append to the folder index — nb manages each folder separately
      echo "$base" >> "${NB_DIR}/${dir}/.index"
    fi
  done

  if [[ ${#_added[@]} -gt 0 ]]; then
    ok "Starter content added: ${_added[*]}"
  else
    info "Starter content: all files already exist — nothing added"
  fi
}

# ── Push Quartz config to GitHub ──────────────────────────────────────────────

push_quartz_config() {
  cd "$QUARTZ_DIR"

  rm -rf .git
  git init -b main
  git add .
  git commit -m "init: nb-quartz site for ${SITE_TITLE}"

  info "Creating GitHub repo ${GH_USER}/${SITE_REPO}..."
  gh repo create "${GH_USER}/${SITE_REPO}" --public \
    --description "Quartz site config for ${SITE_TITLE}" 2>/dev/null \
    || warn "Repo may already exist — pushing anyway."

  git remote add origin "git@github.com:${GH_USER}/${SITE_REPO}.git"
  git push -u origin main

  ok "Pushed to github.com/${GH_USER}/${SITE_REPO}"
}

# ── Enable GitHub Pages ───────────────────────────────────────────────────────

enable_pages() {
  info "Enabling GitHub Pages (source: GitHub Actions)..."

  gh api "repos/${GH_USER}/${SITE_REPO}/pages" \
    --method POST --field build_type=workflow 2>/dev/null \
    && ok "GitHub Pages enabled" \
    || { warn "Could not enable Pages via API."; \
         echo "    Enable manually: github.com/${GH_USER}/${SITE_REPO} → Settings → Pages → Source: GitHub Actions"; }

  if [[ -n "$CUSTOM_DOMAIN" ]]; then
    gh api "repos/${GH_USER}/${SITE_REPO}/pages" \
      --method PATCH --field custom_domain="${CUSTOM_DOMAIN}" 2>/dev/null \
      && ok "Custom domain: ${CUSTOM_DOMAIN}" \
      || warn "Set custom domain manually in repo Settings → Pages."
  fi
}

# ── Summary ───────────────────────────────────────────────────────────────────

print_summary() {
  echo ""
  echo -e "${GREEN}${BOLD}Setup complete!${NC}"
  echo ""
  echo "  Quartz config:  ${QUARTZ_DIR}"
  echo "  Config repo:    https://github.com/${GH_USER}/${SITE_REPO}"
  echo "  Content repo:   https://github.com/${NOTEBOOK_REPO}"
  echo "  Live at:        https://${BASE_URL}"
  echo ""
  echo -e "${BOLD}Ongoing workflow:${NC}"
  echo "  1. Write notes in nb (notebook: ${NOTEBOOK})"
  echo "  2. nb sync ${NOTEBOOK}   (or Menu → Sync in nb-web)"
  echo "  3. Site rebuilds automatically within 30 minutes"
  echo "     Trigger now: gh workflow run deploy.yml --repo ${GH_USER}/${SITE_REPO}"
  echo ""

  if [[ "$NON_GITHUB_REMOTE" == "true" ]]; then
    echo -e "${YELLOW}${BOLD}⚠ Non-GitHub notebook remote detected${NC}"
    echo "  The notebook's primary remote (e.g. Codeberg) is NOT synced"
    echo "  to GitHub automatically. After each 'nb sync', run:"
    echo ""
    echo "    git -C ${NB_DIR} push github HEAD:${NOTEBOOK}"
    echo ""
    echo "  Or add a post-sync git hook to do this automatically."
    echo "  The site will only reflect what's on github.com/${NOTEBOOK_REPO}."
    echo ""
  fi

  if [[ -n "$CUSTOM_DOMAIN" ]]; then
    echo -e "${BOLD}DNS (one-time, at your registrar):${NC}"
    echo "  A records for @ →  185.199.108.153  185.199.109.153"
    echo "                     185.199.110.153  185.199.111.153"
    echo "  Or CNAME: www → ${GH_USER}.github.io"
    echo ""
  fi

  echo -e "${BOLD}To customise:${NC}"
  echo "  Edit: ${QUARTZ_DIR}/quartz.config.ts"
  echo "  Docs: https://quartz.jzhao.xyz/configuration"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────────────

check_prereqs
gather_inputs
ensure_notebook_remote
setup_quartz
install_core
apply_theme
install_modules
write_deploy_workflow
create_meta_note
create_starter_content
push_quartz_config
enable_pages
print_summary
