import { pathToRoot, joinSegments, FullSlug } from "../../util/path"

function normalizeRel(img: string): string | null {
  const s = img.trim()
  if (!s) return null
  return s.startsWith("../images/") ? s.slice(3)
       : s.startsWith("images/")    ? s
       : `images/${s}`
}

function stripExt(rel: string): string {
  return rel.replace(/\.[^/.]+$/, "")
}

function resolve(rel: string, fromSlug: string): string {
  return joinSegments(pathToRoot(fromSlug as FullSlug), rel)
}

/** Full WebP URL for the first image in the field (1200 px). */
export function fullSrc(imageField: string | undefined, fromSlug: string): string | null {
  if (!imageField) return null
  const first = imageField.split(",")[0]
  const rel = normalizeRel(first)
  if (!rel) return null
  return resolve(`${stripExt(rel)}.webp`, fromSlug)
}

/** Thumbnail WebP URL for the first image in the field (480 px). */
export function thumbSrc(imageField: string | undefined, fromSlug: string): string | null {
  if (!imageField) return null
  const first = imageField.split(",")[0]
  const rel = normalizeRel(first)
  if (!rel) return null
  return resolve(`${stripExt(rel)}-thumb.webp`, fromSlug)
}

/** Full WebP URLs for every image in the comma-separated field (1200 px). */
export function fullSrcAll(imageField: string | undefined, fromSlug: string): string[] {
  if (!imageField) return []
  return imageField
    .split(",")
    .map((s) => normalizeRel(s))
    .filter((r): r is string => r !== null)
    .map((rel) => resolve(`${stripExt(rel)}.webp`, fromSlug))
}

/** Thumbnail WebP URLs for every image in the comma-separated field (480 px). */
export function thumbSrcAll(imageField: string | undefined, fromSlug: string): string[] {
  if (!imageField) return []
  return imageField
    .split(",")
    .map((s) => normalizeRel(s))
    .filter((r): r is string => r !== null)
    .map((rel) => resolve(`${stripExt(rel)}-thumb.webp`, fromSlug))
}
