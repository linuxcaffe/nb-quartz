#!/usr/bin/env bash
# build.sh — nb-quartz local build wrapper
#
# 1. Optimise images from content/images/ → image-cache/ (notebook is read-only)
# 2. Run quartz build
# 3. Copy cached WebP variants into public/images/
#
# Usage:
#   ./build.sh            # full build
#   ./build.sh --serve    # build + dev server (image cache populated after initial build)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Activate nvm node 22+ if the shell doesn't already have it
if ! command -v node &>/dev/null || \
   (( $(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1) < 22 )); then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"
  command -v nvm &>/dev/null && nvm use 22 --silent 2>/dev/null || true
fi

cd "$SCRIPT_DIR"

_copy_cache() {
  if [[ -d "image-cache" ]] && [[ "$(ls -A image-cache 2>/dev/null)" ]]; then
    mkdir -p public/images
    cp image-cache/* public/images/
    echo "→ Optimised images copied to public/images/"
  fi
}

# ── Step 1: optimise images ───────────────────────────────────────────────────

if [[ -d "content/images" ]]; then
  echo "→ Optimising images..."
  node scripts/optimize-images.mjs
else
  echo "→ No content/images/ directory — skipping image optimisation"
fi

# ── Step 2+3: build, then copy cache ─────────────────────────────────────────

if [[ " $* " =~ --serve ]]; then
  # --serve mode: quartz build --serve blocks forever (it's a server).
  # Start it in the background, wait until port 8080 is up, then copy the
  # image cache into public/images/ before handing control back to the user.
  echo "→ Building site (serve mode)..."
  npx quartz build --serve &
  _SERVE_PID=$!

  # Poll until the server is accepting connections (max ~60 s)
  _waited=0
  until curl -sf http://localhost:8080 >/dev/null 2>&1; do
    sleep 1
    _waited=$(( _waited + 1 ))
    if [[ $_waited -ge 60 ]]; then
      echo "Timed out waiting for server"
      break
    fi
  done

  _copy_cache

  # Block until the server is killed (Ctrl-C)
  wait $_SERVE_PID

else
  echo "→ Building site..."
  npx quartz build "$@"
  _copy_cache
fi
