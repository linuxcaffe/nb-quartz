import matter from "gray-matter"
import * as fs from "fs"
import * as path from "path"

export interface SiteConfig {
  tagline?:     string
  description?: string
  SEO?:         string
  /** Free-form footer text. Supports HTML and multi-line (YAML | block). Takes priority over copyright + social fields. */
  footer?:      string
  /** Simple one-line copyright fallback, used when footer is not set. */
  copyright?:   string
  instagram?:   string
  ebay?:        string
  etsy?:        string
  [key: string]: string | undefined
}

function load(): SiteConfig {
  try {
    const p = path.join(process.cwd(), "content", "_meta.md")
    const { data } = matter(fs.readFileSync(p, "utf-8"))
    const result: SiteConfig = {}
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === "string" && val.trim()) result[key] = val
    }
    return result
  } catch {
    return {}
  }
}

// Read once at module load time; Node caches the module so this runs once per build.
export const siteConfig: SiteConfig = load()
