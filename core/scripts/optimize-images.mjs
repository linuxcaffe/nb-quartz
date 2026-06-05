#!/usr/bin/env node
/**
 * optimize-images.mjs
 *
 * Reads raw photos from content/images/ and writes two WebP variants:
 *
 *   {name}-thumb.webp  — 480 px wide, quality 80  (cards, strips, nav)
 *   {name}.webp        — 1200 px wide, quality 85  (gallery, hero, featured)
 *
 * EXIF orientation is applied (rotate()) so portrait shots display correctly.
 * Source files (jpg/png) are left unchanged.
 * Already-processed files are skipped unless the source is newer.
 *
 * Usage:
 *   node scripts/optimize-images.mjs [--dir content/images]
 */

import sharp from "sharp"
import { readdir, stat } from "fs/promises"
import { join, extname, basename } from "path"

const IMAGES_DIR  = process.argv.includes("--dir")
  ? process.argv[process.argv.indexOf("--dir") + 1]
  : "content/images"

const THUMB_WIDTH = 480
const FULL_WIDTH  = 1200
const THUMB_Q     = 80
const FULL_Q      = 85
const SUPPORTED   = new Set([".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG", ".WEBP"])

async function mtimeMs(p) {
  try { return (await stat(p)).mtimeMs } catch { return 0 }
}

const files  = await readdir(IMAGES_DIR).catch(() => [])
const images = files.filter((f) => SUPPORTED.has(extname(f)) && !f.includes("-thumb"))

if (images.length === 0) {
  console.log("No source images found.")
  process.exit(0)
}

let processed = 0
let skipped   = 0
let errors    = 0

await Promise.all(
  images.map(async (file) => {
    const src       = join(IMAGES_DIR, file)
    const base      = basename(file, extname(file))
    const thumbPath = join(IMAGES_DIR, `${base}-thumb.webp`)
    const fullPath  = join(IMAGES_DIR, `${base}.webp`)

    const srcMtime   = await mtimeMs(src)
    const thumbMtime = await mtimeMs(thumbPath)
    const fullMtime  = await mtimeMs(fullPath)

    if (thumbMtime > srcMtime && fullMtime > srcMtime) {
      skipped++
      return
    }

    try {
      const meta = await sharp(src).metadata()
      const dims = `${meta.width}×${meta.height}`

      await Promise.all([
        sharp(src)
          .rotate()
          .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
          .webp({ quality: THUMB_Q })
          .toFile(thumbPath),
        sharp(src)
          .rotate()
          .resize({ width: FULL_WIDTH, withoutEnlargement: true })
          .webp({ quality: FULL_Q })
          .toFile(fullPath),
      ])

      processed++
      console.log(`  ✓  ${file}  (${dims})`)
    } catch (err) {
      errors++
      console.error(`  ✗  ${file}: ${err.message}`)
    }
  }),
)

console.log(
  `\nDone: ${processed} processed, ${skipped} up-to-date${errors ? `, ${errors} errors` : ""}`,
)
if (errors) process.exit(1)
