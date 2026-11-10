// Refreshes the frozen copy of the Glass Door wording that tests read.
//
// src/locales/en/glassDoor.json is the master copy and anyone may edit its
// sentences. Tests read a frozen copy instead (jest.config.ts), so a wording
// edit never breaks them. Run this after adding, renaming or removing a text,
// or changing a placeholder, in the master copy: `npm run freeze:glassdoor-copy`.
import { readFileSync, writeFileSync } from "node:fs"

const live = new URL("../src/locales/en/glassDoor.json", import.meta.url)
const frozen = new URL(
  "../src/components/GlassDoor/__fixtures__/glassDoor.frozen.json",
  import.meta.url,
)

const copy = JSON.parse(readFileSync(live, "utf8"))
copy._about =
  "Frozen copy of src/locales/en/glassDoor.json, for tests only. Tests read this file instead of the live one (jest.config.ts), so editing wording in the live file never breaks a test; copy.test.ts checks the live file against it. Refresh it with `npm run freeze:glassdoor-copy` after adding, renaming or removing a text."
writeFileSync(frozen, `${JSON.stringify(copy, null, 2)}\n`)
console.log("frozen copy refreshed")
