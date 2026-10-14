import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Guards docs/COPY_GUIDE.md: patterns that must not come back in UI code.
 * Generated primitives (components/ui) and tests are skipped.
 */
const SRC = join(__dirname, "..")

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === "ui" ? [] : sourceFiles(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

const RULES: { name: string; pattern: RegExp }[] = [
  { name: "generic error 'Something went wrong'", pattern: /Something went wrong/ },
  { name: "'Oops' / 'Whoops'", pattern: /\b(Oops|Whoops)\b/ },
  { name: "error starting with 'Failed to'", pattern: /["'>]\s*Failed to / },
  { name: "Title Case button label", pattern: /["'>]\s*(Save|Add|Create|Delete|Update|Generate|Start|Try) [A-Z][a-z]+\s*["'<]/ },
  { name: "Indonesian copy in the English UI", pattern: /["'>]\s*[^"'<>]*\b(Pilih|Kosongkan|Belum ada|aktivitas|tempat dipilih|Hari \{|Menyusun|Memahami|Mencari|Hampir selesai|Gagal|Berhasil|Ini bisa|santai|sebentar)/ },
  { name: "unverifiable usage claim", pattern: /10,000\+|thousands of travelers|Free forever/ },
]

describe("UI copy (docs/COPY_GUIDE.md)", () => {
  const files = sourceFiles(SRC)

  for (const rule of RULES) {
    it(`has no ${rule.name}`, () => {
      const hits: string[] = []
      for (const file of files) {
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, i) => {
            if (line.trim().startsWith("//") || line.trim().startsWith("*")) return
            if (rule.pattern.test(line)) hits.push(`${relative(SRC, file)}:${i + 1}  ${line.trim()}`)
          })
      }
      expect(hits).toEqual([])
    })
  }
})
