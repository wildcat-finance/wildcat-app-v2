// Import a TypeScript module from plain node by transpiling it — and every relative TS module it
// imports — to data: URLs. `import type` edges are erased by transpileModule and cost nothing.
// No build step, no loader hook, no dependency beyond `typescript` (already a devDependency).
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

import ts from "typescript"

const cache = new Map()

export const loadTs = async (file) => {
  const abs = resolve(file)
  if (cache.has(abs)) return cache.get(abs)
  const src = readFileSync(abs, "utf8")
  let js = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const specs = [...new Set([...src.matchAll(/from\s+"(\.\.?\/[^"]+)"/g)].map((m) => m[1]))]
  for (const spec of specs) {
    if (!js.includes(`"${spec}"`)) continue // type-only import — already erased
    const dep = await loadTs(resolve(dirname(abs), `${spec}.ts`))
    js = js.split(`"${spec}"`).join(`"${dep.__url}"`)
  }
  const url = `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
  const mod = { ...(await import(url)), __url: url }
  cache.set(abs, mod)
  return mod
}
