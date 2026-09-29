/**
 * Market provenance (Task 5): check-board prints a `markets:` line right after `journal:` —
 * seen · created · forked · unresolved, and 0 seen when the run carries no index.
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const TOOL = resolve(__dirname, "../e2e/tools/check-board.mjs")

const board = (markets?: { origin: string }[]) => {
  const dir = mkdtempSync(join(tmpdir(), "check-board-"))
  try {
    mkdirSync(join(dir, "uat-report"))
    writeFileSync(
      join(dir, "uat-report", "run.json"),
      JSON.stringify({
        schema: markets ? "uat-run/3" : "uat-run/2",
        meta: { mode: "targeted", argv: [] },
        tests: [{ outcome: "passed", journal: [{ kind: "step" }] }],
        ...(markets ? { markets } : {}),
      }),
    )
    const r = spawnSync(process.execPath, [TOOL], {
      cwd: dir,
      encoding: "utf8",
    })
    return r.stdout.split("\n")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe("check-board markets line", () => {
  it("counts the index by origin, right after the journal line", () => {
    const lines = board([
      { origin: "created" },
      { origin: "forked" },
      { origin: "forked" },
      { origin: "unknown" },
    ])
    const j = lines.findIndex((l) => l.startsWith("journal:"))
    expect(j).toBeGreaterThanOrEqual(0)
    expect(lines[j + 1]).toBe(
      "markets:  4 seen · 1 created · 2 forked · 1 unresolved",
    )
  })

  it("prints 0 seen when the run has no market index", () => {
    expect(board()).toContain(
      "markets:  0 seen · 0 created · 0 forked · 0 unresolved",
    )
  })
})
